from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.memory import memory_bp
from app.core.extensions import db, socketio
from app.auth.models import User
from app.game.models import UserPowerup, POWERUP_CATALOGUE
from app.memory.models import (
    MemoryGameRoom, MemoryGamePlayer,
    VALID_THEMES, VALID_BOARD_SIZES, MEMORY_POWERUP_CATALOGUE,
)
from app.friends.models import Friendship


# ──────────────────────────────────────────────
# Memory game metadata (themes, board sizes)
# ──────────────────────────────────────────────
@memory_bp.route('/meta', methods=['GET'])
@jwt_required()
def memory_meta():
    themes = [{'key': k, 'label': k.replace('_', ' ').title()} for k in VALID_THEMES]
    sizes = [{'key': k, 'label': k.title()} for k in VALID_BOARD_SIZES]
    return jsonify({'themes': themes, 'board_sizes': sizes}), 200


# ──────────────────────────────────────────────
# Get the current user's active memory room
# ──────────────────────────────────────────────
@memory_bp.route('/rooms/current', methods=['GET'])
@jwt_required()
def current_room():
    user_id = int(get_jwt_identity())
    player = (
        MemoryGamePlayer.query
        .join(MemoryGameRoom)
        .filter(
            MemoryGamePlayer.user_id == user_id,
            MemoryGameRoom.status.in_(['waiting', 'playing']),
        )
        .first()
    )
    if not player:
        return jsonify(None), 200
    return jsonify(player.room.to_dict()), 200


# ──────────────────────────────────────────────
# List available memory rooms
# ──────────────────────────────────────────────
@memory_bp.route('/rooms', methods=['GET'])
@jwt_required()
def list_rooms():
    user_id = int(get_jwt_identity())
    query = MemoryGameRoom.query.filter(MemoryGameRoom.status.in_(['waiting', 'playing']))
    rooms = query.order_by(MemoryGameRoom.created_at.desc()).all()

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
# Create a memory room
# ──────────────────────────────────────────────
@memory_bp.route('/rooms', methods=['POST'])
@jwt_required()
def create_room():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    max_players = data.get('max_players', 4)
    board_size = data.get('board_size', 'medium')
    theme = data.get('theme', 'animals')
    friends_only = bool(data.get('friends_only', False))

    if not name:
        return jsonify({'message': 'Room name is required'}), 400

    if board_size not in VALID_BOARD_SIZES:
        return jsonify({'message': 'Invalid board size'}), 400

    if theme not in VALID_THEMES:
        return jsonify({'message': 'Invalid theme'}), 400

    max_players = min(max(int(max_players), 2), 8)

    # Check if user is already in a waiting memory room
    existing = (
        MemoryGamePlayer.query
        .join(MemoryGameRoom)
        .filter(MemoryGamePlayer.user_id == user_id, MemoryGameRoom.status == 'waiting')
        .first()
    )
    if existing:
        return jsonify({'message': 'You are already in a memory room. Leave it first.'}), 409

    room = MemoryGameRoom(
        name=name,
        host_id=user_id,
        board_size=board_size,
        theme=theme,
        max_players=max_players,
        friends_only=friends_only,
    )
    db.session.add(room)
    db.session.flush()

    player = MemoryGamePlayer(room_id=room.id, user_id=user_id)
    db.session.add(player)
    db.session.commit()

    return jsonify(room.to_dict()), 201


# ──────────────────────────────────────────────
# Get room details
# ──────────────────────────────────────────────
@memory_bp.route('/rooms/<int:room_id>', methods=['GET'])
@jwt_required()
def get_room(room_id):
    room = MemoryGameRoom.query.get(room_id)
    if not room:
        return jsonify({'message': 'Room not found'}), 404
    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Join a memory room
# ──────────────────────────────────────────────
@memory_bp.route('/rooms/<int:room_id>/join', methods=['POST'])
@jwt_required()
def join_room(room_id):
    user_id = int(get_jwt_identity())
    room = MemoryGameRoom.query.get(room_id)

    if not room:
        return jsonify({'message': 'Room not found'}), 404

    if room.status != 'waiting':
        return jsonify({'message': 'Room is no longer accepting players'}), 400

    if room.player_count >= room.max_players:
        return jsonify({'message': 'Room is full'}), 400

    if room.friends_only and room.host_id != user_id:
        is_friend = Friendship.query.filter(
            db.or_(
                db.and_(Friendship.user_id == user_id, Friendship.friend_id == room.host_id),
                db.and_(Friendship.user_id == room.host_id, Friendship.friend_id == user_id),
            ),
            Friendship.status == 'accepted',
        ).first()
        if not is_friend:
            return jsonify({'message': 'This room is friends-only.'}), 403

    if room.players.filter_by(user_id=user_id).first():
        return jsonify(room.to_dict()), 200

    existing = (
        MemoryGamePlayer.query
        .join(MemoryGameRoom)
        .filter(MemoryGamePlayer.user_id == user_id, MemoryGameRoom.status == 'waiting')
        .first()
    )
    if existing:
        return jsonify({'message': 'You are already in another room. Leave it first.'}), 409

    player = MemoryGamePlayer(room_id=room.id, user_id=user_id)
    db.session.add(player)
    db.session.commit()

    socketio.emit('room_updated', room.to_dict(), namespace='/memory', room=f'memory_{room_id}')

    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Leave a memory room
