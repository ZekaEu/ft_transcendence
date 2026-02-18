import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { gameService } from '../services/gameService'

const GAME_MODES = ['classic', 'survival', 'timed']
const MODE_ICONS = { classic: 'school', survival: 'favorite', timed: 'timer' }
const MODE_COLORS = {
    classic: 'from-primary-500 to-primary-600',
    survival: 'from-red-500 to-rose-600',
    timed: 'from-amber-500 to-orange-600',
}

function LobbyPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterMode, setFilterMode] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [activeRoom, setActiveRoom] = useState(null)

    // ── Fetch rooms ─────────────────────────
    const fetchRooms = useCallback(async () => {
        try {
            const data = await gameService.getRooms(filterMode || undefined)
            setRooms(data)
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }, [filterMode])

    // ── Restore active room on mount ──────
    useEffect(() => {
        const restore = async () => {
            try {
                const room = await gameService.getCurrentRoom()
                if (room) {
                    setActiveRoom(room)
                    const token = localStorage.getItem('authToken')
                    gameService.joinGameRoom(room.id, token)
                }
            } catch {
                // silent
            }
        }
        restore()
    }, [])

    useEffect(() => {
        fetchRooms()
        const interval = setInterval(fetchRooms, 5000)
        return () => clearInterval(interval)
    }, [fetchRooms])

    // ── Socket connection ───────────────────
    useEffect(() => {
        const token = localStorage.getItem('authToken')
        if (!token) return

        const socket = gameService.connectSocket(token)

        gameService.onPlayerJoined((roomData) => {
            setActiveRoom((prev) => (prev && prev.id === roomData.id ? roomData : prev))
            setRooms((prev) => prev.map((r) => (r.id === roomData.id ? roomData : r)))
        })

        gameService.onRoomUpdated((roomData) => {
            setActiveRoom((prev) => (prev && prev.id === roomData.id ? roomData : prev))
            setRooms((prev) => prev.map((r) => (r.id === roomData.id ? roomData : r)))
        })

        gameService.onGameStart((roomData) => {
            toast.success(t('lobby.gameStarting'))
            setTimeout(() => navigate('/game'), 1500)
        })

        gameService.onError((err) => {
            toast.error(err.message || 'Socket error')
        })

        return () => {
            gameService.offPlayerJoined()
            gameService.offRoomUpdated()
            gameService.offGameStart()
            gameService.offError()
        }
    }, [navigate, t])

    // ── Actions ─────────────────────────────
    const handleJoin = async (roomId) => {
        try {
            const room = await gameService.joinRoom(roomId)
            setActiveRoom(room)
            const token = localStorage.getItem('authToken')
            gameService.joinGameRoom(roomId, token)
            toast.success(t('lobby.joinedRoom'))
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.joinFailed'))
        }
    }

    const handleLeave = async () => {
        if (!activeRoom) return
        try {
            gameService.leaveGameRoom(activeRoom.id)
            await gameService.leaveRoom(activeRoom.id)
            setActiveRoom(null)
            fetchRooms()
            toast.success(t('lobby.leftRoom'))
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error')
        }
    }

    const handleReady = async () => {
        if (!activeRoom) return
        try {
            const room = await gameService.toggleReady(activeRoom.id)
            setActiveRoom(room)
            const token = localStorage.getItem('authToken')
            gameService.emitPlayerReady(activeRoom.id, token)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error')
        }
    }

    const handleStart = async () => {
        if (!activeRoom) return
        try {
            const room = await gameService.startGame(activeRoom.id)
            setActiveRoom(room)
            gameService.emitGameStarted(activeRoom.id)
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.startFailed'))
        }
    }

    const handleCreateRoom = async (data) => {
        try {
            const room = await gameService.createRoom(data)
            setActiveRoom(room)
            setShowCreateModal(false)
            const token = localStorage.getItem('authToken')
            gameService.joinGameRoom(room.id, token)
            fetchRooms()
            toast.success(t('lobby.roomCreated'))
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.createFailed'))
        }
    }

    // If user is inside a room, show the room detail view
    if (activeRoom) {
        return <RoomDetail
            room={activeRoom}
            user={user}
            onLeave={handleLeave}
            onReady={handleReady}
            onStart={handleStart}
            t={t}
        />
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-600">
                        {t('lobby.title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {t('lobby.subtitle')}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary-500/25"
                >
                    <span className="material-icons-round text-xl">add</span>
                    {t('lobby.createRoom')}
                </button>
            </div>

            {/* Mode filters */}
            <div className="flex flex-wrap gap-2">
                <FilterChip
                    label={t('lobby.allModes')}
                    active={filterMode === ''}
                    onClick={() => setFilterMode('')}
                />
                {GAME_MODES.map((mode) => (
                    <FilterChip
                        key={mode}
                        label={t(`home.${mode}`)}
                        icon={MODE_ICONS[mode]}
                        active={filterMode === mode}
                        onClick={() => setFilterMode(mode)}
                    />
                ))}
            </div>

            {/* Room list */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : rooms.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                    <span className="material-icons-round text-6xl text-slate-300 dark:text-slate-600">
                        meeting_room
                    </span>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">
                        {t('lobby.noRooms')}
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
                    >
                        {t('lobby.createFirst')}
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rooms.map((room) => (
                        <RoomCard
                            key={room.id}
                            room={room}
                            onJoin={handleJoin}
                            userId={user?.id}
                            t={t}
                        />
                    ))}
                </div>
            )}

            {/* Create Room Modal */}
            {showCreateModal && (
                <CreateRoomModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateRoom}
                    t={t}
                />
            )}
        </div>
    )
}

