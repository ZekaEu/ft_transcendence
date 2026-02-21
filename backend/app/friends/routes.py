from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.friends import friends_bp
from app.core.extensions import db, socketio
from app.auth.models import User
from app.friends.models import Friendship


# ──────────────────────────────────────────────
# Send friend request
# ──────────────────────────────────────────────
@friends_bp.route('/request', methods=['POST'])
@jwt_required()
def send_friend_request():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    friend_id = data.get('friend_id')

    if not friend_id:
        return jsonify({'message': 'friend_id is required'}), 400

    friend_id = int(friend_id)

    if user_id == friend_id:
        return jsonify({'message': 'You cannot add yourself as a friend'}), 400

    # Check if friend exists
    friend = User.query.get(friend_id)
    if not friend:
        return jsonify({'message': 'User not found'}), 404

    # Check for existing friendship in either direction
    existing = Friendship.query.filter(
        db.or_(
            db.and_(Friendship.user_id == user_id, Friendship.friend_id == friend_id),
            db.and_(Friendship.user_id == friend_id, Friendship.friend_id == user_id),
        )
    ).first()

    if existing:
        if existing.status == 'accepted':
            return jsonify({'message': 'You are already friends'}), 409
        if existing.status == 'pending':
            # If the other person already sent us a request, auto-accept
            if existing.user_id == friend_id and existing.friend_id == user_id:
                existing.status = 'accepted'
                db.session.commit()
                # Notify both users via socket
                socketio.emit('friend_accepted', existing.to_dict(),
                              namespace='/friends', room=f'user_{user_id}')
                socketio.emit('friend_accepted', existing.to_dict(),
                              namespace='/friends', room=f'user_{friend_id}')
                return jsonify({'message': 'Friend request accepted', 'friendship': existing.to_dict()}), 200
            return jsonify({'message': 'Friend request already sent'}), 409
        if existing.status == 'blocked':
            return jsonify({'message': 'Cannot send friend request'}), 403

    friendship = Friendship(user_id=user_id, friend_id=friend_id, status='pending')
    db.session.add(friendship)
    db.session.commit()

    # Notify the recipient via socket
    socketio.emit('friend_request', friendship.to_dict(),
                  namespace='/friends', room=f'user_{friend_id}')

    return jsonify({'message': 'Friend request sent', 'friendship': friendship.to_dict()}), 201


# ──────────────────────────────────────────────
# Accept friend request
# ──────────────────────────────────────────────
@friends_bp.route('/accept/<int:friendship_id>', methods=['POST'])
@jwt_required()
def accept_friend_request(friendship_id):
    user_id = int(get_jwt_identity())
    friendship = Friendship.query.get(friendship_id)

    if not friendship:
        return jsonify({'message': 'Friend request not found'}), 404

    # Only the recipient can accept
    if friendship.friend_id != user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    if friendship.status != 'pending':
        return jsonify({'message': 'Request is not pending'}), 400

    friendship.status = 'accepted'
    db.session.commit()

    # Notify both users
    socketio.emit('friend_accepted', friendship.to_dict(),
                  namespace='/friends', room=f'user_{friendship.user_id}')
    socketio.emit('friend_accepted', friendship.to_dict(),
                  namespace='/friends', room=f'user_{friendship.friend_id}')

    return jsonify({'message': 'Friend request accepted', 'friendship': friendship.to_dict()}), 200


# ──────────────────────────────────────────────
# Reject / cancel friend request
# ──────────────────────────────────────────────
@friends_bp.route('/reject/<int:friendship_id>', methods=['POST'])
@jwt_required()
def reject_friend_request(friendship_id):
    user_id = int(get_jwt_identity())
    friendship = Friendship.query.get(friendship_id)

    if not friendship:
        return jsonify({'message': 'Friend request not found'}), 404

    # Either party can cancel/reject
    if friendship.user_id != user_id and friendship.friend_id != user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    other_id = friendship.friend_id if friendship.user_id == user_id else friendship.user_id
    db.session.delete(friendship)
    db.session.commit()

    socketio.emit('friend_removed', {'friendship_id': friendship_id, 'user_id': user_id},
                  namespace='/friends', room=f'user_{other_id}')

    return jsonify({'message': 'Friend request rejected'}), 200


# ──────────────────────────────────────────────
# Remove friend (unfriend)
# ──────────────────────────────────────────────
@friends_bp.route('/remove/<int:friend_id>', methods=['DELETE'])
@jwt_required()
def remove_friend(friend_id):
    user_id = int(get_jwt_identity())

    friendship = Friendship.query.filter(
        db.or_(
            db.and_(Friendship.user_id == user_id, Friendship.friend_id == friend_id),
            db.and_(Friendship.user_id == friend_id, Friendship.friend_id == user_id),
        ),
        Friendship.status == 'accepted',
    ).first()

    if not friendship:
        return jsonify({'message': 'Friendship not found'}), 404

    db.session.delete(friendship)
    db.session.commit()

    socketio.emit('friend_removed', {'friendship_id': friendship.id, 'user_id': user_id},
                  namespace='/friends', room=f'user_{friend_id}')

    return jsonify({'message': 'Friend removed'}), 200


