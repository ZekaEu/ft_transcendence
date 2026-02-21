from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import request, current_app
import eventlet
import random as _rnd

from app.core.extensions import socketio, db
from app.auth.models import User
from app.game.models import UserPowerup, MatchHistory
from app.memory.models import (
    MemoryGameRoom, MemoryGamePlayer, generate_board,
    MEMORY_POWERUP_CATALOGUE,
)

# In-memory game sessions:
# { room_id: {
#     board: [...],  rows, cols,
#     current_turn: user_id,
#     turn_order: [user_id, ...],
#     turn_index: int,
#     scores: { user_id: int },
#     pairs_found: { user_id: int },
#     first_flip: int|None,       # card id of first flip this turn
#     total_pairs: int,
#     matched_pairs: int,
#     used_powerups: set(),
#     move_count: { user_id: int },
# } }
memory_sessions = {}

# Track socket connections: { sid: { user_id, room_id, is_spectator } }
memory_sid_map = {}

BASE_MATCH_POINTS = 500
COMBO_BONUS = 100
TIME_PER_TURN = 30  # seconds to flip two cards


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
# Namespace: /memory
# ──────────────────────────────────────────────

@socketio.on('connect', namespace='/memory')
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


@socketio.on('join_memory_room', namespace='/memory')
def handle_join_memory_room(data):
    """Join a memory game room channel."""
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

    room = MemoryGameRoom.query.get(room_id)
    if not room:
        emit('error', {'message': 'Room not found'})
        return

    join_room(f'memory_{room_id}')
    memory_sid_map[request.sid] = {'user_id': user_id, 'room_id': room_id, 'is_spectator': is_spectator}

    if is_spectator:
        session = memory_sessions.get(room_id)
        if session:
            # Send current board state (only matched/flipped visible)
            safe_board = _get_safe_board(session)
            emit('memory_board_state', {
                'board': safe_board,
                'rows': session['rows'],
                'cols': session['cols'],
                'current_turn': session['current_turn'],
                'scores': _build_memory_scoreboard(room_id),
                'total_pairs': session['total_pairs'],
                'matched_pairs': session['matched_pairs'],
            })
        emit('spectator_joined', {'user_id': user_id, 'room_id': room_id})
    else:
        emit('player_joined', room.to_dict(), room=f'memory_{room_id}')


@socketio.on('leave_memory_room', namespace='/memory')
def handle_leave_memory_room(data):
    """Leave a memory game room channel."""
    room_id = data.get('room_id')
    if room_id:
        leave_room(f'memory_{room_id}')
    memory_sid_map.pop(request.sid, None)


@socketio.on('disconnect', namespace='/memory')
def handle_disconnect():
    """Handle disconnection during memory game."""
    info = memory_sid_map.pop(request.sid, None)
    if not info:
        return

    if info.get('is_spectator'):
        return

    user_id = info['user_id']
    room_id = info['room_id']
    session = memory_sessions.get(room_id)
    if not session:
        return

    # Remove player from session
    session['scores'].pop(user_id, None)
    session['pairs_found'].pop(user_id, None)
    session['move_count'].pop(user_id, None)

    if user_id in session['turn_order']:
        was_current = session['current_turn'] == user_id
        session['turn_order'].remove(user_id)
        if not session['turn_order']:
            _end_memory_game(room_id)
            return
        if was_current:
            session['turn_index'] = session['turn_index'] % len(session['turn_order'])
            session['current_turn'] = session['turn_order'][session['turn_index']]
            socketio.emit('memory_turn_change', {
                'current_turn': session['current_turn'],
                'scores': _build_memory_scoreboard(room_id),
            }, room=f'memory_{room_id}', namespace='/memory')


@socketio.on('player_ready', namespace='/memory')
def handle_player_ready(data):
    """Broadcast ready status change."""
    token = data.get('token')
    room_id = data.get('room_id')
    if not token or not room_id:
        return

    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
    except Exception:
        return

    room = MemoryGameRoom.query.get(room_id)
    if room:
        emit('room_updated', room.to_dict(), room=f'memory_{room_id}')


