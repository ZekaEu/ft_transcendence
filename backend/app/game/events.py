from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import request

from app.core.extensions import socketio, db
from app.auth.models import User
from app.game.models import GameRoom, GameRoomPlayer


# ──────────────────────────────────────────────
# Namespace: /game
# ──────────────────────────────────────────────

@socketio.on('connect', namespace='/game')
def handle_connect(auth=None):
    """Authenticate user on socket connection."""
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get('token')
    if not token:
        token = request.args.get('token')
    if not token:
        return False

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
        user = User.query.get(user_id)
        if not user:
            return False
        emit('connected', {'user_id': user.id, 'username': user.username})
    except Exception:
        return False


@socketio.on('join_game_room', namespace='/game')
def handle_join_game_room(data):
    """Join a game room channel for real-time updates."""
    token = data.get('token')
    room_id = data.get('room_id')
    if not token or not room_id:
        emit('error', {'message': 'token and room_id are required'})
        return

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except Exception:
        emit('error', {'message': 'Invalid token'})
        return

    room = GameRoom.query.get(room_id)
    if not room:
        emit('error', {'message': 'Room not found'})
        return

    join_room(f'game_{room_id}')
    emit('player_joined', room.to_dict(), room=f'game_{room_id}')


@socketio.on('leave_game_room', namespace='/game')
def handle_leave_game_room(data):
    """Leave a game room channel."""
    room_id = data.get('room_id')
    if room_id:
        leave_room(f'game_{room_id}')


@socketio.on('player_ready', namespace='/game')
def handle_player_ready(data):
    """Broadcast ready status change to the room."""
    token = data.get('token')
    room_id = data.get('room_id')
    if not token or not room_id:
        return

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except Exception:
        return

    room = GameRoom.query.get(room_id)
    if room:
        emit('room_updated', room.to_dict(), room=f'game_{room_id}')


@socketio.on('game_started', namespace='/game')
def handle_game_started(data):
    """Broadcast game start to all players in the room."""
    room_id = data.get('room_id')
    if room_id:
        room = GameRoom.query.get(room_id)
        if room:
            emit('game_start', room.to_dict(), room=f'game_{room_id}')