# ──────────────────────────────────────────────
# Block user
# ──────────────────────────────────────────────
@friends_bp.route('/block/<int:target_id>', methods=['POST'])
@jwt_required()
def block_user(target_id):
    user_id = int(get_jwt_identity())

    if user_id == target_id:
        return jsonify({'message': 'Cannot block yourself'}), 400

    # Remove any existing friendship
    existing = Friendship.query.filter(
        db.or_(
            db.and_(Friendship.user_id == user_id, Friendship.friend_id == target_id),
            db.and_(Friendship.user_id == target_id, Friendship.friend_id == user_id),
        )
    ).first()

    if existing:
        existing.user_id = user_id
        existing.friend_id = target_id
        existing.status = 'blocked'
    else:
        existing = Friendship(user_id=user_id, friend_id=target_id, status='blocked')
        db.session.add(existing)

    db.session.commit()
    return jsonify({'message': 'User blocked'}), 200


# ──────────────────────────────────────────────
# Unblock user
# ──────────────────────────────────────────────
@friends_bp.route('/unblock/<int:target_id>', methods=['POST'])
@jwt_required()
def unblock_user(target_id):
    user_id = int(get_jwt_identity())

    friendship = Friendship.query.filter_by(
        user_id=user_id, friend_id=target_id, status='blocked'
    ).first()

    if not friendship:
        return jsonify({'message': 'Block not found'}), 404

    db.session.delete(friendship)
    db.session.commit()
    return jsonify({'message': 'User unblocked'}), 200


# ──────────────────────────────────────────────
# List friends (accepted)
# ──────────────────────────────────────────────
@friends_bp.route('/list', methods=['GET'])
@jwt_required()
def list_friends():
    user_id = int(get_jwt_identity())

    friendships = Friendship.query.filter(
        db.or_(
            Friendship.user_id == user_id,
            Friendship.friend_id == user_id,
        ),
        Friendship.status == 'accepted',
    ).all()

    friends = []
    for f in friendships:
        friend_user = f.friend if f.user_id == user_id else f.user
        friends.append({
            'friendship_id': f.id,
            'id': friend_user.id,
            'username': friend_user.username,
            'display_name': friend_user.display_name or friend_user.username,
            'avatar_url': friend_user.avatar_url,
            'is_online': friend_user.is_online,
            'last_seen': friend_user.last_seen.isoformat() if friend_user.last_seen else None,
        })

    return jsonify(friends), 200


# ──────────────────────────────────────────────
# List online friends
# ──────────────────────────────────────────────
@friends_bp.route('/online', methods=['GET'])
@jwt_required()
def online_friends():
    user_id = int(get_jwt_identity())

    friendships = Friendship.query.filter(
        db.or_(
            Friendship.user_id == user_id,
            Friendship.friend_id == user_id,
        ),
        Friendship.status == 'accepted',
    ).all()

    online = []
    for f in friendships:
        friend_user = f.friend if f.user_id == user_id else f.user
        if friend_user.is_online:
            online.append({
                'friendship_id': f.id,
                'id': friend_user.id,
                'username': friend_user.username,
                'display_name': friend_user.display_name or friend_user.username,
                'avatar_url': friend_user.avatar_url,
                'is_online': True,
            })

    return jsonify(online), 200


# ──────────────────────────────────────────────
# Pending requests (received)
# ──────────────────────────────────────────────
@friends_bp.route('/pending', methods=['GET'])
@jwt_required()
def pending_requests():
    user_id = int(get_jwt_identity())

    pending = Friendship.query.filter_by(
        friend_id=user_id, status='pending'
    ).all()

    return jsonify([f.to_dict() for f in pending]), 200


# ──────────────────────────────────────────────
# Sent requests (outgoing)
# ──────────────────────────────────────────────
@friends_bp.route('/sent', methods=['GET'])
@jwt_required()
def sent_requests():
    user_id = int(get_jwt_identity())

    sent = Friendship.query.filter_by(
        user_id=user_id, status='pending'
    ).all()

    return jsonify([f.to_dict() for f in sent]), 200


# ──────────────────────────────────────────────
# Search users (for adding friends)
# ──────────────────────────────────────────────
@friends_bp.route('/search', methods=['GET'])
@jwt_required()
def search_users():
    query = request.args.get('q', '').strip()
    if not query or len(query) < 2:
        return jsonify([]), 200

    current_user_id = int(get_jwt_identity())

    users = (
        User.query
        .filter(
            User.id != current_user_id,
            User.is_active == True,  # noqa: E712
            db.or_(
                User.username.ilike(f'%{query}%'),
                User.display_name.ilike(f'%{query}%'),
            ),
        )
        .limit(20)
        .all()
    )

    # Get existing friendships for these users
    user_ids = [u.id for u in users]
    existing_friendships = Friendship.query.filter(
        db.or_(
            db.and_(Friendship.user_id == current_user_id, Friendship.friend_id.in_(user_ids)),
            db.and_(Friendship.friend_id == current_user_id, Friendship.user_id.in_(user_ids)),
        )
    ).all()

    # Build a map of user_id -> friendship status
    friendship_map = {}
    for f in existing_friendships:
        other_id = f.friend_id if f.user_id == current_user_id else f.user_id
        friendship_map[other_id] = {
            'friendship_id': f.id,
            'status': f.status,
            'is_sender': f.user_id == current_user_id,
        }

    results = []
    for u in users:
        result = {
            'id': u.id,
            'username': u.username,
            'display_name': u.display_name or u.username,
            'avatar_url': u.avatar_url,
            'is_online': u.is_online,
        }
        if u.id in friendship_map:
            result['friendship'] = friendship_map[u.id]
        else:
            result['friendship'] = None
        results.append(result)

    return jsonify(results), 200
