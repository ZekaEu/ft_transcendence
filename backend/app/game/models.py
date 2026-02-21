from datetime import datetime, timezone
import html
import random
import logging

import requests

from app.core.extensions import db

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Kahoot API — fetch real quizzes from Kahoot
# ──────────────────────────────────────────────
KAHOOT_SEARCH_URL = "https://create.kahoot.it/rest/kahoots/"
KAHOOT_QUIZ_URL = "https://create.kahoot.it/rest/kahoots/{uuid}"

# Search topics that map to Kahoot search queries (English base)
KAHOOT_CATEGORIES_EN = {
    "any":          "trivia quiz",
    "science":      "science quiz",
    "geography":    "geography quiz",
    "history":      "history quiz",
    "art":          "art quiz",
    "music":        "music quiz",
    "sports":       "sports quiz",
    "literature":   "literature books quiz",
    "movies":       "movies film quiz",
    "technology":   "technology computers quiz",
    "math":         "math mathematics quiz",
    "nature":       "nature animals quiz",
    "food":         "food cooking quiz",
    "gaming":       "video games quiz",
    "pop_culture":  "pop culture quiz",
    "languages":    "languages quiz",
}

# Localized search queries — search in the native language WITHOUT the language filter
# (Kahoot has very few results with the language filter for non-English)
KAHOOT_CATEGORIES_LOCALIZED = {
    "pt": {
        "any":          "quiz perguntas",
        "science":      "quiz ciência",
        "geography":    "quiz geografia",
        "history":      "quiz história",
        "art":          "quiz arte",
        "music":        "quiz música",
        "sports":       "quiz esportes",
        "literature":   "quiz literatura livros",
        "movies":       "quiz filmes cinema",
        "technology":   "quiz tecnologia",
        "math":         "quiz matemática",
        "nature":       "quiz natureza animais",
        "food":         "quiz comida culinária",
        "gaming":       "quiz jogos",
        "pop_culture":  "quiz cultura pop",
        "languages":    "quiz idiomas",
    },
    "es": {
        "any":          "quiz preguntas",
        "science":      "quiz ciencia",
        "geography":    "quiz geografía",
        "history":      "quiz historia",
        "art":          "quiz arte",
        "music":        "quiz música",
        "sports":       "quiz deportes",
        "literature":   "quiz literatura libros",
        "movies":       "quiz películas cine",
        "technology":   "quiz tecnología",
        "math":         "quiz matemáticas",
        "nature":       "quiz naturaleza animales",
        "food":         "quiz comida cocina",
        "gaming":       "quiz videojuegos",
        "pop_culture":  "quiz cultura pop",
        "languages":    "quiz idiomas",
    },
    "fr": {
        "any":          "quiz questions",
        "science":      "quiz science",
        "geography":    "quiz géographie",
        "history":      "quiz histoire",
        "art":          "quiz art",
        "music":        "quiz musique",
        "sports":       "quiz sport",
        "literature":   "quiz littérature livres",
        "movies":       "quiz films cinéma",
        "technology":   "quiz technologie",
        "math":         "quiz mathématiques",
        "nature":       "quiz nature animaux",
        "food":         "quiz cuisine",
        "gaming":       "quiz jeux vidéo",
        "pop_culture":  "quiz culture pop",
        "languages":    "quiz langues",
    },
}

# Keep category keys for validation (same across all languages)
KAHOOT_CATEGORIES = KAHOOT_CATEGORIES_EN

VALID_DIFFICULTIES = ("any", "easy", "medium", "hard")

# Supported languages for Kahoot quiz search
KAHOOT_LANGUAGES = {
    "any": None,
    "en":  "English",
    "es":  "Spanish",
    "fr":  "French",
    "pt":  "Portuguese",
}


import re


# HTTP headers to avoid being blocked by Kahoot API
_KAHOOT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; TriviaTrouble/1.0)",
    "Accept": "application/json",
}


def _strip_html(text):
    """Remove HTML tags from text."""
    return re.sub(r'<[^>]+>', '', text)


