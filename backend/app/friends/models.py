from datetime import datetime, timezone

from app.core.extensions import db


class Friendship(db.Model):
    """
    Friendship between two users.
    status: pending, accepted, blocked
    user_id is the one who sent the request.
    friend_id is the one who receives it.
    """
    __tablename__ = 'friendships'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, accepted, blocked
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('sent_friend_requests', lazy='dynamic'))
    friend = db.relationship('User', foreign_keys=[friend_id], backref=db.backref('received_friend_requests', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'friend_id', name='uq_friendship'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'friend_id': self.friend_id,
            'status': self.status,
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'display_name': self.user.display_name or self.user.username,
                'avatar_url': self.user.avatar_url,
                'is_online': self.user.is_online,
            } if self.user else None,
            'friend': {
                'id': self.friend.id,
                'username': self.friend.username,
                'display_name': self.friend.display_name or self.friend.username,
                'avatar_url': self.friend.avatar_url,
                'is_online': self.friend.is_online,
            } if self.friend else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Friendship {self.user_id} -> {self.friend_id} ({self.status})>'
