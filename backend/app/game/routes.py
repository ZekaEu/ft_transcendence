from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.game import game_bp
from app.core.extensions import db, socketio
from app.game.models import GameRoom, GameRoomPlayer, KAHOOT_CATEGORIES, KAHOOT_LANGUAGES, VALID_DIFFICULTIES


# ──────────────────────────────────────────────
# Available Kahoot trivia categories, difficulties & languages
# ──────────────────────────────────────────────
@game_bp.route('/trivia/categories', methods=['GET'])
@jwt_required()
def trivia_categories():
    categories = [
        {'key': k, 'label': k.replace('_', ' ').title()} for k in KAHOOT_CATEGORIES.keys()
    ]
    difficulties = list(VALID_DIFFICULTIES)
    languages = [
        {'key': k, 'label': v or 'Any'} for k, v in KAHOOT_LANGUAGES.items()
    ]
    return jsonify({'categories': categories, 'difficulties': difficulties, 'languages': languages}), 200


# ──────────────────────────────────────────────
# Get the current user's active room (waiting/playing)
# ──────────────────────────────────────────────
@game_bp.route('/rooms/current', methods=['GET'])
@jwt_required()
def current_room():
    user_id = int(get_jwt_identity())
    player = (
        GameRoomPlayer.query
        .join(GameRoom)
        .filter(
            GameRoomPlayer.user_id == user_id,
            GameRoom.status.in_(['waiting', 'playing']),
        )
        .first()
    )
    if not player:
        return jsonify(None), 200
    return jsonify(player.room.to_dict()), 200


# ──────────────────────────────────────────────
# List available rooms (status = waiting)
# ──────────────────────────────────────────────
@game_bp.route('/rooms', methods=['GET'])
@jwt_required()
def list_rooms():
    mode = request.args.get('mode')
    query = GameRoom.query.filter_by(status='waiting')
    if mode:
        query = query.filter_by(game_mode=mode)
    rooms = query.order_by(GameRoom.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rooms]), 200


# ──────────────────────────────────────────────
# Create a room
# ──────────────────────────────────────────────
@game_bp.route('/rooms', methods=['POST'])
@jwt_required()
def create_room():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    game_mode = data.get('game_mode', 'classic')
    max_players = data.get('max_players', 4)
    question_category = data.get('question_category', 'any')
    question_difficulty = data.get('question_difficulty', 'any')
    question_language = data.get('question_language', 'any')

    if not name:
        return jsonify({'message': 'Room name is required'}), 400

    if game_mode not in ('classic', 'survival', 'timed'):
        return jsonify({'message': 'Invalid game mode'}), 400

    if question_category not in KAHOOT_CATEGORIES:
        return jsonify({'message': 'Invalid question category'}), 400

    if question_difficulty not in VALID_DIFFICULTIES:
        return jsonify({'message': 'Invalid question difficulty'}), 400

    if question_language not in KAHOOT_LANGUAGES:
        return jsonify({'message': 'Invalid question language'}), 400

    max_players = min(max(int(max_players), 2), 8)

    # Check if user is already in a waiting room
    existing = (
        GameRoomPlayer.query
        .join(GameRoom)
        .filter(GameRoomPlayer.user_id == user_id, GameRoom.status == 'waiting')
        .first()
    )
    if existing:
        return jsonify({'message': 'You are already in a room. Leave it first.'}), 409

    room = GameRoom(
        name=name,
        host_id=user_id,
        game_mode=game_mode,
        max_players=max_players,
        question_category=question_category,
        question_difficulty=question_difficulty,
        question_language=question_language,
    )
    db.session.add(room)
    db.session.flush()

    # Host auto-joins
    player = GameRoomPlayer(room_id=room.id, user_id=user_id)
    db.session.add(player)
    db.session.commit()

    return jsonify(room.to_dict()), 201


# ──────────────────────────────────────────────
# Get room details
# ──────────────────────────────────────────────
@game_bp.route('/rooms/<int:room_id>', methods=['GET'])
@jwt_required()
def get_room(room_id):
    room = GameRoom.query.get(room_id)
    if not room:
        return jsonify({'message': 'Room not found'}), 404
    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Join a room
# ──────────────────────────────────────────────
@game_bp.route('/rooms/<int:room_id>/join', methods=['POST'])
@jwt_required()
def join_room(room_id):
    user_id = int(get_jwt_identity())
    room = GameRoom.query.get(room_id)

    if not room:
        return jsonify({'message': 'Room not found'}), 404

    if room.status != 'waiting':
        return jsonify({'message': 'Room is no longer accepting players'}), 400

    if room.player_count >= room.max_players:
        return jsonify({'message': 'Room is full'}), 400

    # Check if already in this room
    if room.players.filter_by(user_id=user_id).first():
        return jsonify(room.to_dict()), 200

    # Check if in another waiting room
    existing = (
        GameRoomPlayer.query
        .join(GameRoom)
        .filter(GameRoomPlayer.user_id == user_id, GameRoom.status == 'waiting')
        .first()
    )
    if existing:
        return jsonify({'message': 'You are already in another room. Leave it first.'}), 409

    player = GameRoomPlayer(room_id=room.id, user_id=user_id)
    db.session.add(player)
    db.session.commit()

    # Notify existing players in real-time
    socketio.emit('room_updated', room.to_dict(), namespace='/game', room=f'game_{room_id}')

    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Leave a room