def _search_kahoot_quizzes(query="trivia", limit=20, language=None):
    """
    Search public Kahoot quizzes by keyword.
    Returns a list of quiz metadata dicts, or empty list on failure.
    """
    params = {
        "query": query,
        "cursor": 0,
        "limit": limit,
        "includeCard": "false",
        "includeExtendedCounters": "false",
    }
    if language and language != "any":
        params["language"] = language
    try:
        logger.info("Kahoot search: GET %s params=%s", KAHOOT_SEARCH_URL, params)
        resp = requests.get(KAHOOT_SEARCH_URL, params=params, headers=_KAHOOT_HEADERS, timeout=15)
        logger.info("Kahoot search response: status=%s, length=%d", resp.status_code, len(resp.content))
        if resp.status_code != 200:
            logger.error("Kahoot search HTTP error: %s body=%s", resp.status_code, resp.text[:500])
            return []
        data = resp.json()
        entities = data.get("entities", [])
        logger.info("Kahoot search returned %d entities (keys: %s)", len(entities), list(data.keys()))
        return entities
    except requests.exceptions.ConnectionError as exc:
        logger.error("Kahoot search connection error (DNS/network): %s", exc)
        return []
    except requests.exceptions.Timeout as exc:
        logger.error("Kahoot search timeout: %s", exc)
        return []
    except Exception as exc:
        logger.error("Kahoot search failed: %s [%s]", exc, type(exc).__name__)
        return []