@socketio.on('memory_game_started', namespace='/memory')
def handle_memory_game_started(data):
    """Initialize the memory game session and send the board."""
    room_id = data.get('room_id')
    if not room_id:
        return

    room = MemoryGameRoom.query.get(room_id)
    if not room or room.status != 'playing':
        return

    board, rows, cols = generate_board(room.board_size, room.theme)
    player_ids = [p.user_id for p in room.players]
    _rnd.shuffle(player_ids)  # randomize turn order

    total_pairs = (rows * cols) // 2

    memory_sessions[room_id] = {
        'board': board,
        'rows': rows,
        'cols': cols,
        'current_turn': player_ids[0],
        'turn_order': player_ids,
        'turn_index': 0,
        'scores': {uid: 0 for uid in player_ids},
        'pairs_found': {uid: 0 for uid in player_ids},
        'first_flip': None,
        'flip_locked': False,
        'total_pairs': total_pairs,
        'matched_pairs': 0,
        'used_powerups': set(),
        'move_count': {uid: 0 for uid in player_ids},
        'streak': {uid: 0 for uid in player_ids},
    }

    # Notify all players the game is starting
    socketio.emit('memory_game_start', room.to_dict(),
                  room=f'memory_{room_id}', namespace='/memory')

    eventlet.sleep(2)

    # Send the board (face-down — no symbols)
    safe_board = _get_safe_board(memory_sessions[room_id])
    socketio.emit('memory_board_state', {
        'board': safe_board,
        'rows': rows,
        'cols': cols,
        'current_turn': player_ids[0],
        'scores': _build_memory_scoreboard(room_id),
        'total_pairs': total_pairs,
        'matched_pairs': 0,
    }, room=f'memory_{room_id}', namespace='/memory')


@socketio.on('memory_flip_card', namespace='/memory')
def handle_flip_card(data):
    """Handle a player flipping a card."""
    # Block spectators
    info = memory_sid_map.get(request.sid)
    if info and info.get('is_spectator'):
        emit('error', {'message': 'Spectators cannot flip cards'})
        return

    user_id = _get_user_id(data)
    if not user_id:
        emit('error', {'message': 'Invalid token'})
        return

    room_id = data.get('room_id')
    card_id = data.get('card_id')

    session = memory_sessions.get(room_id)
    if not session:
        emit('error', {'message': 'No active game session'})
        return

    # Block flips while waiting for no-match animation
    if session.get('flip_locked'):
        emit('error', {'message': 'Wait for cards to flip back'})
        return

    # Check it's this player's turn
    if session['current_turn'] != user_id:
        emit('error', {'message': 'Not your turn'})
        return

    # Validate card_id
    if card_id is None or card_id < 0 or card_id >= len(session['board']):
        emit('error', {'message': 'Invalid card'})
        return

    card = session['board'][card_id]

    # Can't flip already matched or currently flipped card
    if card['matched']:
        emit('error', {'message': 'Card already matched'})
        return
    if card['flipped']:
        emit('error', {'message': 'Card already flipped'})
        return

    # Flip the card
    card['flipped'] = True

    # Broadcast the flip to all players
    socketio.emit('memory_card_flipped', {
        'card_id': card_id,
        'symbol': card['symbol'],
        'user_id': user_id,
    }, room=f'memory_{room_id}', namespace='/memory')

    if session['first_flip'] is None:
        # First card of the pair
        session['first_flip'] = card_id
    else:
        # Second card — check for match
        first_card_id = session['first_flip']
        first_card = session['board'][first_card_id]
        session['first_flip'] = None

        session['move_count'][user_id] = session['move_count'].get(user_id, 0) + 1

        if first_card['pair_id'] == card['pair_id']:
            # MATCH!
            first_card['matched'] = True
            card['matched'] = True
            session['matched_pairs'] += 1
            session['pairs_found'][user_id] = session['pairs_found'].get(user_id, 0) + 1

            # Score: base + combo bonus for consecutive matches
            streak = session['streak'].get(user_id, 0) + 1
            session['streak'][user_id] = streak
            points = BASE_MATCH_POINTS + (COMBO_BONUS * (streak - 1))
            session['scores'][user_id] = session['scores'].get(user_id, 0) + points

            # Notify match
            app = current_app._get_current_object()
            eventlet.spawn_after(0.8, _broadcast_match, room_id, first_card_id, card_id, user_id, points, streak, app)

            # Check if game is over
            if session['matched_pairs'] >= session['total_pairs']:
                eventlet.spawn_after(2, _end_memory_game, room_id, app)
            else:
                # Same player keeps turn on a match — broadcast turn after delay
                eventlet.spawn_after(1.5, _broadcast_turn, room_id, app)
        else:
            # NO MATCH — lock flips and flip back after delay
            session['streak'][user_id] = 0
            session['flip_locked'] = True

            app = current_app._get_current_object()
            eventlet.spawn_after(1.2, _broadcast_no_match, room_id, first_card_id, card_id, user_id, app)