# ──────────────────────────────────────────────
@memory_bp.route('/rooms/<int:room_id>/leave', methods=['POST'])
@jwt_required()
def leave_room(room_id):
    user_id = int(get_jwt_identity())
    room = MemoryGameRoom.query.get(room_id)

    if not room:
        return jsonify({'message': 'Room not found'}), 404

    player = room.players.filter_by(user_id=user_id).first()
    if not player:
        return jsonify({'message': 'You are not in this room'}), 400

    db.session.delete(player)

    room_deleted = False
    if room.host_id == user_id:
        remaining = room.players.filter(MemoryGamePlayer.user_id != user_id).first()
        if remaining:
            room.host_id = remaining.user_id
        else:
            room_deleted = True
            db.session.delete(room)

    db.session.commit()

    if not room_deleted:
        socketio.emit('room_updated', room.to_dict(), namespace='/memory', room=f'memory_{room_id}')

    return jsonify({'message': 'Left room successfully'}), 200


# ──────────────────────────────────────────────
# Toggle ready status
# ──────────────────────────────────────────────
@memory_bp.route('/rooms/<int:room_id>/ready', methods=['POST'])
@jwt_required()
def toggle_ready(room_id):
    user_id = int(get_jwt_identity())
    room = MemoryGameRoom.query.get(room_id)

    if not room or room.status != 'waiting':
        return jsonify({'message': 'Room not found or not accepting'}), 404

    player = room.players.filter_by(user_id=user_id).first()
    if not player:
        return jsonify({'message': 'You are not in this room'}), 400

    player.is_ready = not player.is_ready
    db.session.commit()

    socketio.emit('room_updated', room.to_dict(), namespace='/memory', room=f'memory_{room_id}')

    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Start memory game (host only)
# ──────────────────────────────────────────────
@memory_bp.route('/rooms/<int:room_id>/start', methods=['POST'])
@jwt_required()
def start_game(room_id):
    user_id = int(get_jwt_identity())
    room = MemoryGameRoom.query.get(room_id)

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
# Spectate a playing memory room
# ──────────────────────────────────────────────
@memory_bp.route('/rooms/<int:room_id>/spectate', methods=['POST'])
@jwt_required()
def spectate_room(room_id):
    room = MemoryGameRoom.query.get(room_id)
    if not room:
        return jsonify({'message': 'Room not found'}), 404

    if room.status != 'playing':
        return jsonify({'message': 'Room is not currently in a game'}), 400

    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Memory shop catalogue (memory-specific powerups)
# ──────────────────────────────────────────────
@memory_bp.route('/shop/catalogue', methods=['GET'])
@jwt_required()
def memory_shop_catalogue():
    items = []
    for ptype, info in MEMORY_POWERUP_CATALOGUE.items():
        items.append({
            'type': ptype,
            'name': info['name'],
            'cost': info['cost'],
            'icon': info['icon'],
        })
    return jsonify({'items': items}), 200


# ──────────────────────────────────────────────
# Memory shop – buy power-up
# ──────────────────────────────────────────────
@memory_bp.route('/shop/buy', methods=['POST'])
@jwt_required()
def memory_shop_buy():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    powerup_type = data.get('powerup_type')
    quantity = data.get('quantity', 1)

    if not powerup_type or powerup_type not in MEMORY_POWERUP_CATALOGUE:
        return jsonify({'error': 'Invalid powerup type'}), 400

    if not isinstance(quantity, int) or quantity < 1:
        return jsonify({'error': 'Quantity must be a positive integer'}), 400

    cost_each = MEMORY_POWERUP_CATALOGUE[powerup_type]['cost']
    total_cost = cost_each * quantity

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if (user.xp or 0) < total_cost:
        return jsonify({'error': 'Not enough XP', 'required': total_cost, 'current': user.xp or 0}), 400

    user.xp = (user.xp or 0) - total_cost

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
# Memory shop – inventory
# ──────────────────────────────────────────────
@memory_bp.route('/shop/inventory', methods=['GET'])
@jwt_required()
def memory_shop_inventory():
    user_id = int(get_jwt_identity())
    # Return only memory-related powerups
    memory_types = list(MEMORY_POWERUP_CATALOGUE.keys())
    records = UserPowerup.query.filter(
        UserPowerup.user_id == user_id,
        UserPowerup.powerup_type.in_(memory_types),
    ).all()
    user = User.query.get(user_id)
    return jsonify({
        'inventory': [r.to_dict() for r in records],
        'xp': user.xp if user else 0,
    }), 200