def _fetch_kahoot_quiz(uuid):
    """
    Fetch a full Kahoot quiz by its UUID.
    Returns the quiz dict or None on failure.
    """
    try:
        url = KAHOOT_QUIZ_URL.format(uuid=uuid)
        resp = requests.get(url, headers=_KAHOOT_HEADERS, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.error("Kahoot quiz fetch failed for %s: %s", uuid, exc)
        return None


def _parse_kahoot_questions(quiz_data, count=10):
    """
    Parse a Kahoot quiz response into our internal question format.
    Only keeps 'quiz' type questions that have exactly 4 choices.
    """
    questions_raw = quiz_data.get("questions", [])
    parsed = []

    for q in questions_raw:
        # Only accept multiple-choice quiz questions
        q_type = q.get("type", "")
        if q_type != "quiz":
            continue

        text = _strip_html(html.unescape(q.get("question", "").strip()))
        if not text:
            continue

        choices = q.get("choices", [])
        if len(choices) < 2:
            continue

        # Find correct answer(s) — take the first correct one
        correct_idx = None
        options = []
        for i, choice in enumerate(choices):
            answer_text = _strip_html(html.unescape(choice.get("answer", "").strip()))
            options.append(answer_text)
            if choice.get("correct") and correct_idx is None:
                correct_idx = i

        if correct_idx is None or not options:
            continue

        # Pad to 4 options if needed, or trim to 4
        if len(options) < 4:
            # Keep as-is with fewer options — still playable
            pass
        elif len(options) > 4:
            # Keep the correct answer + 3 random wrong ones
            wrong = [o for i, o in enumerate(options) if i != correct_idx]
            random.shuffle(wrong)
            kept_wrong = wrong[:3]
            correct_text = options[correct_idx]
            options = kept_wrong + [correct_text]
            random.shuffle(options)
            correct_idx = options.index(correct_text)

        # Extract image URL if present
        image_url = q.get("image") or None

        parsed.append({
            "question": text,
            "options": options,
            "answer": correct_idx,
            "category": _strip_html(html.unescape(quiz_data.get("title", "Kahoot"))),
            "difficulty": "medium",
            "image": image_url,
        })

        if len(parsed) >= count:
            break

    return parsed


def _fetch_kahoot_questions(count=10, category=None, difficulty=None, language=None):
    """
    Fetch trivia questions from the Kahoot API.
    Strategy:
      - English (or 'any'): search with English query + language=English filter
      - Other languages (pt, es, fr): search with localized query WITHOUT language filter
        (Kahoot has very few results when using the language filter for non-English)
      - Fallback: if localized search fails, retry with English query (no filter)
    """
    cat = category or "any"
    lang = language or "any"

    # Determine search strategy based on language
    if lang in ("en", "any"):
        # English: use English query + language filter
        search_query = KAHOOT_CATEGORIES_EN.get(cat, "trivia quiz")
        kahoot_lang = "English" if lang == "en" else None
    elif lang in KAHOOT_CATEGORIES_LOCALIZED:
        # Non-English: search with localized query, NO language filter
        search_query = KAHOOT_CATEGORIES_LOCALIZED[lang].get(cat, "quiz")
        kahoot_lang = None
    else:
        # Unknown language: use English
        search_query = KAHOOT_CATEGORIES_EN.get(cat, "trivia quiz")
        kahoot_lang = None

    logger.info("Kahoot strategy: query='%s', api_lang=%s (user_lang=%s, cat=%s)",
                search_query, kahoot_lang, lang, cat)

    # Search for quizzes
    quizzes = _search_kahoot_quizzes(query=search_query, limit=30, language=kahoot_lang)

    # Fallback: if localized search found nothing, try English without filter
    if not quizzes and lang not in ("en", "any"):
        logger.info("Kahoot: localized search empty, falling back to English query")
        search_query = KAHOOT_CATEGORIES_EN.get(cat, "trivia quiz")
        quizzes = _search_kahoot_quizzes(query=search_query, limit=30, language=None)

    if not quizzes:
        logger.warning("No Kahoot quizzes found for query: '%s' (lang=%s)", search_query, lang)
        return None

    # Filter out premium-only quizzes (require access_pass)
    free_quizzes = [
        q for q in quizzes
        if not q.get("card", {}).get("inventoryItemIds")
    ]
    logger.info("Kahoot: %d total, %d free quizzes", len(quizzes), len(free_quizzes))

    # Filter quizzes that likely have enough questions
    suitable = [
        q for q in (free_quizzes or quizzes)
        if q.get("card", {}).get("number_of_questions", 0) >= 4
        or q.get("number_of_questions", 0) >= 4
    ]

    if not suitable:
        suitable = free_quizzes or quizzes  # fallback to all results

    random.shuffle(suitable)
    logger.info("Kahoot: trying %d suitable quizzes", len(suitable[:8]))

    all_questions = []

    # Try multiple quizzes until we have enough questions
    for quiz_meta in suitable[:8]:
        uuid = quiz_meta.get("card", {}).get("uuid") or quiz_meta.get("uuid")
        if not uuid:
            continue

        logger.info("Kahoot: fetching quiz %s", uuid)
        quiz_data = _fetch_kahoot_quiz(uuid)
        if not quiz_data:
            continue

        parsed = _parse_kahoot_questions(quiz_data, count=count)
        logger.info("Kahoot: parsed %d questions from quiz %s", len(parsed), uuid)
        all_questions.extend(parsed)

        if len(all_questions) >= count:
            break

    if not all_questions:
        return None

    # Shuffle and trim to requested count
    random.shuffle(all_questions)
    return all_questions[:count]


# ──────────────────────────────────────────────
# Fallback question bank (used when Kahoot API is unavailable)
# ──────────────────────────────────────────────
FALLBACK_QUESTION_BANK = [
    {
        "question": "Which planet in our solar system is known as the 'Red Planet'?",
        "options": ["Jupiter", "Mars", "Venus", "Saturn"],
        "answer": 1,
        "category": "Science",
        "difficulty": "easy",
    },
    {
        "question": "What is the largest ocean on Earth?",
        "options": ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        "answer": 3,
        "category": "Geography",
        "difficulty": "easy",
    },
    {
        "question": "Who painted the Mona Lisa?",
        "options": ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
        "answer": 2,
        "category": "Art",
        "difficulty": "easy",
    },
    {
        "question": "What is the chemical symbol for gold?",
        "options": ["Go", "Gd", "Au", "Ag"],
        "answer": 2,
        "category": "Science",
        "difficulty": "medium",
    },
    {
        "question": "In which year did World War II end?",
        "options": ["1943", "1944", "1945", "1946"],
        "answer": 2,
        "category": "History",
        "difficulty": "easy",
    },
    {
        "question": "What is the smallest country in the world?",
        "options": ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
        "answer": 1,
        "category": "Geography",
        "difficulty": "easy",
    },
    {
        "question": "Which element has the atomic number 1?",
        "options": ["Helium", "Hydrogen", "Lithium", "Carbon"],
        "answer": 1,
        "category": "Science",
        "difficulty": "easy",
    },
    {
        "question": "Who wrote 'Romeo and Juliet'?",
        "options": ["Charles Dickens", "Jane Austen", "William Shakespeare", "Mark Twain"],
        "answer": 2,
        "category": "Literature",
        "difficulty": "easy",
    },
    {
        "question": "What is the capital of Japan?",
        "options": ["Osaka", "Kyoto", "Tokyo", "Yokohama"],
        "answer": 2,
        "category": "Geography",
        "difficulty": "easy",
    },
    {
        "question": "How many continents are there on Earth?",
        "options": ["5", "6", "7", "8"],
        "answer": 2,
        "category": "Geography",
        "difficulty": "easy",
    },
    {
        "question": "Which gas do plants absorb from the atmosphere?",
        "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
        "answer": 2,
        "category": "Science",
        "difficulty": "easy",
    },
    {
        "question": "What is the longest river in the world?",
        "options": ["Amazon", "Nile", "Yangtze", "Mississippi"],
        "answer": 1,
        "category": "Geography",
        "difficulty": "medium",
    },
    {
        "question": "Who developed the theory of relativity?",
        "options": ["Isaac Newton", "Albert Einstein", "Nikola Tesla", "Galileo Galilei"],
        "answer": 1,
        "category": "Science",
        "difficulty": "easy",
    },
    {
        "question": "What is the hardest natural substance on Earth?",
        "options": ["Gold", "Iron", "Diamond", "Platinum"],
        "answer": 2,
        "category": "Science",
        "difficulty": "easy",
    },
    {
        "question": "Which country is known as the Land of the Rising Sun?",
        "options": ["China", "South Korea", "Japan", "Thailand"],
        "answer": 2,
        "category": "Geography",
        "difficulty": "easy",
    },
    {
        "question": "What is the speed of light approximately?",
        "options": ["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"],
        "answer": 0,
        "category": "Science",
        "difficulty": "medium",
    },
    {
        "question": "Who was the first person to walk on the Moon?",
        "options": ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "Michael Collins"],
        "answer": 2,
        "category": "History",
        "difficulty": "easy",
    },
    {
        "question": "What is the largest mammal in the world?",
        "options": ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
        "answer": 1,
        "category": "Science",
        "difficulty": "easy",
    },
    {
        "question": "In which continent is the Sahara Desert located?",
        "options": ["Asia", "South America", "Africa", "Australia"],
        "answer": 2,
        "category": "Geography",
        "difficulty": "easy",
    },
    {
        "question": "What programming language is known as the 'language of the web'?",
        "options": ["Python", "Java", "JavaScript", "C++"],
        "answer": 2,
        "category": "Technology",
        "difficulty": "easy",
    },
]


