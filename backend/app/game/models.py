from datetime import datetime, timezone

from app.core.extensions import db


class GameRoom(db.Model):
    """A game room that players can join before a match starts."""
    __tablename__ = 'game_rooms'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(128), nullable=False)
    host_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_mode = db.Column(db.String(32), nullable=False, default='classic')  # classic, survival, timed
    max_players = db.Column(db.Integer, nullable=False, default=4)
    status = db.Column(db.String(20), nullable=False, default='waiting')  # waiting, playing, finished
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    host = db.relationship('User', foreign_keys=[host_id], backref='hosted_rooms')
    players = db.relationship(
        'GameRoomPlayer', backref='room', lazy='dynamic',
        cascade='all, delete-orphan',
    )

    @property
    def player_count(self):
        return self.players.count()

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'host_id': self.host_id,
            'host_username': self.host.username if self.host else None,
            'host_avatar': self.host.avatar_url if self.host else None,
            'game_mode': self.game_mode,
            'max_players': self.max_players,
            'player_count': self.player_count,
            'status': self.status,
            'players': [p.to_dict() for p in self.players],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<GameRoom {self.name}>'


class GameRoomPlayer(db.Model):
    """A player inside a game room."""
    __tablename__ = 'game_room_players'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_id = db.Column(db.Integer, db.ForeignKey('game_rooms.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    is_ready = db.Column(db.Boolean, default=False, nullable=False)
    joined_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship('User', backref=db.backref('game_participations', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('room_id', 'user_id', name='uq_room_player'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'display_name': (self.user.display_name or self.user.username) if self.user else None,
            'avatar_url': self.user.avatar_url if self.user else None,
            'is_ready': self.is_ready,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
        }

    def __repr__(self):
        return f'<GameRoomPlayer room={self.room_id} user={self.user_id}>'
