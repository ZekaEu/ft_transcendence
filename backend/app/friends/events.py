from datetime import datetime, timezone

from flask import request
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token

from app.core.extensions import socketio, db
from app.auth.models import User
from app.friends.models import Friendship


# ──────────────────────────────────────────────
# Namespace: /friends
# ──────────────────────────────────────────────
@socketio.on('connect', namespace='/friends')
def handle_friends_connect(auth=None):
    """Authenticate user on socket connection and join personal room."""
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

        # Mark user online
        user.is_online = True
        user.last_seen = datetime.now(timezone.utc)
        db.session.commit()

        # Join personal room for notifications
        join_room(f'user_{user_id}')

        # Notify friends that this user is now online
        _broadcast_status(user_id, True)

        emit('connected', {'user_id': user.id, 'username': user.username})
    except Exception:
        return False


@socketio.on('disconnect', namespace='/friends')
def handle_friends_disconnect():
    """Mark user offline and notify friends."""
    pass  # Status is managed via REST logout / chat disconnect


# ──────────────────────────────────────────────
# Broadcast online status to friends
# ──────────────────────────────────────────────
def _broadcast_status(user_id, is_online):
    """Notify all accepted friends about user's online status change."""
    friendships = Friendship.query.filter(
        db.or_(
            Friendship.user_id == user_id,
            Friendship.friend_id == user_id,
        ),
        Friendship.status == 'accepted',
    ).all()

    user = User.query.get(user_id)
    if not user:
        return

    status_data = {
        'user_id': user_id,
        'username': user.username,
        'display_name': user.display_name or user.username,
        'avatar_url': user.avatar_url,
        'is_online': is_online,
    }

    for f in friendships:
        friend_id = f.friend_id if f.user_id == user_id else f.user_id
        socketio.emit('friend_status', status_data,
                      namespace='/friends', room=f'user_{friend_id}')