// ──────────────────────────────────────────────
// Room Card
// ──────────────────────────────────────────────
function RoomCard({ room, onJoin, userId, t }) {
    const isFull = room.player_count >= room.max_players
    const isInRoom = room.players?.some((p) => p.user_id === userId)
    const modeColor = MODE_COLORS[room.game_mode] || MODE_COLORS.classic

    return (
        <div className="glass rounded-2xl p-5 border border-white/10 hover:border-primary-500/30 transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-slate-800 dark:text-white">
                        {room.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${modeColor} text-white`}>
                        <span className="material-icons-round text-sm">{MODE_ICONS[room.game_mode]}</span>
                        {t(`home.${room.game_mode}`)}
                    </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                    <span className="material-icons-round text-base">people</span>
                    <span className="font-bold">{room.player_count}/{room.max_players}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="material-icons-round text-base">shield</span>
                <span>{t('lobby.host')}: <span className="font-semibold text-slate-700 dark:text-slate-200">{room.host_username}</span></span>
            </div>

            <div className="flex items-center gap-1 mb-4">
                {room.players?.slice(0, 5).map((p) => (
                    <div
                        key={p.user_id}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-900 -ml-1 first:ml-0"
                        title={p.username}
                    >
                        {p.avatar_url ? (
                            <img src={p.avatar_url} alt={p.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            p.username?.charAt(0).toUpperCase()
                        )}
                    </div>
                ))}
                {room.player_count > 5 && (
                    <span className="text-xs text-slate-400 ml-1">+{room.player_count - 5}</span>
                )}
            </div>

            <button
                onClick={() => onJoin(room.id)}
                disabled={isFull || isInRoom}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${isFull
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : isInRoom
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 cursor-default'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:opacity-90 shadow-lg shadow-primary-500/20'
                    }`}
            >
                {isFull ? t('lobby.full') : isInRoom ? t('lobby.joined') : t('lobby.join')}
            </button>
        </div>
    )
}