def get_questions(count=10, category=None, difficulty=None, language=None):
    """
    Fetch trivia questions from the Kahoot API.
    Falls back to the local question bank if the API is unreachable.
    """
    # Try the Kahoot API first
    questions = _fetch_kahoot_questions(count, category=category, difficulty=difficulty, language=language)
    if questions:
        logger.info("Fetched %d questions from Kahoot API (cat=%s, diff=%s, lang=%s)",
                     len(questions), category, difficulty, language)
        return questions

    # Fallback to local bank
    logger.warning("Using fallback question bank (Kahoot API unavailable)")
    selected = random.sample(FALLBACK_QUESTION_BANK, min(count, len(FALLBACK_QUESTION_BANK)))
    return selected


class UserPowerup(db.Model):
    """Tracks power-ups owned by a user (purchased from the shop)."""
    __tablename__ = 'user_powerups'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    powerup_type = db.Column(db.String(32), nullable=False)  # eliminate_two, show_answer
    quantity = db.Column(db.Integer, nullable=False, default=0)

    user = db.relationship('User', backref=db.backref('powerups', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'powerup_type', name='uq_user_powerup'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'powerup_type': self.powerup_type,
            'quantity': self.quantity,
        }

    def __repr__(self):
        return f'<UserPowerup user={self.user_id} type={self.powerup_type} qty={self.quantity}>'


# Power-up catalogue: type -> {cost, name, description, icon}
POWERUP_CATALOGUE = {
    'eliminate_two': {
        'cost': 500,
        'name': 'Eliminate Two',
        'icon': 'remove_circle',
    },
    'show_answer': {
        'cost': 1000,
        'name': 'Show Answer',
        'icon': 'visibility',
    },
}


class GameRoom(db.Model):
    """A game room that players can join before a match starts."""
    __tablename__ = 'game_rooms'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(128), nullable=False)
    host_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_mode = db.Column(db.String(32), nullable=False, default='classic')  # classic, survival, timed
    max_players = db.Column(db.Integer, nullable=False, default=4)
    friends_only = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.String(20), nullable=False, default='waiting')  # waiting, playing, finished
    question_category = db.Column(db.String(32), nullable=False, default='any')  # kahoot category key
    question_difficulty = db.Column(db.String(16), nullable=False, default='any')  # easy, medium, hard, any
    question_language = db.Column(db.String(8), nullable=False, default='any')  # en, pt, es, fr, etc.
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
            'friends_only': self.friends_only,
            'player_count': self.player_count,
            'status': self.status,
            'question_category': self.question_category,
            'question_difficulty': self.question_difficulty,
            'question_language': self.question_language,
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
