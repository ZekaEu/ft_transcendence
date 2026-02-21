from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.game import game_bp
from app.core.extensions import db, socketio
from app.auth.models import User
from app.game.models import GameRoom, GameRoomPlayer, KAHOOT_CATEGORIES, KAHOOT_LANGUAGES, VALID_DIFFICULTIES
from app.game.models import GameRoom, GameRoomPlayer, UserPowerup, POWERUP_CATALOGUE
from app.friends.models import Friendship


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
    user_id = int(get_jwt_identity())
    mode = request.args.get('mode')
    query = GameRoom.query.filter_by(status='waiting')
    if mode:
        query = query.filter_by(game_mode=mode)
    rooms = query.order_by(GameRoom.created_at.desc()).all()

    # Filter out friends_only rooms where user is not friends with host
    visible_rooms = []
    for room in rooms:
        if not room.friends_only:
            visible_rooms.append(room)
        elif room.host_id == user_id:
            visible_rooms.append(room)
        else:
            is_friend = Friendship.query.filter(
                db.or_(
                    db.and_(Friendship.user_id == user_id, Friendship.friend_id == room.host_id),
                    db.and_(Friendship.user_id == room.host_id, Friendship.friend_id == user_id),
                ),
                Friendship.status == 'accepted',
            ).first()
            if is_friend:
                visible_rooms.append(room)

    return jsonify([r.to_dict() for r in visible_rooms]), 200


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
    friends_only = bool(data.get('friends_only', False))

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
        friends_only=friends_only,
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

    # Enforce friends_only: joiner must be friends with host
    if room.friends_only and room.host_id != user_id:
        is_friend = Friendship.query.filter(
            db.or_(
                db.and_(Friendship.user_id == user_id, Friendship.friend_id == room.host_id),
                db.and_(Friendship.user_id == room.host_id, Friendship.friend_id == user_id),
            ),
            Friendship.status == 'accepted',
        ).first()
        if not is_friend:
            return jsonify({'message': 'This room is friends-only. You must be friends with the host.'}), 403

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
# Global ranking (sorted by XP)
# ──────────────────────────────────────────────
@game_bp.route('/ranking', methods=['GET'])
@jwt_required()
def global_ranking():
    """Return all users sorted by XP descending."""
    limit = request.args.get('limit', 50, type=int)
    limit = min(max(limit, 1), 200)

    users = (
        User.query
        .filter(User.xp > 0)
        .order_by(User.xp.desc())
        .limit(limit)
        .all()
    )

    ranking = []
    for idx, u in enumerate(users):
        # Count finished games for this user
        games_played = (
            GameRoomPlayer.query
            .join(GameRoom)
            .filter(
                GameRoomPlayer.user_id == u.id,
                GameRoom.status == 'finished',
            )
            .count()
        )
        ranking.append({
            'rank': idx + 1,
            'user_id': u.id,
            'username': u.username,
            'display_name': u.display_name or u.username,
            'avatar_url': u.avatar_url,
            'xp': u.xp,
            'level': u.level,
            'games_played': games_played,
        })

    return jsonify(ranking), 200


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


# ──────────────────────────────────────────────
# Shop – catalogue
# ──────────────────────────────────────────────
@game_bp.route('/shop/catalogue', methods=['GET'])
@jwt_required()
def shop_catalogue():
    """Return the power-up catalogue with prices."""
    items = []
    for ptype, info in POWERUP_CATALOGUE.items():
        items.append({
            'type': ptype,
            'name': info['name'],
            'cost': info['cost'],
            'icon': info['icon'],
        })
    return jsonify({'items': items}), 200


# ──────────────────────────────────────────────
# Shop – buy power-up
# ──────────────────────────────────────────────
@game_bp.route('/shop/buy', methods=['POST'])
@jwt_required()
def shop_buy():
    """Purchase a power-up using XP."""
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    powerup_type = data.get('powerup_type')
    quantity = data.get('quantity', 1)

    if not powerup_type or powerup_type not in POWERUP_CATALOGUE:
        return jsonify({'error': 'Invalid powerup type'}), 400

    if not isinstance(quantity, int) or quantity < 1:
        return jsonify({'error': 'Quantity must be a positive integer'}), 400

    cost_each = POWERUP_CATALOGUE[powerup_type]['cost']
    total_cost = cost_each * quantity

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if (user.xp or 0) < total_cost:
        return jsonify({'error': 'Not enough XP', 'required': total_cost, 'current': user.xp or 0}), 400

    # Deduct XP
    user.xp = (user.xp or 0) - total_cost

    # Add or update powerup inventory
    record = UserPowerup.query.filter_by(user_id=user_id, powerup_type=powerup_type).first()
    if record:
        record.quantity += quantity
    else:
        record = UserPowerup(user_id=user_id, powerup_type=powerup_type, quantity=quantity)
        db.session.add(record)

    db.session.commit()

    return jsonify({
        'message': f'Purchased {quantity}x {powerup_type}',
        'powerup': record.to_dict(),
        'xp_remaining': user.xp,
    }), 200


# ──────────────────────────────────────────────
# Shop – inventory (user's power-ups)
# ──────────────────────────────────────────────
@game_bp.route('/shop/inventory', methods=['GET'])
@jwt_required()
def shop_inventory():
    """Return the current user's power-up inventory."""
    user_id = int(get_jwt_identity())
    records = UserPowerup.query.filter_by(user_id=user_id).all()
    user = User.query.get(user_id)
    return jsonify({
        'inventory': [r.to_dict() for r in records],
        'xp': user.xp if user else 0,
    }), 200