// ──────────────────────────────────────────────
// Room Detail (inside a room)
// ──────────────────────────────────────────────
function RoomDetail({ room, user, onLeave, onReady, onStart, t }) {
    const isHost = room.host_id === user?.id
    const myPlayer = room.players?.find((p) => p.user_id === user?.id)
    const allReady = room.players?.every((p) => p.is_ready || p.user_id === room.host_id)
    const hasEnoughPlayers = room.player_count >= 2
    const modeColor = MODE_COLORS[room.game_mode] || MODE_COLORS.classic

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <button
                onClick={onLeave}
                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors font-medium"
            >
                <span className="material-icons-round">arrow_back</span>
                {t('lobby.leaveRoom')}
            </button>

            <div className="glass rounded-2xl p-8 border border-white/10 text-center space-y-4">
                <span className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-gradient-to-r ${modeColor} text-white`}>
                    <span className="material-icons-round text-base">{MODE_ICONS[room.game_mode]}</span>
                    {t(`home.${room.game_mode}`)}
                </span>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white">{room.name}</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    {t('lobby.waitingPlayers')} ({room.player_count}/{room.max_players})
                </p>
            </div>

            <div className="space-y-3">
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t('lobby.players')}</h2>
                {room.players?.map((p) => (
                    <div
                        key={p.user_id}
                        className="glass rounded-xl p-4 border border-white/10 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-bold border-2 border-white dark:border-slate-900">
                                {p.avatar_url ? (
                                    <img src={p.avatar_url} alt={p.username} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    p.username?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-white">
                                    {p.display_name || p.username}
                                    {p.user_id === room.host_id && (
                                        <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full">
                                            {t('lobby.host')}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${p.is_ready || p.user_id === room.host_id ? 'text-green-500' : 'text-slate-400'}`}>
                            <span className="material-icons-round text-base">
                                {p.is_ready || p.user_id === room.host_id ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            {p.is_ready || p.user_id === room.host_id ? t('lobby.ready') : t('lobby.notReady')}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                {isHost ? (
                    <button
                        onClick={onStart}
                        disabled={!allReady || !hasEnoughPlayers}
                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${allReady && hasEnoughPlayers
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 shadow-lg shadow-green-500/25'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <span className="material-icons-round">play_arrow</span>
                        {t('lobby.startGame')}
                    </button>
                ) : (
                    <button
                        onClick={onReady}
                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${myPlayer?.is_ready
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 border-2 border-green-500'
                            : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:opacity-90 shadow-lg shadow-primary-500/25'
                            }`}
                    >
                        <span className="material-icons-round">
                            {myPlayer?.is_ready ? 'check_circle' : 'sports_esports'}
                        </span>
                        {myPlayer?.is_ready ? t('lobby.ready') : t('lobby.getReady')}
                    </button>
                )}
                <button
                    onClick={onLeave}
                    className="sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all"
                >
                    {t('lobby.leaveRoom')}
                </button>
            </div>
        </div>
    )
}

// ──────────────────────────────────────────────
// Create Room Modal
// ──────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreate, t }) {
    const [name, setName] = useState('')
    const [gameMode, setGameMode] = useState('classic')
    const [maxPlayers, setMaxPlayers] = useState(4)
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        setSubmitting(true)
        await onCreate({ name: name.trim(), game_mode: gameMode, max_players: maxPlayers })
        setSubmitting(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl mx-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {t('lobby.createRoom')}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                            {t('lobby.roomName')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('lobby.roomNamePlaceholder')}
                            maxLength={60}
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                            {t('lobby.gameMode')}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {GAME_MODES.map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setGameMode(mode)}
                                    className={`py-3 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-1 ${gameMode === mode
                                        ? `bg-gradient-to-r ${MODE_COLORS[mode]} text-white shadow-lg`
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <span className="material-icons-round text-lg">{MODE_ICONS[mode]}</span>
                                    {t(`home.${mode}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                            {t('lobby.maxPlayers')}: {maxPlayers}
                        </label>
                        <input
                            type="range"
                            min={2}
                            max={8}
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(Number(e.target.value))}
                            className="w-full accent-primary-500"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>2</span>
                            <span>8</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim() || submitting}
                        className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25"
                    >
                        {submitting ? t('lobby.creating') : t('lobby.createRoom')}
                    </button>
                </form>
            </div>
        </div>
    )
}

// ──────────────────────────────────────────────
// Filter chip
// ──────────────────────────────────────────────
function FilterChip({ label, icon, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${active
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
        >
            {icon && <span className="material-icons-round text-base">{icon}</span>}
            {label}
        </button>
    )
}

export default LobbyPage