def _broadcast_match(room_id, card1_id, card2_id, user_id, points, streak, app=None):
    """Broadcast a successful match."""
    ctx = app.app_context() if app else current_app.app_context()
    with ctx:
        session = memory_sessions.get(room_id)
        if not session:
            return

        socketio.emit('memory_match', {
            'card1_id': card1_id,
            'card2_id': card2_id,
            'user_id': user_id,
            'points': points,
            'streak': streak,
            'scores': _build_memory_scoreboard(room_id),
            'matched_pairs': session['matched_pairs'],
            'total_pairs': session['total_pairs'],
        }, room=f'memory_{room_id}', namespace='/memory')


def _broadcast_no_match(room_id, card1_id, card2_id, user_id, app=None):
    """Broadcast a failed match and advance turn."""
    ctx = app.app_context() if app else current_app.app_context()
    with ctx:
        session = memory_sessions.get(room_id)
        if not session:
            return

        # Flip cards back and unlock
        session['board'][card1_id]['flipped'] = False
        session['board'][card2_id]['flipped'] = False
        session['flip_locked'] = False

        socketio.emit('memory_no_match', {
            'card1_id': card1_id,
            'card2_id': card2_id,
            'user_id': user_id,
        }, room=f'memory_{room_id}', namespace='/memory')

        # Advance turn
        _advance_turn(room_id)

        socketio.emit('memory_turn_change', {
            'current_turn': session['current_turn'],
            'scores': _build_memory_scoreboard(room_id),
        }, room=f'memory_{room_id}', namespace='/memory')


def _broadcast_turn(room_id, app=None):
    """Broadcast current turn state."""
    ctx = app.app_context() if app else current_app.app_context()
    with ctx:
        session = memory_sessions.get(room_id)
        if not session:
            return

        socketio.emit('memory_turn_change', {
            'current_turn': session['current_turn'],
            'scores': _build_memory_scoreboard(room_id),
        }, room=f'memory_{room_id}', namespace='/memory')


def _advance_turn(room_id):
    """Move to the next player's turn."""
    session = memory_sessions.get(room_id)
    if not session or not session['turn_order']:
        return
    session['turn_index'] = (session['turn_index'] + 1) % len(session['turn_order'])
    session['current_turn'] = session['turn_order'][session['turn_index']]
    # Reset per-turn powerup tracking so players can use powerups again on their next turn
    session['used_powerups'] = set()


