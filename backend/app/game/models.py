from datetime import datetime, timezone
import random

from app.core.extensions import db


# ──────────────────────────────────────────────
# Question bank (in-memory for now)
# ──────────────────────────────────────────────
QUESTION_BANK = [
    {
        "question": "Which planet in our solar system is known as the 'Red Planet'?",
        "options": ["Jupiter", "Mars", "Venus", "Saturn"],
        "answer": 1,
        "category": "Science"
    },
    {
        "question": "What is the largest ocean on Earth?",
        "options": ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        "answer": 3,
        "category": "Geography"
    },
    {
        "question": "Who painted the Mona Lisa?",
        "options": ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
        "answer": 2,
        "category": "Art"
    },
    {
        "question": "What is the chemical symbol for gold?",
        "options": ["Go", "Gd", "Au", "Ag"],
        "answer": 2,
        "category": "Science"
    },
    {
        "question": "In which year did World War II end?",
        "options": ["1943", "1944", "1945", "1946"],
        "answer": 2,
        "category": "History"
    },
    {
        "question": "What is the smallest country in the world?",
        "options": ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
        "answer": 1,
        "category": "Geography"
    },
    {
        "question": "Which element has the atomic number 1?",
        "options": ["Helium", "Hydrogen", "Lithium", "Carbon"],
        "answer": 1,
        "category": "Science"
    },
    {
        "question": "Who wrote 'Romeo and Juliet'?",
        "options": ["Charles Dickens", "Jane Austen", "William Shakespeare", "Mark Twain"],
        "answer": 2,
        "category": "Literature"
    },
    {
        "question": "What is the capital of Japan?",
        "options": ["Osaka", "Kyoto", "Tokyo", "Yokohama"],
        "answer": 2,
        "category": "Geography"
    },
    {
        "question": "How many continents are there on Earth?",
        "options": ["5", "6", "7", "8"],
        "answer": 2,
        "category": "Geography"
    },
    {
        "question": "Which gas do plants absorb from the atmosphere?",
        "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
        "answer": 2,
        "category": "Science"
    },
    {
        "question": "What is the longest river in the world?",
        "options": ["Amazon", "Nile", "Yangtze", "Mississippi"],
        "answer": 1,
        "category": "Geography"
    },
    {
        "question": "Who developed the theory of relativity?",
        "options": ["Isaac Newton", "Albert Einstein", "Nikola Tesla", "Galileo Galilei"],
        "answer": 1,
        "category": "Science"
    },
    {
        "question": "What is the hardest natural substance on Earth?",
        "options": ["Gold", "Iron", "Diamond", "Platinum"],
        "answer": 2,
        "category": "Science"
    },
    {
        "question": "Which country is known as the Land of the Rising Sun?",
        "options": ["China", "South Korea", "Japan", "Thailand"],
        "answer": 2,
        "category": "Geography"
    },
    {
        "question": "What is the speed of light approximately?",
        "options": ["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"],
        "answer": 0,
        "category": "Science"
    },
    {
        "question": "Who was the first person to walk on the Moon?",
        "options": ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "Michael Collins"],
        "answer": 2,
        "category": "History"
    },
    {
        "question": "What is the largest mammal in the world?",
        "options": ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
        "answer": 1,
        "category": "Science"
    },
    {
        "question": "In which continent is the Sahara Desert located?",
        "options": ["Asia", "South America", "Africa", "Australia"],
        "answer": 2,
        "category": "Geography"
    },
    {
        "question": "What programming language is known as the 'language of the web'?",
        "options": ["Python", "Java", "JavaScript", "C++"],
        "answer": 2,
        "category": "Technology"
    },
]


def get_questions(count=10):
    """Return a random selection of questions for a game session."""
    selected = random.sample(QUESTION_BANK, min(count, len(QUESTION_BANK)))
    return selected


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
    score = db.Column(db.Integer, default=0, nullable=False)
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
            'score': self.score,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
        }

    def __repr__(self):
        return f'<GameRoomPlayer room={self.room_id} user={self.user_id}>'
