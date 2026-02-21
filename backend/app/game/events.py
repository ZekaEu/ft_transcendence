from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import request, current_app
import eventlet

from app.core.extensions import socketio, db
from app.auth.models import User
from app.game.models import GameRoom, GameRoomPlayer, MatchHistory, get_questions, UserPowerup, POWERUP_CATALOGUE

# In-memory game sessions: { room_id: { questions, current, scores, answered, time_per_question, question_timer, advancing } }
game_sessions = {}

# Track socket connections: { sid: { user_id, room_id, is_spectator } }
sid_map = {}

TIME_PER_QUESTION = 15  # seconds
TIMER_BUFFER = 2  # extra seconds before server forces advance
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
    is_spectator = data.get('spectator', False)
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
    sid_map[request.sid] = {'user_id': user_id, 'room_id': room_id, 'is_spectator': is_spectator}

    if is_spectator:
        # Send current game state to the spectator who just joined
        session = game_sessions.get(room_id)
        if session:
            idx = session['current']
            if idx < session['total']:
                q = session['questions'][idx]
                emit('new_question', {
                    'index': idx,
                    'total': session['total'],
                    'question': q['question'],
                    'options': q['options'],
                    'category': q['category'],
                    'difficulty': q.get('difficulty', 'medium'),
                    'image': q.get('image'),
                    'time': session['time_per_question'],
                })
            scoreboard = _build_scoreboard(room_id)
            emit('scoreboard_update', {
                'scoreboard': scoreboard,
                'question_index': idx,
            })
        emit('spectator_joined', {'user_id': user_id, 'room_id': room_id})
    else:
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

    # Spectators don't affect game state
    if info.get('is_spectator'):
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

    if player_ids and len(answered_set) >= len(player_ids) and not session.get('advancing'):
        session['advancing'] = True
        timer = session.get('question_timer')
        if timer:
            timer.cancel()
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

    # Fixed question count
    q_count = 10

    questions = get_questions(
        count=q_count,
        category=room.question_category,
        difficulty=room.question_difficulty,
        language=room.question_language,
    )
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
    session['advancing'] = False  # reset guard for this question

    # Cancel any previous timer
    old_timer = session.get('question_timer')
    if old_timer:
        old_timer.cancel()

    # Start server-side timer to auto-advance when time runs out
    app = current_app._get_current_object()
    session['question_timer'] = eventlet.spawn_after(
        session['time_per_question'] + TIMER_BUFFER,
        _auto_advance, room_id, idx, app,
    )

    # Send question WITHOUT answer to clients
    socketio.emit('new_question', {
        'index': idx,
        'total': session['total'],
        'question': q['question'],
        'options': q['options'],
        'category': q['category'],
        'difficulty': q.get('difficulty', 'medium'),
        'image': q.get('image'),
        'time': session['time_per_question'],
    }, room=f'game_{room_id}', namespace='/game')


def _auto_advance(room_id, expected_idx, app):
    """Server-side timer: auto-advance to next question if not already done."""
    with app.app_context():
        session = game_sessions.get(room_id)
        if not session:
            return
        # Only advance if still on the same question and not already advancing
        if session['current'] != expected_idx or session.get('advancing'):
            return
        session['advancing'] = True
        session['current'] += 1
        if session['current'] >= session['total']:
            _end_game(room_id)
        else:
            _send_question(room_id)


@socketio.on('submit_answer', namespace='/game')
def handle_submit_answer(data):
    """Process a player's answer and calculate score."""
    # Block spectators
    info = sid_map.get(request.sid)
    if info and info.get('is_spectator'):
        emit('error', {'message': 'Spectators cannot submit answers'})
        return

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
    if len(answered_set) >= len(player_ids) and not session.get('advancing'):
        session['advancing'] = True
        # Cancel server-side timer since everyone answered
        timer = session.get('question_timer')
        if timer:
            timer.cancel()
        # Small delay then next question
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