@socketio.on('memory_use_powerup', namespace='/memory')
def handle_memory_use_powerup(data):
    """Use a memory-specific power-up."""
    info = memory_sid_map.get(request.sid)
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

    if powerup_type not in MEMORY_POWERUP_CATALOGUE:
        emit('error', {'message': 'Invalid powerup type'})
        return

    session = memory_sessions.get(room_id)
    if not session:
        emit('error', {'message': 'No active game session'})
        return

    # Must be this player's turn
    if session['current_turn'] != user_id:
        emit('error', {'message': 'Not your turn'})
        return

    # Track usage per turn
    used_key = f'{session["turn_index"]}_{user_id}_{powerup_type}'
    if used_key in session['used_powerups']:
        emit('error', {'message': 'Already used this powerup this turn'})
        return

    # Check inventory
    record = UserPowerup.query.filter_by(user_id=user_id, powerup_type=powerup_type).first()
    if not record or record.quantity < 1:
        emit('error', {'message': 'You do not own this powerup'})
        return

    result = {'powerup_type': powerup_type, 'success': True}

    if powerup_type == 'peek':
        # Briefly reveal 2 random unmatched cards
        unmatched = [c for c in session['board'] if not c['matched'] and not c['flipped']]
        peek_cards = _rnd.sample(unmatched, min(2, len(unmatched)))
        result['peek_cards'] = [{'id': c['id'], 'symbol': c['symbol']} for c in peek_cards]

    elif powerup_type == 'match_reveal':
        # Reveal one complete pair (show both cards of a random unmatched pair)
        unmatched_pairs = {}
        for c in session['board']:
            if not c['matched']:
                unmatched_pairs.setdefault(c['pair_id'], []).append(c)
        # Pick a random pair that has both cards still unmatched
        full_pairs = {pid: cards for pid, cards in unmatched_pairs.items() if len(cards) == 2}
        if full_pairs:
            pair_id = _rnd.choice(list(full_pairs.keys()))
            cards = full_pairs[pair_id]
            result['revealed_pair'] = [{'id': c['id'], 'symbol': c['symbol']} for c in cards]
        else:
            result['success'] = False
            result['message'] = 'No pairs left to reveal'
            emit('memory_powerup_result', result)
            return

    # Deduct from inventory
    record.quantity -= 1
    if record.quantity <= 0:
        db.session.delete(record)
    db.session.commit()

    session['used_powerups'].add(used_key)

    emit('memory_powerup_result', result)


def _get_safe_board(session):
    """Return the board with hidden symbols for non-flipped/non-matched cards."""
    safe = []
    for card in session['board']:
        if card['matched'] or card['flipped']:
            safe.append({
                'id': card['id'],
                'symbol': card['symbol'],
                'flipped': card['flipped'],
                'matched': card['matched'],
            })
        else:
            safe.append({
                'id': card['id'],
                'symbol': None,
                'flipped': False,
                'matched': False,
            })
    return safe


def _build_memory_scoreboard(room_id):
    """Build sorted scoreboard for memory game."""
    session = memory_sessions.get(room_id)
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
                'pairs_found': session['pairs_found'].get(uid, 0),
                'moves': session['move_count'].get(uid, 0),
            })

    scoreboard.sort(key=lambda x: x['score'], reverse=True)
    return scoreboard


def _end_memory_game(room_id, app=None):
    """Finish the memory game, save scores, award XP."""
    ctx = app.app_context() if app else current_app.app_context()
    with ctx:
        session = memory_sessions.get(room_id)
        if not session:
            return

        scoreboard = _build_memory_scoreboard(room_id)

        room = MemoryGameRoom.query.get(room_id)
        if room:
            room.status = 'finished'
            total_players = len(scoreboard)
            for rank_idx, entry in enumerate(scoreboard):
                player = room.players.filter_by(user_id=entry['user_id']).first()
                if player:
                    player.score = entry['score']
                    player.pairs_found = entry['pairs_found']
                # Award XP
                user = User.query.get(entry['user_id'])
                if user:
                    user.xp = (user.xp or 0) + entry['score']
                # Record unified match history
                mh = MatchHistory(
                    user_id=entry['user_id'],
                    game_type='memory',
                    room_id=room.id,
                    room_name=room.name,
                    score=entry['score'],
                    is_winner=(rank_idx == 0),
                    total_players=total_players,
                    rank=rank_idx + 1,
                )
                db.session.add(mh)
            db.session.commit()

        socketio.emit('memory_game_finished', {
            'scoreboard': scoreboard,
            'room_id': room_id,
        }, room=f'memory_{room_id}', namespace='/memory')

        memory_sessions.pop(room_id, None)
