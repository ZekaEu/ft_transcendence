from datetime import datetime, timezone

from app.core.extensions import db


# ──────────────────────────────────────────────
# Association table: room ↔ user (many-to-many)
# ──────────────────────────────────────────────
chat_room_members = db.Table(
    'chat_room_members',
    db.Column('room_id', db.Integer, db.ForeignKey('chat_rooms.id', ondelete='CASCADE'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    db.Column('joined_at', db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)),
)


class ChatRoom(db.Model):
    """A chat room – either a direct-message pair or a named group."""
    __tablename__ = 'chat_rooms'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(128), nullable=True)           # NULL for DMs
    is_group = db.Column(db.Boolean, default=False, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    members = db.relationship(
        'User', secondary=chat_room_members, backref=db.backref('chat_rooms', lazy='dynamic'),
        lazy='dynamic',
    )
    messages = db.relationship(
        'ChatMessage', backref='room', lazy='dynamic',
        cascade='all, delete-orphan', order_by='ChatMessage.created_at',
    )

    def to_dict(self, include_members=True):
        data = {
            'id': self.id,
            'name': self.name,
            'is_group': self.is_group,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_members:
            data['members'] = [
                {'id': u.id, 'username': u.username, 'display_name': u.display_name or u.username,
                 'avatar_url': u.avatar_url, 'is_online': u.is_online}
                for u in self.members
            ]
        return data

    def __repr__(self):
        label = self.name or f'DM#{self.id}'
        return f'<ChatRoom {label}>'


class ChatMessage(db.Model):
    """A single chat message inside a room."""
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    is_system = db.Column(db.Boolean, default=False, nullable=False)   # join/leave notices
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )

    # Relationships
    sender = db.relationship('User', backref=db.backref('sent_messages', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'sender_id': self.sender_id,
            'sender_username': self.sender.username if self.sender else None,
            'sender_avatar': self.sender.avatar_url if self.sender else None,
            'content': self.content,
            'is_system': self.is_system,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<ChatMessage {self.id} room={self.room_id}>'
