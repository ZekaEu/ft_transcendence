import apiClient from './apiClient'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let gameSocket = null

// ──────────────────────────────────────────────
// REST API calls
// ──────────────────────────────────────────────
export const gameService = {
  // ── Ranking ──────────────────────────────
  getRanking: async (limit = 50) => {
    const response = await apiClient.get('/game/ranking', { params: { limit } })
    return response.data
  },

  // ── Match History ────────────────────────
  getMatchHistory: async (filter = 'all', gameType = 'all') => {
    const params = { filter }
    if (gameType && gameType !== 'all') {
      params.game_type = gameType
    }
    const response = await apiClient.get('/game/history', { params })
    return response.data
  },

  // ── Shop ──────────────────────────────────
  getShopCatalogue: async () => {
    const response = await apiClient.get('/game/shop/catalogue')
    return response.data
  },

  buyPowerup: async (powerup_type, quantity = 1) => {
    const response = await apiClient.post('/game/shop/buy', { powerup_type, quantity })
    return response.data
  },

  getInventory: async () => {
    const response = await apiClient.get('/game/shop/inventory')
    return response.data
  },

  // ── Trivia metadata ───────────────────────
  getCategories: async () => {
    const response = await apiClient.get('/game/trivia/categories')
    return response.data
  },

  // ── Achievements ─────────────────────────
  getAchievements: async () => {
    const response = await apiClient.get('/game/achievements')
    return response.data
  },

  // ── Rooms ────────────────────────────────
  getCurrentRoom: async () => {
    const response = await apiClient.get('/game/rooms/current')
    return response.data
  },

  getRooms: async (mode) => {
    const params = mode ? { mode } : {}
    const response = await apiClient.get('/game/rooms', { params })
    return response.data
  },

  createRoom: async ({ name, game_mode, max_players, friends_only, question_language, question_category, question_difficulty }) => {
    const response = await apiClient.post('/game/rooms', { name, game_mode, max_players, friends_only, question_language, question_category, question_difficulty })
    return response.data
  },

  getRoom: async (roomId) => {
    const response = await apiClient.get(`/game/rooms/${roomId}`)
    return response.data
  },

  joinRoom: async (roomId) => {
    const response = await apiClient.post(`/game/rooms/${roomId}/join`)
    return response.data
  },

  leaveRoom: async (roomId) => {
    const response = await apiClient.post(`/game/rooms/${roomId}/leave`)
    return response.data
  },

  toggleReady: async (roomId) => {
    const response = await apiClient.post(`/game/rooms/${roomId}/ready`)
    return response.data
  },

  startGame: async (roomId) => {
    const response = await apiClient.post(`/game/rooms/${roomId}/start`)
    return response.data
  },

  spectateRoom: async (roomId) => {
    const response = await apiClient.post(`/game/rooms/${roomId}/spectate`)
    return response.data
  },

  // ── Socket.IO (namespace /game) ──────────
  connectSocket: (token) => {
    if (gameSocket?.connected) return gameSocket

    gameSocket = io(`${SOCKET_URL}/game`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    gameSocket.on('connect', () => {
      console.log('[game] socket connected')
    })

    gameSocket.on('connect_error', (err) => {
      console.error('[game] socket connection error:', err.message)
    })

    gameSocket.on('disconnect', (reason) => {
      console.log('[game] socket disconnected:', reason)
    })

    return gameSocket
  },

  disconnectSocket: () => {
    if (gameSocket) {
      gameSocket.disconnect()
      gameSocket = null
    }
  },

  getSocket: () => gameSocket,

  // ── Socket helpers ───────────────────────
  joinGameRoom: (roomId, token, spectator = false) => {
    gameSocket?.emit('join_game_room', { room_id: roomId, token, spectator })
  },

  leaveGameRoom: (roomId) => {
    gameSocket?.emit('leave_game_room', { room_id: roomId })
  },

  emitPlayerReady: (roomId, token) => {
    gameSocket?.emit('player_ready', { room_id: roomId, token })
  },

  emitGameStarted: (roomId) => {
    gameSocket?.emit('game_started', { room_id: roomId })
  },

  submitAnswer: (roomId, answer, timeRemaining, token) => {
    gameSocket?.emit('submit_answer', {
      room_id: roomId,
      answer,
      time_remaining: timeRemaining,
      token,
    })
  },

  emitTimeExpired: (roomId, token) => {
    gameSocket?.emit('time_expired', { room_id: roomId, token })
  },

  usePowerup: (roomId, powerupType, token) => {
    gameSocket?.emit('use_powerup', { room_id: roomId, powerup_type: powerupType, token })
  },

  // ── Event listeners ─────────────────────
  onPlayerJoined: (callback) => {
    gameSocket?.on('player_joined', callback)
  },

  onRoomUpdated: (callback) => {
    gameSocket?.on('room_updated', callback)
  },

  onGameStart: (callback) => {
    gameSocket?.on('game_start', callback)
  },

  onNewQuestion: (callback) => {
    gameSocket?.on('new_question', callback)
  },

  onAnswerResult: (callback) => {
    gameSocket?.on('answer_result', callback)
  },

  onScoreboardUpdate: (callback) => {
    gameSocket?.on('scoreboard_update', callback)
  },

  onGameFinished: (callback) => {
    gameSocket?.on('game_finished', callback)
  },

  onPowerupResult: (callback) => {
    gameSocket?.on('powerup_result', callback)
  },

  onError: (callback) => {
    gameSocket?.on('error', callback)
  },

  // Remove listeners
  offPlayerJoined: () => gameSocket?.off('player_joined'),
  offRoomUpdated: () => gameSocket?.off('room_updated'),
  offGameStart: () => gameSocket?.off('game_start'),
  offNewQuestion: () => gameSocket?.off('new_question'),
  offAnswerResult: () => gameSocket?.off('answer_result'),
  offScoreboardUpdate: () => gameSocket?.off('scoreboard_update'),
  offGameFinished: () => gameSocket?.off('game_finished'),
  offPowerupResult: () => gameSocket?.off('powerup_result'),
  offError: () => gameSocket?.off('error'),
}