@socketio.on('use_powerup', namespace='/game')
def handle_use_powerup(data):
    """Use a power-up during a game question."""
    import random as _rnd

    # Block spectators
    info = sid_map.get(request.sid)
    if info and info.get('is_spectator'):
        emit('error', {'message': 'Spectators cannot use powerups'})
        return

    user_id = _get_user_id(data)
    if not user_id:
        emit('error', {'message': 'Invalid token'})
        return

    room_id = data.get('room_id')
    powerup_type = data.get('powerup_type')

    if not room_id or not powerup_type:
        emit('error', {'message': 'room_id and powerup_type are required'})
        return

    if powerup_type not in POWERUP_CATALOGUE:
        emit('error', {'message': 'Invalid powerup type'})
        return

    session = game_sessions.get(room_id)
    if not session:
        emit('error', {'message': 'No active game session'})
        return

    # Prevent using powerup if already answered
    q_idx = session['current']
    answered_set = session['answered'].get(q_idx, set())
    if user_id in answered_set:
        emit('error', {'message': 'Already answered this question'})
        return

    # Track which powerups were used this question (prevent double-use per question)
    used_key = f'{q_idx}_{user_id}_{powerup_type}'
    if 'used_powerups' not in session:
        session['used_powerups'] = set()
    if used_key in session['used_powerups']:
        emit('error', {'message': 'Already used this powerup for this question'})
        return

    # Check inventory
    record = UserPowerup.query.filter_by(user_id=user_id, powerup_type=powerup_type).first()
    if not record or record.quantity < 1:
        emit('error', {'message': 'You do not own this powerup'})
        return

    q = session['questions'][q_idx]
    correct_index = q['answer']

    result = {'powerup_type': powerup_type, 'success': True}

    if powerup_type == 'eliminate_two':
        # Pick 2 random wrong answers to remove
        wrong_indices = [i for i in range(len(q['options'])) if i != correct_index]
        eliminated = _rnd.sample(wrong_indices, min(2, len(wrong_indices)))
        result['eliminated'] = eliminated

    elif powerup_type == 'show_answer':
        result['correct_index'] = correct_index

    # Deduct from inventory
    record.quantity -= 1
    if record.quantity <= 0:
        db.session.delete(record)
    db.session.commit()

    session['used_powerups'].add(used_key)

    emit('powerup_result', result)


@socketio.on('time_expired', namespace='/game')
def handle_time_expired(data):
    """Any player reports time is up — advance to next question (with guard)."""
    user_id = _get_user_id(data)
    room_id = data.get('room_id')
    if not user_id or not room_id:
        return

    session = game_sessions.get(room_id)
    if not session:
        return

    # Guard: only advance once per question
    if session.get('advancing'):
        return
    session['advancing'] = True

    # Cancel server-side timer
    timer = session.get('question_timer')
    if timer:
        timer.cancel()

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

    # Cancel any pending question timer
    timer = session.get('question_timer')
    if timer:
        timer.cancel()

    scoreboard = _build_scoreboard(room_id)

    # Persist scores to DB and accumulate XP
    room = GameRoom.query.get(room_id)
    if room:
        room.status = 'finished'
        total_players = len(scoreboard)
        for rank_idx, entry in enumerate(scoreboard):
            player = room.players.filter_by(user_id=entry['user_id']).first()
            if player:
                player.score = entry['score']
            # Add match score as XP to the user
            user = User.query.get(entry['user_id'])
            if user:
                user.xp = (user.xp or 0) + entry['score']
            # Record unified match history
            mh = MatchHistory(
                user_id=entry['user_id'],
                game_type='trivia',
                room_id=room.id,
                room_name=room.name,
                score=entry['score'],
                is_winner=(rank_idx == 0),
                total_players=total_players,
                rank=rank_idx + 1,
            )
            db.session.add(mh)
        db.session.commit()

    # Send final results
    socketio.emit('game_finished', {
        'scoreboard': scoreboard,
        'room_id': room_id,
    }, room=f'game_{room_id}', namespace='/game')

    # Cleanup session
    game_sessions.pop(room_id, None)
