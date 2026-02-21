import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { memoryService } from '../services/memoryService'

const THEME_ICONS = {
    animals: '🐶', food: '🍕', sports: '⚽', space: '🚀', music: '🎵', flags: '🏳️',
}

const SIZE_LABELS = { small: '4×4', medium: '4×6', large: '5×6' }

function MemoryLobbyPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [activeRoom, setActiveRoom] = useState(null)

    const fetchRooms = useCallback(async () => {
        try {
            const data = await memoryService.getRooms()
            setRooms(data)
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const restore = async () => {
            try {
                const room = await memoryService.getCurrentRoom()
                if (room) {
                    setActiveRoom(room)
                    const token = localStorage.getItem('authToken')
                    memoryService.joinMemoryRoom(room.id, token)
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

    // Socket
    useEffect(() => {
        const token = localStorage.getItem('authToken')
        if (!token) return

        memoryService.connectSocket(token)

        memoryService.onPlayerJoined((roomData) => {
            setActiveRoom((prev) => (prev && prev.id === roomData.id ? roomData : prev))
            setRooms((prev) => prev.map((r) => (r.id === roomData.id ? roomData : r)))
        })

        memoryService.onRoomUpdated((roomData) => {
            setActiveRoom((prev) => (prev && prev.id === roomData.id ? roomData : prev))
            setRooms((prev) => prev.map((r) => (r.id === roomData.id ? roomData : r)))
        })

        memoryService.onGameStart((roomData) => {
            toast.success(t('memory.gameStarting'))
            setTimeout(() => navigate('/memory/play'), 1500)
        })

        memoryService.onError((err) => {
            toast.error(err.message || 'Socket error')
        })

        return () => {
            memoryService.offPlayerJoined()
            memoryService.offRoomUpdated()
            memoryService.offGameStart()
            memoryService.offError()
        }
    }, [navigate, t])

    const handleJoin = async (roomId) => {
        try {
            const room = await memoryService.joinRoom(roomId)
            setActiveRoom(room)
            const token = localStorage.getItem('authToken')
            memoryService.joinMemoryRoom(roomId, token)
            toast.success(t('lobby.joinedRoom'))
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.joinFailed'))
        }
    }

    const handleLeave = async () => {
        if (!activeRoom) return
        try {
            memoryService.leaveMemoryRoom(activeRoom.id)
            await memoryService.leaveRoom(activeRoom.id)
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
            const room = await memoryService.toggleReady(activeRoom.id)
            setActiveRoom(room)
            const token = localStorage.getItem('authToken')
            memoryService.emitPlayerReady(activeRoom.id, token)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error')
        }
    }

    const handleStart = async () => {
        if (!activeRoom) return
        try {
            const room = await memoryService.startGame(activeRoom.id)
            setActiveRoom(room)
            memoryService.emitGameStarted(activeRoom.id)
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.startFailed'))
        }
    }

    const handleCreateRoom = async (data) => {
        try {
            const room = await memoryService.createRoom(data)
            setActiveRoom(room)
            setShowCreateModal(false)
            const token = localStorage.getItem('authToken')
            memoryService.joinMemoryRoom(room.id, token)
            fetchRooms()
            toast.success(t('lobby.roomCreated'))
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.createFailed'))
        }
    }

    const handleSpectate = async (roomId) => {
        try {
            const room = await memoryService.spectateRoom(roomId)
            navigate(`/memory/play?spectate=${room.id}`)
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.spectateFailed'))
        }
    }

    if (activeRoom) {
        return <MemoryRoomDetail
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
                    <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">
                        {t('memory.lobbyTitle')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {t('memory.lobbySubtitle')}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25"
                >
                    <span className="material-icons-round text-xl">add</span>
                    {t('lobby.createRoom')}
                </button>
            </div>

            {/* Room list */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : rooms.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                    <span className="text-6xl">🧠</span>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">
                        {t('lobby.noRooms')}
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition"
                    >
                        {t('lobby.createFirst')}
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rooms.map((room) => (
                        <MemoryRoomCard
                            key={room.id}
                            room={room}
                            onJoin={handleJoin}
                            onSpectate={handleSpectate}
                            userId={user?.id}
                            t={t}
                        />
                    ))}
                </div>
            )}

            {showCreateModal && (
                <CreateMemoryRoomModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateRoom}
                    t={t}
                />
            )}
        </div>
    )
}


function MemoryRoomCard({ room, onJoin, onSpectate, userId, t }) {
    const isFull = room.player_count >= room.max_players
    const isInRoom = room.players?.some((p) => p.user_id === userId)
    const isPlaying = room.status === 'playing'

    return (
        <div className="glass rounded-2xl p-5 border border-white/10 hover:border-emerald-500/30 transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-slate-800 dark:text-white">
                        {room.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {isPlaying && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white animate-pulse">
                                <span className="material-icons-round text-sm">play_circle</span>
                                {t('lobby.inProgress')}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                            <span className="text-sm">{THEME_ICONS[room.theme] || '🎴'}</span>
                            {t(`memory.theme_${room.theme}`, { defaultValue: room.theme })}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {SIZE_LABELS[room.board_size] || room.board_size}
                        </span>
                        {room.friends_only && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                <span className="material-icons-round text-sm">group</span>
                                {t('lobby.friendsOnly')}
                            </span>
                        )}
                    </div>
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
                    <div key={p.user_id} className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-900 -ml-1 first:ml-0" title={p.username}>
                        {p.avatar_url ? (
                            <img src={p.avatar_url} alt={p.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            p.username?.charAt(0).toUpperCase()
                        )}
                    </div>
                ))}
            </div>

            {isPlaying ? (
                <button
                    onClick={() => onSpectate(room.id)}
                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                    <span className="material-icons-round text-base">visibility</span>
                    {t('lobby.spectate')}
                </button>
            ) : (
                <button
                    onClick={() => onJoin(room.id)}
                    disabled={isFull || isInRoom}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${isFull
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : isInRoom
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 cursor-default'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 shadow-lg shadow-emerald-500/20'
                    }`}
                >
                    {isFull ? t('lobby.full') : isInRoom ? t('lobby.joined') : t('lobby.join')}
                </button>
            )}
        </div>
    )
}


function MemoryRoomDetail({ room, user, onLeave, onReady, onStart, t }) {
    const isHost = room.host_id === user?.id
    const myPlayer = room.players?.find((p) => p.user_id === user?.id)
    const allReady = room.players?.every((p) => p.is_ready || p.user_id === room.host_id)
    const hasEnoughPlayers = room.player_count >= 2

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <button onClick={onLeave} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors font-medium">
                <span className="material-icons-round">arrow_back</span>
                {t('lobby.leaveRoom')}
            </button>

            <div className="glass rounded-2xl p-8 border border-white/10 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                        <span>{THEME_ICONS[room.theme] || '🎴'}</span>
                        {t(`memory.theme_${room.theme}`, { defaultValue: room.theme })}
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        📐 {SIZE_LABELS[room.board_size] || room.board_size}
                    </span>
                </div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white">{room.name}</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    {t('lobby.waitingPlayers')} ({room.player_count}/{room.max_players})
                </p>
            </div>

            <div className="space-y-3">
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t('lobby.players')}</h2>
                {room.players?.map((p) => (
                    <div key={p.user_id} className="glass rounded-xl p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white font-bold border-2 border-white dark:border-slate-900">
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
                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 shadow-lg shadow-emerald-500/25'
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


function CreateMemoryRoomModal({ onClose, onCreate, t }) {
    const [name, setName] = useState('')
    const [maxPlayers, setMaxPlayers] = useState(4)
    const [friendsOnly, setFriendsOnly] = useState(false)
    const [boardSize, setBoardSize] = useState('medium')
    const [theme, setTheme] = useState('animals')
    const [submitting, setSubmitting] = useState(false)
    const [themes, setThemes] = useState([])
    const [sizes, setSizes] = useState([])
    const [loadingMeta, setLoadingMeta] = useState(true)

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const data = await memoryService.getMeta()
                setThemes(data.themes || [])
                setSizes(data.board_sizes || [])
            } catch {
                setThemes([{ key: 'animals', label: 'Animals' }])
                setSizes([{ key: 'medium', label: 'Medium' }])
            } finally {
                setLoadingMeta(false)
            }
        }
        fetchMeta()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        setSubmitting(true)
        await onCreate({
            name: name.trim(),
            max_players: maxPlayers,
            board_size: boardSize,
            theme,
            friends_only: friendsOnly,
        })
        setSubmitting(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {t('memory.createRoom')}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Room name */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                            {t('lobby.roomName')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('memory.roomNamePlaceholder')}
                            maxLength={60}
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            autoFocus
                        />
                    </div>

                    {/* Theme */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                            {t('memory.theme')}
                        </label>
                        {loadingMeta ? (
                            <div className="flex justify-center py-4">
                                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {themes.map((th) => (
                                    <button
                                        key={th.key}
                                        type="button"
                                        onClick={() => setTheme(th.key)}
                                        className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-1 ${theme === th.key
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <span className="text-2xl">{THEME_ICONS[th.key] || '🎴'}</span>
                                        {t(`memory.theme_${th.key}`, { defaultValue: th.label })}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Board size */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                            {t('memory.boardSize')}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {sizes.map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => setBoardSize(s.key)}
                                    className={`py-3 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-1 ${boardSize === s.key
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <span className="text-lg">📐</span>
                                    {SIZE_LABELS[s.key] || s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Max players */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                            {t('lobby.maxPlayers')}: {maxPlayers}
                        </label>
                        <input
                            type="range"
                            min={2}
                            max={6}
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(Number(e.target.value))}
                            className="w-full accent-emerald-500"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>2</span>
                            <span>6</span>
                        </div>
                    </div>

                    {/* Friends only */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setFriendsOnly(!friendsOnly)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${friendsOnly ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${friendsOnly ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <span className="material-icons-round text-base">group</span>
                            {t('lobby.friendsOnly')}
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim() || submitting}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
                    >
                        {submitting ? t('lobby.creating') : t('lobby.createRoom')}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default MemoryLobbyPage