# ──────────────────────────────────────────────
@game_bp.route('/rooms/<int:room_id>/leave', methods=['POST'])
@jwt_required()
def leave_room(room_id):
    user_id = int(get_jwt_identity())
    room = GameRoom.query.get(room_id)

    if not room:
        return jsonify({'message': 'Room not found'}), 404

    player = room.players.filter_by(user_id=user_id).first()
    if not player:
        return jsonify({'message': 'You are not in this room'}), 400

    db.session.delete(player)

    room_deleted = False
    # If host leaves, delete the room (or transfer host)
    if room.host_id == user_id:
        remaining = room.players.filter(GameRoomPlayer.user_id != user_id).first()
        if remaining:
            room.host_id = remaining.user_id
        else:
            room_deleted = True
            db.session.delete(room)

    db.session.commit()

    # Notify remaining players via socket
    if not room_deleted:
        socketio.emit('room_updated', room.to_dict(), namespace='/game', room=f'game_{room_id}')

    return jsonify({'message': 'Left room successfully'}), 200


# ──────────────────────────────────────────────
# Toggle ready status
# ──────────────────────────────────────────────
@game_bp.route('/rooms/<int:room_id>/ready', methods=['POST'])
@jwt_required()
def toggle_ready(room_id):
    user_id = int(get_jwt_identity())
    room = GameRoom.query.get(room_id)

    if not room or room.status != 'waiting':
        return jsonify({'message': 'Room not found or not accepting'}), 404

    player = room.players.filter_by(user_id=user_id).first()
    if not player:
        return jsonify({'message': 'You are not in this room'}), 400

    player.is_ready = not player.is_ready
    db.session.commit()

    # Notify all players in the room
    socketio.emit('room_updated', room.to_dict(), namespace='/game', room=f'game_{room_id}')

    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Start game (host only)
# ──────────────────────────────────────────────
@game_bp.route('/rooms/<int:room_id>/start', methods=['POST'])
@jwt_required()
def start_game(room_id):
    user_id = int(get_jwt_identity())
    room = GameRoom.query.get(room_id)

    if not room:
        return jsonify({'message': 'Room not found'}), 404

    if room.host_id != user_id:
        return jsonify({'message': 'Only the host can start the game'}), 403

    if room.status != 'waiting':
        return jsonify({'message': 'Game already started'}), 400

    if room.player_count < 2:
        return jsonify({'message': 'Need at least 2 players to start'}), 400

    room.status = 'playing'
    db.session.commit()

    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Match history for the logged-in user
# ──────────────────────────────────────────────
@game_bp.route('/history', methods=['GET'])
@jwt_required()
def match_history():
    user_id = int(get_jwt_identity())
    filter_type = request.args.get('filter', 'all')  # all | wins | losses

    # All finished rooms where this user participated
    participations = (
        GameRoomPlayer.query
        .join(GameRoom)
        .filter(
            GameRoomPlayer.user_id == user_id,
            GameRoom.status == 'finished',
        )
        .order_by(GameRoom.created_at.desc())
        .all()
    )

    # Build stats from ALL participations (before filtering)
    total_games = len(participations)
    wins = 0
    losses = 0
    matches = []

    for p in participations:
        room = p.room
        # Players sorted by score descending
        players_sorted = (
            GameRoomPlayer.query
            .filter_by(room_id=room.id)
            .order_by(GameRoomPlayer.score.desc())
            .all()
        )

        winner_id = players_sorted[0].user_id if players_sorted else None
        is_winner = (winner_id == user_id)

        if is_winner:
            wins += 1
        else:
            losses += 1

        # Apply filter
        if filter_type == 'wins' and not is_winner:
            continue
        if filter_type == 'losses' and is_winner:
            continue

        # User rank in this match
        user_rank = next(
            (i + 1 for i, pl in enumerate(players_sorted) if pl.user_id == user_id),
            None,
        )

        matches.append({
            'room_id': room.id,
            'room_name': room.name,
            'game_mode': room.game_mode,
            'score': p.score,
            'rank': user_rank,
            'total_players': len(players_sorted),
            'is_winner': is_winner,
            'winner': {
                'user_id': players_sorted[0].user_id,
                'username': players_sorted[0].user.username,
            } if players_sorted and players_sorted[0].user else None,
            'players': [
                {
                    'user_id': pl.user_id,
                    'username': pl.user.username if pl.user else None,
                    'avatar_url': pl.user.avatar_url if pl.user else None,
                    'score': pl.score,
                }
                for pl in players_sorted
            ],
            'played_at': room.created_at.isoformat() if room.created_at else None,
        })

    return jsonify({
        'matches': matches,
        'stats': {
            'total': total_games,
            'wins': wins,
            'losses': losses,
            'win_rate': round((wins / total_games) * 100, 1) if total_games > 0 else 0,
        },
    }), 200
