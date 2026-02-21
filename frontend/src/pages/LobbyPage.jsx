import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { gameService } from '../services/gameService'
import { memoryService } from '../services/memoryService'

const THEME_ICONS = {
    animals: '🐶', food: '🍕', sports: '⚽', space: '🚀', music: '🎵', flags: '🏳️',
}
const SIZE_LABELS = { small: '4×4', medium: '4×6', large: '5×6' }
const SIZE_COLORS = {
    small: 'from-green-500 to-emerald-600',
    medium: 'from-amber-500 to-orange-600',
    large: 'from-red-500 to-rose-600',
}
const SIZE_ICONS = { small: 'grid_3x3', medium: 'grid_4x4', large: 'grid_on' }

function LobbyPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [triviaRooms, setTriviaRooms] = useState([])
    const [memoryRooms, setMemoryRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [activeRoom, setActiveRoom] = useState(null)
    const [activeRoomType, setActiveRoomType] = useState(null)
    const [filterMode, setFilterMode] = useState('all')

    const allRooms = [
        ...triviaRooms.map((r) => ({ ...r, _type: 'trivia' })),
        ...memoryRooms.map((r) => ({ ...r, _type: 'memory' })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const filteredRooms = filterMode === 'all'
        ? allRooms
        : allRooms.filter((r) => r._type === filterMode)

    const fetchRooms = useCallback(async () => {
        try {
            const [trivia, memory] = await Promise.all([
                gameService.getRooms(),
                memoryService.getRooms(),
            ])
            setTriviaRooms(trivia || [])
            setMemoryRooms(memory || [])
        } catch {
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const restore = async () => {
            try {
                const triviaRoom = await gameService.getCurrentRoom()
                if (triviaRoom) {
                    setActiveRoom(triviaRoom)
                    setActiveRoomType('trivia')
                    const token = localStorage.getItem('authToken')
                    gameService.connectSocket(token)
                    gameService.joinGameRoom(triviaRoom.id, token)
                    return
                }
                const memoryRoom = await memoryService.getCurrentRoom()
                if (memoryRoom) {
                    setActiveRoom(memoryRoom)
                    setActiveRoomType('memory')
                    const token = localStorage.getItem('authToken')
                    memoryService.connectSocket(token)
                    memoryService.joinMemoryRoom(memoryRoom.id, token)
                }
            } catch {
            }
        }
        restore()
    }, [])

    useEffect(() => {
        fetchRooms()
        const interval = setInterval(fetchRooms, 5000)
        return () => clearInterval(interval)
    }, [fetchRooms])

    useEffect(() => {
        const token = localStorage.getItem('authToken')
        if (!token) return
        gameService.connectSocket(token)
        gameService.onPlayerJoined((roomData) => {
            setActiveRoom((prev) => (prev && activeRoomType === 'trivia' && prev.id === roomData.id ? roomData : prev))
            setTriviaRooms((prev) => prev.map((r) => (r.id === roomData.id ? roomData : r)))
        })
        gameService.onRoomUpdated((roomData) => {
            setActiveRoom((prev) => (prev && activeRoomType === 'trivia' && prev.id === roomData.id ? roomData : prev))
            setTriviaRooms((prev) => prev.map((r) => (r.id === roomData.id ? roomData : r)))
        })
        gameService.onGameStart(() => {
            toast.success(t('lobby.gameStarting'))
            setTimeout(() => navigate('/game'), 1500)
        })
        gameService.onError((err) => { toast.error(err.message || 'Socket error') })
        return () => {
            gameService.offPlayerJoined()
            gameService.offRoomUpdated()
            gameService.offGameStart()
            gameService.offError()
        }
    }, [navigate, t, activeRoomType])

    useEffect(() => {
        const token = localStorage.getItem('authToken')
        if (!token) return
        memoryService.connectSocket(token)
        memoryService.onPlayerJoined((roomData) => {
            setActiveRoom((prev) => (prev && activeRoomType === 'memory' && prev.id === roomData.id ? roomData : prev))
            setMemoryRooms((prev) => prev.map((r) => (r.id === roomData.id ? roomData : r)))
        })
        memoryService.onRoomUpdated((roomData) => {
            setActiveRoom((prev) => (prev && activeRoomType === 'memory' && prev.id === roomData.id ? roomData : prev))
            setMemoryRooms((prev) => prev.map((r) => (r.id === roomData.id ? roomData : r)))
        })
        memoryService.onGameStart(() => {
            toast.success(t('lobby.gameStarting'))
            setTimeout(() => navigate('/memory/play'), 1500)
        })
        memoryService.onError((err) => { toast.error(err.message || 'Socket error') })
        return () => {
            memoryService.offPlayerJoined()
            memoryService.offRoomUpdated()
            memoryService.offGameStart()
            memoryService.offError()
        }
    }, [navigate, t, activeRoomType])

    const handleJoin = async (room) => {
        const type = room._type
        try {
            let joined
            if (type === 'trivia') {
                joined = await gameService.joinRoom(room.id)
                const token = localStorage.getItem('authToken')
                gameService.joinGameRoom(room.id, token)
            } else {
                joined = await memoryService.joinRoom(room.id)
                const token = localStorage.getItem('authToken')
                memoryService.joinMemoryRoom(room.id, token)
            }
            setActiveRoom(joined)
            setActiveRoomType(type)
            toast.success(t('lobby.joinedRoom'))
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.joinFailed'))
        }
    }

    const handleLeave = async () => {
        if (!activeRoom || !activeRoomType) return
        try {
            if (activeRoomType === 'trivia') {
                gameService.leaveGameRoom(activeRoom.id)
                await gameService.leaveRoom(activeRoom.id)
            } else {
                memoryService.leaveMemoryRoom(activeRoom.id)
                await memoryService.leaveRoom(activeRoom.id)
            }
            setActiveRoom(null)
            setActiveRoomType(null)
            fetchRooms()
            toast.success(t('lobby.leftRoom'))
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error')
        }
    }

    const handleReady = async () => {
        if (!activeRoom || !activeRoomType) return
        try {
            let room
            if (activeRoomType === 'trivia') {
                room = await gameService.toggleReady(activeRoom.id)
                const token = localStorage.getItem('authToken')
                gameService.emitPlayerReady(activeRoom.id, token)
            } else {
                room = await memoryService.toggleReady(activeRoom.id)
                const token = localStorage.getItem('authToken')
                memoryService.emitPlayerReady(activeRoom.id, token)
            }
            setActiveRoom(room)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error')
        }
    }

    const handleStart = async () => {
        if (!activeRoom || !activeRoomType) return
        try {
            let room
            if (activeRoomType === 'trivia') {
                room = await gameService.startGame(activeRoom.id)
                gameService.emitGameStarted(activeRoom.id)
            } else {
                room = await memoryService.startGame(activeRoom.id)
                memoryService.emitGameStarted(activeRoom.id)
            }
            setActiveRoom(room)
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.startFailed'))
        }
    }

    const handleCreateRoom = async (data) => {
        const { _gameType, ...roomData } = data
        try {
            let room
            if (_gameType === 'trivia') {
                room = await gameService.createRoom(roomData)
                const token = localStorage.getItem('authToken')
                gameService.joinGameRoom(room.id, token)
                setActiveRoomType('trivia')
            } else {
                room = await memoryService.createRoom(roomData)
                const token = localStorage.getItem('authToken')
                memoryService.joinMemoryRoom(room.id, token)
                setActiveRoomType('memory')
            }
            setActiveRoom(room)
            setShowCreateModal(false)
            fetchRooms()
            toast.success(t('lobby.roomCreated'))
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.createFailed'))
        }
    }

    const handleSpectate = async (room) => {
        const type = room._type
        try {
            if (type === 'trivia') {
                await gameService.spectateRoom(room.id)
                navigate(`/game?spectate=${room.id}`)
            } else {
                await memoryService.spectateRoom(room.id)
                navigate(`/memory/play?spectate=${room.id}`)
            }
        } catch (err) {
            toast.error(err.response?.data?.message || t('lobby.spectateFailed'))
        }
    }

    if (activeRoom && activeRoomType) {
        return <RoomDetail
            room={activeRoom}
            roomType={activeRoomType}
            user={user}
            onLeave={handleLeave}
            onReady={handleReady}
            onStart={handleStart}
            t={t}
        />
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-indigo-600">
                        {t('lobby.title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t('lobby.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary-500/25"
                >
                    <span className="material-icons-round text-xl">add</span>
                    {t('lobby.createRoom')}
                </button>
            </div>

            <div className="flex gap-2">
                {[
                    { key: 'all', icon: 'apps', label: t('lobby.allGames') },
                    { key: 'trivia', icon: 'quiz', label: t('lobby.trivia') },
                    { key: 'memory', icon: 'grid_view', label: t('lobby.memory') },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilterMode(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            filterMode === tab.key
                                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span className="material-icons-round text-base">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredRooms.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                    <span className="material-icons-round text-6xl text-slate-300 dark:text-slate-600">meeting_room</span>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">{t('lobby.noRooms')}</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
                    >
                        {t('lobby.createFirst')}
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredRooms.map((room) => (
                        <RoomCard
                            key={`${room._type}_${room.id}`}
                            room={room}
                            onJoin={() => handleJoin(room)}
                            onSpectate={() => handleSpectate(room)}
                            userId={user?.id}
                            t={t}
                        />
                    ))}
                </div>
            )}

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

const CATEGORY_ICONS = {
    any: 'shuffle', science: 'science', geography: 'public', history: 'history_edu',
    art: 'palette', music: 'music_note', sports: 'sports_soccer', literature: 'menu_book',
    movies: 'movie', technology: 'computer', math: 'calculate', nature: 'park',
    food: 'restaurant', gaming: 'sports_esports', pop_culture: 'star', languages: 'translate',
}
const DIFFICULTY_ICONS = { any: 'shuffle', easy: 'sentiment_satisfied', medium: 'sentiment_neutral', hard: 'sentiment_very_dissatisfied' }
const DIFFICULTY_COLORS = {
    any: 'from-slate-400 to-slate-500',
    easy: 'from-green-500 to-emerald-600',
    medium: 'from-amber-500 to-orange-600',
    hard: 'from-red-500 to-rose-600',
}
const TYPE_STYLES = {
    trivia: {
        accent: 'from-primary-500 to-primary-600',
        border: 'hover:border-primary-500/30',
        avatar: 'from-primary-400 to-secondary-400',
        btn: 'from-primary-500 to-primary-600 shadow-primary-500/20',
        icon: 'quiz',
    },
    memory: {
        accent: 'from-emerald-500 to-teal-600',
        border: 'hover:border-emerald-500/30',
        avatar: 'from-emerald-400 to-teal-400',
        btn: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
        icon: 'grid_view',
    },
}

function RoomCard({ room, onJoin, onSpectate, userId, t }) {
    const isFull = room.player_count >= room.max_players
    const isInRoom = room.players?.some((p) => p.user_id === userId)
    const isPlaying = room.status === 'playing'
    const type = room._type
    const style = TYPE_STYLES[type]

    return (
        <div className={`glass rounded-2xl p-5 border border-white/10 ${style.border} transition-all group`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-slate-800 dark:text-white">{room.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${style.accent} text-white`}>
                            <span className="material-icons-round text-sm">{style.icon}</span>
                            {type === 'trivia' ? t('lobby.trivia') : t('lobby.memory')}
                        </span>
                        {isPlaying && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white animate-pulse">
                                <span className="material-icons-round text-sm">play_circle</span>
                                {t('lobby.inProgress')}
                            </span>
                        )}
                        {type === 'trivia' && (
                            <>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    <span className="material-icons-round text-sm">{CATEGORY_ICONS[room.question_category] || 'quiz'}</span>
                                    {t(`lobby.cat_${room.question_category}`, { defaultValue: room.question_category || 'Any' })}
                                </span>
                                {room.question_difficulty && room.question_difficulty !== 'any' && (
                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${DIFFICULTY_COLORS[room.question_difficulty] || DIFFICULTY_COLORS.any} text-white`}>
                                        <span className="material-icons-round text-sm">{DIFFICULTY_ICONS[room.question_difficulty] || 'help'}</span>
                                        {t(`lobby.diff_${room.question_difficulty}`, { defaultValue: room.question_difficulty })}
                                    </span>
                                )}
                            </>
                        )}
                        {type === 'memory' && (
                            <>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    <span className="text-sm">{THEME_ICONS[room.theme] || '🃏'}</span>
                                    {t(`memory.theme_${room.theme}`, { defaultValue: room.theme })}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${SIZE_COLORS[room.board_size] || SIZE_COLORS.medium} text-white`}>
                                    <span className="material-icons-round text-sm">{SIZE_ICONS[room.board_size] || 'grid_view'}</span>
                                    {SIZE_LABELS[room.board_size] || room.board_size}
                                </span>
                            </>
                        )}
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
                    <div
                        key={p.user_id}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${style.avatar} flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-900 -ml-1 first:ml-0`}
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
            {isPlaying ? (
                <button onClick={onSpectate} className="w-full py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
                    <span className="material-icons-round text-base">visibility</span>
                    {t('lobby.spectate')}
                </button>
            ) : (
                <button
                    onClick={onJoin}
                    disabled={isFull || isInRoom}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${isFull
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : isInRoom
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 cursor-default'
                            : `bg-gradient-to-r ${style.btn} text-white hover:opacity-90 shadow-lg`
                    }`}
                >
                    {isFull ? t('lobby.full') : isInRoom ? t('lobby.joined') : t('lobby.join')}
                </button>
            )}
        </div>
    )
}

function RoomDetail({ room, roomType, user, onLeave, onReady, onStart, t }) {
    const isHost = room.host_id === user?.id
    const myPlayer = room.players?.find((p) => p.user_id === user?.id)
    const allReady = room.players?.every((p) => p.is_ready || p.user_id === room.host_id)
    const hasEnoughPlayers = room.player_count >= 2
    const style = TYPE_STYLES[roomType]

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <button onClick={onLeave} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors font-medium">
                <span className="material-icons-round">arrow_back</span>
                {t('lobby.leaveRoom')}
            </button>
            <div className="glass rounded-2xl p-8 border border-white/10 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-gradient-to-r ${style.accent} text-white`}>
                        <span className="material-icons-round text-base">{style.icon}</span>
                        {roomType === 'trivia' ? t('lobby.trivia') : t('lobby.memory')}
                    </span>
                    {roomType === 'trivia' && (
                        <>
                            <span className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <span className="material-icons-round text-base">{CATEGORY_ICONS[room.question_category] || 'quiz'}</span>
                                {t(`lobby.cat_${room.question_category}`, { defaultValue: room.question_category || 'Any' })}
                            </span>
                            {room.question_difficulty && room.question_difficulty !== 'any' && (
                                <span className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-gradient-to-r ${DIFFICULTY_COLORS[room.question_difficulty] || DIFFICULTY_COLORS.any} text-white`}>
                                    <span className="material-icons-round text-base">{DIFFICULTY_ICONS[room.question_difficulty] || 'help'}</span>
                                    {t(`lobby.diff_${room.question_difficulty}`, { defaultValue: room.question_difficulty })}
                                </span>
                            )}
                        </>
                    )}
                    {roomType === 'memory' && (
                        <>
                            <span className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <span>{THEME_ICONS[room.theme] || '🃏'}</span>
                                {t(`memory.theme_${room.theme}`, { defaultValue: room.theme })}
                            </span>
                            <span className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-gradient-to-r ${SIZE_COLORS[room.board_size] || SIZE_COLORS.medium} text-white`}>
                                <span className="material-icons-round text-base">{SIZE_ICONS[room.board_size] || 'grid_view'}</span>
                                {SIZE_LABELS[room.board_size] || room.board_size}
                            </span>
                        </>
                    )}
                </div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white">{room.name}</h1>
                <p className="text-slate-500 dark:text-slate-400">{t('lobby.waitingPlayers')} ({room.player_count}/{room.max_players})</p>
            </div>
            <div className="space-y-3">
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t('lobby.players')}</h2>
                {room.players?.map((p) => (
                    <div key={p.user_id} className="glass rounded-xl p-4 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${style.avatar} flex items-center justify-center text-white font-bold border-2 border-white dark:border-slate-900`}>
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
                                        <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full">{t('lobby.host')}</span>
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
                            : `bg-gradient-to-r ${style.accent} text-white hover:opacity-90 shadow-lg`
                        }`}
                    >
                        <span className="material-icons-round">{myPlayer?.is_ready ? 'check_circle' : 'sports_esports'}</span>
                        {myPlayer?.is_ready ? t('lobby.ready') : t('lobby.getReady')}
                    </button>
                )}
                <button onClick={onLeave} className="sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all">
                    {t('lobby.leaveRoom')}
                </button>
            </div>
        </div>
    )
}

function CreateRoomModal({ onClose, onCreate, t }) {
    const [gameType, setGameType] = useState('trivia')
    const [name, setName] = useState('')
    const [maxPlayers, setMaxPlayers] = useState(4)
    const [friendsOnly, setFriendsOnly] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [category, setCategory] = useState('any')
    const [difficulty, setDifficulty] = useState('any')
    const [categories, setCategories] = useState([])
    const [difficulties, setDifficulties] = useState([])
    const [loadingTriviaMeta, setLoadingTriviaMeta] = useState(true)
    const [boardSize, setBoardSize] = useState('medium')
    const [theme, setTheme] = useState('animals')
    const [themes, setThemes] = useState([])
    const [sizes, setSizes] = useState([])
    const [loadingMemoryMeta, setLoadingMemoryMeta] = useState(true)

    useEffect(() => {
        const fetchTriviaMeta = async () => {
            try {
                const data = await gameService.getCategories()
                setCategories(data.categories || [])
                setDifficulties(data.difficulties || [])
            } catch {
                setCategories([{ key: 'any', label: 'Any' }])
                setDifficulties(['any', 'easy', 'medium', 'hard'])
            } finally { setLoadingTriviaMeta(false) }
        }
        fetchTriviaMeta()
    }, [])

    useEffect(() => {
        const fetchMemoryMeta = async () => {
            try {
                const data = await memoryService.getMeta()
                setThemes(data.themes || [])
                setSizes(data.board_sizes || [])
            } catch {
                setThemes([{ key: 'animals', label: 'Animals' }])
                setSizes([{ key: 'medium', label: 'Medium' }])
            } finally { setLoadingMemoryMeta(false) }
        }
        fetchMemoryMeta()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        setSubmitting(true)
        if (gameType === 'trivia') {
            const currentLang = i18n.language
            await onCreate({ _gameType: 'trivia', name: name.trim(), game_mode: 'classic', max_players: maxPlayers, friends_only: friendsOnly, question_language: currentLang, question_category: category, question_difficulty: difficulty })
        } else {
            await onCreate({ _gameType: 'memory', name: name.trim(), max_players: maxPlayers, board_size: boardSize, theme, friends_only: friendsOnly })
        }
        setSubmitting(false)
    }

    const maxRange = gameType === 'trivia' ? 8 : 6

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('lobby.createRoom')}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{t('lobby.gameMode')}</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setGameType('trivia')}
                                className={`py-4 rounded-xl font-bold transition-all flex flex-col items-center gap-2 ${gameType === 'trivia' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg ring-2 ring-primary-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                <span className="material-icons-round text-3xl">quiz</span>
                                <span className="text-sm">{t('lobby.trivia')}</span>
                            </button>
                            <button type="button" onClick={() => setGameType('memory')}
                                className={`py-4 rounded-xl font-bold transition-all flex flex-col items-center gap-2 ${gameType === 'memory' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg ring-2 ring-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                <span className="material-icons-round text-3xl">grid_view</span>
                                <span className="text-sm">{t('lobby.memory')}</span>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{t('lobby.roomName')}</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder={gameType === 'trivia' ? t('lobby.roomNamePlaceholder') : t('memory.roomNamePlaceholder')}
                            maxLength={60} autoFocus
                            className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${gameType === 'trivia' ? 'focus:ring-primary-500' : 'focus:ring-emerald-500'}`}
                        />
                    </div>
                    {gameType === 'trivia' && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{t('lobby.category')}</label>
                                {loadingTriviaMeta ? (
                                    <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {categories.map((cat) => (
                                            <button key={cat.key} type="button" onClick={() => setCategory(cat.key)}
                                                className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${category === cat.key ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                                <span className="material-icons-round text-lg">{CATEGORY_ICONS[cat.key] || 'category'}</span>
                                                {t(`lobby.cat_${cat.key}`, { defaultValue: cat.label })}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{t('lobby.difficulty')}</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {difficulties.map((diff) => (
                                        <button key={diff} type="button" onClick={() => setDifficulty(diff)}
                                            className={`py-2.5 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-1 ${difficulty === diff ? `bg-gradient-to-r ${DIFFICULTY_COLORS[diff] || DIFFICULTY_COLORS.any} text-white shadow-lg` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                            <span className="material-icons-round text-lg">{DIFFICULTY_ICONS[diff] || 'help'}</span>
                                            {t(`lobby.diff_${diff}`, { defaultValue: diff.charAt(0).toUpperCase() + diff.slice(1) })}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    {gameType === 'memory' && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{t('memory.theme')}</label>
                                {loadingMemoryMeta ? (
                                    <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {themes.map((th) => (
                                            <button key={th.key} type="button" onClick={() => setTheme(th.key)}
                                                className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-1 ${theme === th.key ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                                <span className="text-2xl">{THEME_ICONS[th.key] || '🃏'}</span>
                                                {t(`memory.theme_${th.key}`, { defaultValue: th.label })}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{t('memory.boardSize')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {sizes.map((s) => (
                                        <button key={s.key} type="button" onClick={() => setBoardSize(s.key)}
                                            className={`py-3 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-1 ${boardSize === s.key ? `bg-gradient-to-r ${SIZE_COLORS[s.key] || SIZE_COLORS.medium} text-white shadow-lg` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                            <span className="material-icons-round text-lg">{SIZE_ICONS[s.key] || 'grid_view'}</span>
                                            {SIZE_LABELS[s.key] || s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{t('lobby.maxPlayers')}: {maxPlayers}</label>
                        <input type="range" min={2} max={maxRange} value={Math.min(maxPlayers, maxRange)}
                            onChange={(e) => setMaxPlayers(Number(e.target.value))}
                            className={`w-full ${gameType === 'trivia' ? 'accent-primary-500' : 'accent-emerald-500'}`}
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1"><span>2</span><span>{maxRange}</span></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setFriendsOnly(!friendsOnly)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${friendsOnly ? (gameType === 'trivia' ? 'bg-primary-500' : 'bg-emerald-500') : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${friendsOnly ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <span className="material-icons-round text-base">group</span>
                            {t('lobby.friendsOnly')}
                        </label>
                    </div>
                    <button type="submit" disabled={!name.trim() || submitting}
                        className={`w-full py-3 bg-gradient-to-r ${gameType === 'trivia' ? 'from-primary-500 to-primary-600 shadow-primary-500/25' : 'from-emerald-500 to-teal-600 shadow-emerald-500/25'} text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}>
                        {submitting ? t('lobby.creating') : t('lobby.createRoom')}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default LobbyPage
