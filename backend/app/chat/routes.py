from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.chat import chat_bp
from app.core.extensions import db
from app.auth.models import User
from app.chat.models import ChatRoom, ChatMessage, chat_room_members


# ──────────────────────────────────────────────
# List rooms the current user belongs to
# ──────────────────────────────────────────────
@chat_bp.route('/rooms', methods=['GET'])
@jwt_required()
def list_rooms():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    rooms = user.chat_rooms.order_by(ChatRoom.updated_at.desc()).all()

    result = []
    for room in rooms:
        room_data = room.to_dict()
        # Attach last message preview
        last_msg = (
            ChatMessage.query
            .filter_by(room_id=room.id)
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        room_data['last_message'] = last_msg.to_dict() if last_msg else None
        # Unread count
        unread = (
            ChatMessage.query
            .filter_by(room_id=room.id, is_read=False)
            .filter(ChatMessage.sender_id != user_id)
            .count()
        )
        room_data['unread_count'] = unread
        result.append(room_data)

    return jsonify(result), 200


# ──────────────────────────────────────────────
# Create a new room (group or DM)
# ──────────────────────────────────────────────
@chat_bp.route('/rooms', methods=['POST'])
@jwt_required()
def create_room():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    is_group = data.get('is_group', False)
    name = data.get('name', '').strip() if is_group else None
    member_ids = data.get('member_ids', [])

    if not isinstance(member_ids, list) or len(member_ids) == 0:
        return jsonify({'message': 'member_ids is required (list of user ids)'}), 400

    # Always include the creator
    if user_id not in member_ids:
        member_ids.append(user_id)

    # ── DM: reuse existing room if one exists between the two users ──
    if not is_group:
        if len(member_ids) != 2:
            return jsonify({'message': 'Direct messages require exactly 2 members'}), 400

        other_id = [uid for uid in member_ids if uid != user_id][0]
        existing = (
            ChatRoom.query
            .filter_by(is_group=False)
            .filter(ChatRoom.members.any(User.id == user_id))
            .filter(ChatRoom.members.any(User.id == other_id))
            .first()
        )
        if existing:
            return jsonify(existing.to_dict()), 200

    if is_group and not name:
        return jsonify({'message': 'Group rooms require a name'}), 400

    # Validate all member IDs exist
    members = User.query.filter(User.id.in_(member_ids)).all()
    if len(members) != len(member_ids):
        return jsonify({'message': 'One or more member IDs are invalid'}), 400

    room = ChatRoom(name=name, is_group=is_group, created_by=user_id)
    for member in members:
        room.members.append(member)
    db.session.add(room)
    db.session.commit()

    return jsonify(room.to_dict()), 201


# ──────────────────────────────────────────────
# Get room details
# ──────────────────────────────────────────────
@chat_bp.route('/rooms/<int:room_id>', methods=['GET'])
@jwt_required()
def get_room(room_id):
    user_id = int(get_jwt_identity())
    room = ChatRoom.query.get(room_id)

    if not room:
        return jsonify({'message': 'Room not found'}), 404

    if not room.members.filter_by(id=user_id).first():
        return jsonify({'message': 'You are not a member of this room'}), 403

    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Get message history (paginated)
# ──────────────────────────────────────────────
@chat_bp.route('/rooms/<int:room_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(room_id):
    user_id = int(get_jwt_identity())
    room = ChatRoom.query.get(room_id)

    if not room:
        return jsonify({'message': 'Room not found'}), 404

    if not room.members.filter_by(id=user_id).first():
        return jsonify({'message': 'You are not a member of this room'}), 403

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    per_page = min(per_page, 100)  # cap

    pagination = (
        ChatMessage.query
        .filter_by(room_id=room_id)
        .order_by(ChatMessage.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    messages = [m.to_dict() for m in pagination.items]
    messages.reverse()  # oldest first for the client

    return jsonify({
        'messages': messages,
        'page': pagination.page,
        'per_page': per_page,
        'total': pagination.total,
        'pages': pagination.pages,
    }), 200


# ──────────────────────────────────────────────
# Mark messages as read
# ──────────────────────────────────────────────
@chat_bp.route('/rooms/<int:room_id>/read', methods=['POST'])
@jwt_required()
def mark_as_read(room_id):
    user_id = int(get_jwt_identity())
    room = ChatRoom.query.get(room_id)

    if not room:
        return jsonify({'message': 'Room not found'}), 404

    if not room.members.filter_by(id=user_id).first():
        return jsonify({'message': 'You are not a member of this room'}), 403

    ChatMessage.query.filter(
        ChatMessage.room_id == room_id,
        ChatMessage.sender_id != user_id,
        ChatMessage.is_read == False,
    ).update({'is_read': True})
    db.session.commit()

    return jsonify({'message': 'Messages marked as read'}), 200


# ──────────────────────────────────────────────
# Add member to a group room
# ──────────────────────────────────────────────
@chat_bp.route('/rooms/<int:room_id>/members', methods=['POST'])
@jwt_required()
def add_member(room_id):
    user_id = int(get_jwt_identity())
    room = ChatRoom.query.get(room_id)

    if not room or not room.is_group:
        return jsonify({'message': 'Group room not found'}), 404

    if not room.members.filter_by(id=user_id).first():
        return jsonify({'message': 'You are not a member of this room'}), 403

    data = request.get_json() or {}
    new_user_id = data.get('user_id')
    new_user = User.query.get(new_user_id) if new_user_id else None

    if not new_user:
        return jsonify({'message': 'User not found'}), 404

    if room.members.filter_by(id=new_user.id).first():
        return jsonify({'message': 'User is already a member'}), 409

    room.members.append(new_user)
    db.session.commit()

    return jsonify(room.to_dict()), 200


# ──────────────────────────────────────────────
# Leave a room
# ──────────────────────────────────────────────
@chat_bp.route('/rooms/<int:room_id>/leave', methods=['POST'])
@jwt_required()
def leave_room(room_id):
    user_id = int(get_jwt_identity())
    room = ChatRoom.query.get(room_id)

    if not room:
        return jsonify({'message': 'Room not found'}), 404

    user = room.members.filter_by(id=user_id).first()
    if not user:
        return jsonify({'message': 'You are not a member of this room'}), 403

    room.members.remove(user)

    # Delete room if empty
    if room.members.count() == 0:
        db.session.delete(room)

    db.session.commit()

    return jsonify({'message': 'Left room successfully'}), 200
