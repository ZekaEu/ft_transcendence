from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import request, current_app
import eventlet

from app.core.extensions import socketio, db
from app.auth.models import User
from app.game.models import GameRoom, GameRoomPlayer, get_questions

# In-memory game sessions: { room_id: { questions, current, scores, answered, time_per_question } }
game_sessions = {}

# Track socket connections: { sid: { user_id, room_id } }
sid_map = {}

TIME_PER_QUESTION = 15  # seconds
BASE_POINTS = 1000


def _get_user_id(data):
    """Extract user_id from token in data dict."""
    token = data.get('token') if isinstance(data, dict) else None
    if not token:
        return None
    try:
        decoded = decode_token(token)
        return int(decoded['sub'])
    except Exception:
        return None


# ──────────────────────────────────────────────
# Namespace: /game
# ──────────────────────────────────────────────

@socketio.on('connect', namespace='/game')
def handle_connect(auth=None):
    """Authenticate user on socket connection."""
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
        emit('connected', {'user_id': user.id, 'username': user.username})
    except Exception:
        return False


@socketio.on('join_game_room', namespace='/game')
def handle_join_game_room(data):
    """Join a game room channel for real-time updates."""
    token = data.get('token')
    room_id = data.get('room_id')
    if not token or not room_id:
        emit('error', {'message': 'token and room_id are required'})
        return

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except Exception:
        emit('error', {'message': 'Invalid token'})
        return

    room = GameRoom.query.get(room_id)
    if not room:
        emit('error', {'message': 'Room not found'})
        return

    join_room(f'game_{room_id}')
    sid_map[request.sid] = {'user_id': user_id, 'room_id': room_id}
    emit('player_joined', room.to_dict(), room=f'game_{room_id}')


@socketio.on('leave_game_room', namespace='/game')
def handle_leave_game_room(data):
    """Leave a game room channel."""
    room_id = data.get('room_id')
    if room_id:
        leave_room(f'game_{room_id}')
    sid_map.pop(request.sid, None)


@socketio.on('disconnect', namespace='/game')
def handle_disconnect():
    """Remove disconnected player from active game session."""
    info = sid_map.pop(request.sid, None)
    if not info:
        return

    user_id = info['user_id']
    room_id = info['room_id']
    session = game_sessions.get(room_id)
    if not session:
        return

    # Remove player from scores so the game doesn't wait for them
    session['scores'].pop(user_id, None)

    # If no players left, end immediately
    if not session['scores']:
        _end_game(room_id)
        return

    # Check if all remaining players already answered the current question
    q_idx = session['current']
    answered_set = session['answered'].get(q_idx, set())
    answered_set.discard(user_id)
    player_ids = list(session['scores'].keys())

    if player_ids and len(answered_set) >= len(player_ids):
        app = current_app._get_current_object()
        eventlet.spawn_after(3, _next_question, room_id, app)


@socketio.on('player_ready', namespace='/game')
def handle_player_ready(data):
    """Broadcast ready status change to the room."""
    token = data.get('token')
    room_id = data.get('room_id')
    if not token or not room_id:
        return

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except Exception:
        return

    room = GameRoom.query.get(room_id)
    if room:
        emit('room_updated', room.to_dict(), room=f'game_{room_id}')


@socketio.on('game_started', namespace='/game')
def handle_game_started(data):
    """Initialize the game session and send the first question."""
    room_id = data.get('room_id')
    if not room_id:
        return

    room = GameRoom.query.get(room_id)
    if not room or room.status != 'playing':
        return

    # Determine question count based on mode
    q_count = 10
    if room.game_mode == 'survival':
        q_count = 15
    elif room.game_mode == 'timed':
        q_count = 10

    questions = get_questions(q_count)
    player_ids = [p.user_id for p in room.players]

    game_sessions[room_id] = {
        'questions': questions,
        'current': 0,
        'total': len(questions),
        'scores': {uid: 0 for uid in player_ids},
        'answered': {},  # { question_index: set(user_ids) }
        'time_per_question': TIME_PER_QUESTION,
    }

    # Notify all players so they navigate to the game page
    socketio.emit('game_start', room.to_dict(),
                  room=f'game_{room_id}', namespace='/game')

    # Small delay so clients have time to mount GamePage before first question
    import eventlet
    eventlet.sleep(2)

    _send_question(room_id)


