from datetime import datetime, timezone

from flask import request
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import current_app
import eventlet

from app.core.extensions import socketio, db
from app.auth.models import User
from app.chat.models import ChatRoom, ChatMessage

# Track chat socket connections: { sid: user_id }
chat_sid_map = {}


# ──────────────────────────────────────────────
# Namespace: /chat
# ──────────────────────────────────────────────
@socketio.on('connect', namespace='/chat')
def handle_connect(auth=None):
    """Authenticate user on socket connection."""
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get('token')

    if not token:
        token = request.args.get('token')

    if not token:
        return False  # reject connection

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
        user = User.query.get(user_id)
        if not user:
            return False

        # Mark user online
        user.is_online = True
        user.last_seen = datetime.now(timezone.utc)
        db.session.commit()

        # Auto-join all rooms the user belongs to
        for room in user.chat_rooms:
            join_room(f'room_{room.id}')

        # Join personal channel for notifications (new room invites, etc.)
        join_room(f'user_{user_id}')

        # Track this socket connection
        chat_sid_map[request.sid] = user_id

        emit('connected', {'user_id': user.id, 'username': user.username})
    except Exception:
        return False


@socketio.on('disconnect', namespace='/chat')
def handle_disconnect():
    """Mark user offline after a grace period (handles reconnects on navigation)."""
    user_id = chat_sid_map.pop(request.sid, None)
    if not user_id:
        return

    app = current_app._get_current_object()

    def _delayed_offline_check():
        with app.app_context():
            # If user reconnected in the meantime, skip
            if user_id in chat_sid_map.values():
                return
            user = User.query.get(user_id)
            if user:
                user.is_online = False
                user.last_seen = datetime.now(timezone.utc)
                db.session.commit()

    # Wait 5 seconds — if the user reconnects within that window,
    # they won't be marked offline (e.g. React effect re-run, navigation)
    eventlet.spawn_after(5, _delayed_offline_check)


# ──────────────────────────────────────────────
# Join / leave room via socket
# ──────────────────────────────────────────────
@socketio.on('join_room', namespace='/chat')
def handle_join_room(data):
    """Join a socket.io room for real-time updates."""
    room_id = data.get('room_id')
    token = data.get('token')

    if not room_id or not token:
        emit('error', {'message': 'room_id and token are required'})
        return

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except Exception:
        emit('error', {'message': 'Invalid token'})
        return

    room = ChatRoom.query.get(room_id)
    if not room or not room.members.filter_by(id=user_id).first():
        emit('error', {'message': 'Not a member of this room'})
        return

    join_room(f'room_{room_id}')
    emit('joined_room', {'room_id': room_id}, room=f'room_{room_id}')


@socketio.on('leave_room', namespace='/chat')
def handle_leave_room(data):
    """Leave a socket.io room."""
    room_id = data.get('room_id')
    if room_id:
        leave_room(f'room_{room_id}')


# ──────────────────────────────────────────────
# Send message
# ──────────────────────────────────────────────
@socketio.on('send_message', namespace='/chat')
def handle_send_message(data):
    """
    Receive a chat message, persist it, and broadcast to room members.
    Expected payload: { token, room_id, content }
    """
    token = data.get('token')
    room_id = data.get('room_id')
    content = (data.get('content') or '').strip()

    if not token or not room_id or not content:
        emit('error', {'message': 'token, room_id, and content are required'})
        return

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except Exception:
        emit('error', {'message': 'Invalid token'})
        return

    user = User.query.get(user_id)
    room = ChatRoom.query.get(room_id)

    if not user or not room:
        emit('error', {'message': 'User or room not found'})
        return

    if not room.members.filter_by(id=user_id).first():
        emit('error', {'message': 'Not a member of this room'})
        return

    # Persist
    message = ChatMessage(
        room_id=room_id,
        sender_id=user_id,
        content=content,
    )
    db.session.add(message)
    room.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    # Broadcast to all members in the room
    emit('new_message', message.to_dict(), room=f'room_{room_id}')


# ──────────────────────────────────────────────
# Typing indicator
# ──────────────────────────────────────────────
@socketio.on('typing', namespace='/chat')
def handle_typing(data):
    """Broadcast typing indicator to room members."""
    token = data.get('token')
    room_id = data.get('room_id')
    is_typing = data.get('is_typing', True)

    if not token or not room_id:
        return

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
        user = User.query.get(user_id)
    except Exception:
        return

    if not user:
        return

    emit('user_typing', {
        'room_id': room_id,
        'user_id': user_id,
        'username': user.username,
        'is_typing': is_typing,
    }, room=f'room_{room_id}', include_self=False)


# ──────────────────────────────────────────────
# Mark as read (real-time notification)
# ──────────────────────────────────────────────
@socketio.on('mark_read', namespace='/chat')
def handle_mark_read(data):
    """Mark all messages in a room as read and notify the room."""
    token = data.get('token')
    room_id = data.get('room_id')

    if not token or not room_id:
        return

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except Exception:
        return

    ChatMessage.query.filter(
        ChatMessage.room_id == room_id,
        ChatMessage.sender_id != user_id,
        ChatMessage.is_read == False,
    ).update({'is_read': True})
    db.session.commit()

    emit('messages_read', {
        'room_id': room_id,
        'reader_id': user_id,
    }, room=f'room_{room_id}')
