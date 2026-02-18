from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.game import game_bp
from app.core.extensions import db, socketio
from app.auth.models import User
from app.game.models import GameRoom, GameRoomPlayer


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

    if not name:
        return jsonify({'message': 'Room name is required'}), 400

    if game_mode not in ('classic', 'survival', 'timed'):
        return jsonify({'message': 'Invalid game mode'}), 400

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