def _send_question(room_id):
    """Send the current question to all players in the room."""
    session = game_sessions.get(room_id)
    if not session:
        return

    idx = session['current']
    if idx >= session['total']:
        _end_game(room_id)
        return

    q = session['questions'][idx]
    session['answered'][idx] = set()

    # Send question WITHOUT answer to clients
    socketio.emit('new_question', {
        'index': idx,
        'total': session['total'],
        'question': q['question'],
        'options': q['options'],
        'category': q['category'],
        'time': session['time_per_question'],
    }, room=f'game_{room_id}', namespace='/game')


@socketio.on('submit_answer', namespace='/game')
def handle_submit_answer(data):
    """Process a player's answer and calculate score."""
    user_id = _get_user_id(data)
    if not user_id:
        emit('error', {'message': 'Invalid token'})
        return

    room_id = data.get('room_id')
    answer_index = data.get('answer')
    time_remaining = data.get('time_remaining', 0)

    session = game_sessions.get(room_id)
    if not session:
        emit('error', {'message': 'No active game session'})
        return

    q_idx = session['current']
    answered_set = session['answered'].get(q_idx, set())

    # Prevent double-answer
    if user_id in answered_set:
        return

    answered_set.add(user_id)

    q = session['questions'][q_idx]
    correct = answer_index == q['answer']
    points = 0

    if correct:
        # Score: base * (time_remaining / total_time) — minimum 100 if correct
        speed_ratio = max(time_remaining, 0) / session['time_per_question']
        points = max(int(BASE_POINTS * (0.3 + 0.7 * speed_ratio)), 100)
        session['scores'][user_id] = session['scores'].get(user_id, 0) + points

    # Send result back to the player who answered
    emit('answer_result', {
        'correct': correct,
        'correct_answer': q['answer'],
        'points': points,
        'total_score': session['scores'].get(user_id, 0),
    })

    # Broadcast updated scoreboard to all players
    scoreboard = _build_scoreboard(room_id)
    emit('scoreboard_update', {
        'scoreboard': scoreboard,
        'question_index': q_idx,
    }, room=f'game_{room_id}', namespace='/game')

    # Check if all players have answered
    player_ids = list(session['scores'].keys())
    if len(answered_set) >= len(player_ids):
        # Small delay then next question
        import eventlet
        app = current_app._get_current_object()
        eventlet.spawn_after(3, _next_question, room_id, app)


def _next_question(room_id, app):
    """Advance to the next question (runs in spawned greenlet)."""
    with app.app_context():
        session = game_sessions.get(room_id)
        if not session:
            return
        session['current'] += 1
        if session['current'] >= session['total']:
            _end_game(room_id)
        else:
            _send_question(room_id)


@socketio.on('time_expired', namespace='/game')
def handle_time_expired(data):
    """Host reports time is up — advance to next question."""
    user_id = _get_user_id(data)
    room_id = data.get('room_id')
    if not user_id or not room_id:
        return

    room = GameRoom.query.get(room_id)
    if not room or room.host_id != user_id:
        return  # only host can trigger time expiry

    session = game_sessions.get(room_id)
    if not session:
        return

    # Advance
    session['current'] += 1
    if session['current'] >= session['total']:
        _end_game(room_id)
    else:
        _send_question(room_id)


def _build_scoreboard(room_id):
    """Build sorted scoreboard with player info."""
    session = game_sessions.get(room_id)
    if not session:
        return []

    scoreboard = []
    for uid, score in session['scores'].items():
        user = User.query.get(uid)
        if user:
            scoreboard.append({
                'user_id': uid,
                'username': user.username,
                'display_name': user.display_name or user.username,
                'avatar_url': user.avatar_url,
                'score': score,
            })

    scoreboard.sort(key=lambda x: x['score'], reverse=True)
    return scoreboard


def _end_game(room_id):
    """Finish the game, save scores, and send final results."""
    session = game_sessions.get(room_id)
    if not session:
        return

    scoreboard = _build_scoreboard(room_id)

    # Persist scores to DB
    room = GameRoom.query.get(room_id)
    if room:
        room.status = 'finished'
        for entry in scoreboard:
            player = room.players.filter_by(user_id=entry['user_id']).first()
            if player:
                player.score = entry['score']
        db.session.commit()

    # Send final results
    socketio.emit('game_finished', {
        'scoreboard': scoreboard,
        'room_id': room_id,
    }, room=f'game_{room_id}', namespace='/game')

    # Cleanup session
    game_sessions.pop(room_id, None)
