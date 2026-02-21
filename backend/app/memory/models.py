from datetime import datetime, timezone
import random
import logging

from app.core.extensions import db

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Card themes — each theme has a set of emoji/icon pairs
# ──────────────────────────────────────────────
CARD_THEMES = {
    'animals': [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
        '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
        '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
    ],
    'food': [
        '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓',
        '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑',
        '🌽', '🥕', '🧅', '🍄', '🥐', '🍕', '🍔', '🌮',
    ],
    'sports': [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
        '🥏', '🎱', '🏓', '🏸', '🥊', '🥋', '⛳', '🎯',
        '🏹', '🎿', '🛷', '🥌', '⛸️', '🛹', '🏄', '🚴',
    ],
    'space': [
        '🌍', '🌙', '⭐', '🌟', '✨', '☀️', '🪐', '🚀',
        '🛸', '🌌', '☄️', '🔭', '🌕', '🌑', '🌓', '🌗',
        '💫', '🌠', '🛰️', '🧑‍🚀', '👽', '🌋', '🏔️', '🌊',
    ],
    'music': [
        '🎵', '🎶', '🎸', '🎹', '🥁', '🎺', '🎷', '🎻',
        '🪕', '🪗', '🎤', '🎧', '📯', '🔔', '🎼', '🪘',
        '📻', '🎙️', '🎚️', '🎛️', '💿', '📀', '🎭', '🎪',
    ],
    'flags': [
        '🇧🇷', '🇵🇹', '🇪🇸', '🇫🇷', '🇬🇧', '🇺🇸', '🇩🇪', '🇮🇹',
        '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇷🇺', '🇨🇦', '🇦🇺', '🇲🇽',
        '🇦🇷', '🇨🇱', '🇨🇴', '🇳🇱', '🇧🇪', '🇸🇪', '🇳🇴', '🇩🇰',
    ],
}

VALID_THEMES = list(CARD_THEMES.keys())

# Board sizes: name -> (rows, cols) -> total cards must be even
BOARD_SIZES = {
    'small':  (4, 4),   # 16 cards = 8 pairs
    'medium': (4, 6),   # 24 cards = 12 pairs
    'large':  (5, 6),   # 30 cards = 15 pairs
}

VALID_BOARD_SIZES = list(BOARD_SIZES.keys())


def generate_board(board_size='medium', theme='animals'):
    """
    Generate a shuffled memory board.
    Returns a list of card dicts: [{ id, symbol, position }]
    Cards are placed in pairs; each pair shares the same symbol.
    """
    rows, cols = BOARD_SIZES.get(board_size, (4, 6))
    total_cards = rows * cols
    num_pairs = total_cards // 2

    symbols = CARD_THEMES.get(theme, CARD_THEMES['animals'])
    selected = random.sample(symbols, min(num_pairs, len(symbols)))

    # If we need more pairs than available symbols, repeat
    while len(selected) < num_pairs:
        selected.append(random.choice(symbols))

    # Create pairs
    cards = []
    for i, symbol in enumerate(selected):
        cards.append({'pair_id': i, 'symbol': symbol})
        cards.append({'pair_id': i, 'symbol': symbol})

    random.shuffle(cards)

    # Assign positions
    board = []
    for pos, card in enumerate(cards):
        board.append({
            'id': pos,
            'pair_id': card['pair_id'],
            'symbol': card['symbol'],
            'flipped': False,
            'matched': False,
        })

    return board, rows, cols


# ──────────────────────────────────────────────
# Memory Game Room (DB model)
# ──────────────────────────────────────────────
class MemoryGameRoom(db.Model):
    """A memory game room that players can join."""
    __tablename__ = 'memory_game_rooms'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(128), nullable=False)
    host_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    board_size = db.Column(db.String(16), nullable=False, default='medium')
    theme = db.Column(db.String(32), nullable=False, default='animals')
    max_players = db.Column(db.Integer, nullable=False, default=4)
    friends_only = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.String(20), nullable=False, default='waiting')  # waiting, playing, finished
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    host = db.relationship('User', foreign_keys=[host_id], backref='hosted_memory_rooms')
    players = db.relationship(
        'MemoryGamePlayer', backref='room', lazy='dynamic',
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
            'board_size': self.board_size,
            'theme': self.theme,
            'max_players': self.max_players,
            'friends_only': self.friends_only,
            'player_count': self.player_count,
            'status': self.status,
            'players': [p.to_dict() for p in self.players],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<MemoryGameRoom {self.name}>'


class MemoryGamePlayer(db.Model):
    """A player inside a memory game room."""
    __tablename__ = 'memory_game_players'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_id = db.Column(db.Integer, db.ForeignKey('memory_game_rooms.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    is_ready = db.Column(db.Boolean, default=False, nullable=False)
    score = db.Column(db.Integer, default=0, nullable=False)
    pairs_found = db.Column(db.Integer, default=0, nullable=False)
    joined_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship('User', backref=db.backref('memory_participations', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('room_id', 'user_id', name='uq_memory_room_player'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'display_name': (self.user.display_name or self.user.username) if self.user else None,
            'avatar_url': self.user.avatar_url if self.user else None,
            'is_ready': self.is_ready,
            'score': self.score,
            'pairs_found': self.pairs_found,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
        }

    def __repr__(self):
        return f'<MemoryGamePlayer room={self.room_id} user={self.user_id}>'


# ──────────────────────────────────────────────
# Memory Power-up catalogue
# ──────────────────────────────────────────────
# Re-uses UserPowerup from game module; adds new powerup types
MEMORY_POWERUP_CATALOGUE = {
    'peek': {
        'cost': 300,
        'name': 'Peek',
        'icon': 'preview',
    },
    'match_reveal': {
        'cost': 800,
        'name': 'Match Reveal',
        'icon': 'auto_fix_high',
    },
}
