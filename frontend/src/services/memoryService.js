import apiClient from './apiClient'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let memorySocket = null

// ──────────────────────────────────────────────
// REST API calls
// ──────────────────────────────────────────────
export const memoryService = {
  // ── Meta ──────────────────────────────────
  getMeta: async () => {
    const response = await apiClient.get('/memory/meta')
    return response.data
  },

  // ── Rooms ────────────────────────────────
  getCurrentRoom: async () => {
    const response = await apiClient.get('/memory/rooms/current')
    return response.data
  },

  getRooms: async () => {
    const response = await apiClient.get('/memory/rooms')
    return response.data
  },

  createRoom: async ({ name, max_players, board_size, theme, friends_only }) => {
    const response = await apiClient.post('/memory/rooms', { name, max_players, board_size, theme, friends_only })
    return response.data
  },

  getRoom: async (roomId) => {
    const response = await apiClient.get(`/memory/rooms/${roomId}`)
    return response.data
  },

  joinRoom: async (roomId) => {
    const response = await apiClient.post(`/memory/rooms/${roomId}/join`)
    return response.data
  },

  leaveRoom: async (roomId) => {
    const response = await apiClient.post(`/memory/rooms/${roomId}/leave`)
    return response.data
  },

  toggleReady: async (roomId) => {
    const response = await apiClient.post(`/memory/rooms/${roomId}/ready`)
    return response.data
  },

  startGame: async (roomId) => {
    const response = await apiClient.post(`/memory/rooms/${roomId}/start`)
    return response.data
  },

  spectateRoom: async (roomId) => {
    const response = await apiClient.post(`/memory/rooms/${roomId}/spectate`)
    return response.data
  },

  // ── Shop ──────────────────────────────────
  getShopCatalogue: async () => {
    const response = await apiClient.get('/memory/shop/catalogue')
    return response.data
  },

  buyPowerup: async (powerup_type, quantity = 1) => {
    const response = await apiClient.post('/memory/shop/buy', { powerup_type, quantity })
    return response.data
  },

  getInventory: async () => {
    const response = await apiClient.get('/memory/shop/inventory')
    return response.data
  },

  // ── Socket.IO (namespace /memory) ────────
  connectSocket: (token) => {
    if (memorySocket?.connected) return memorySocket

    memorySocket = io(`${SOCKET_URL}/memory`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    memorySocket.on('connect', () => {
      console.log('[memory] socket connected')
    })

    memorySocket.on('connect_error', (err) => {
      console.error('[memory] socket connection error:', err.message)
    })

    memorySocket.on('disconnect', (reason) => {
      console.log('[memory] socket disconnected:', reason)
    })

    return memorySocket
  },

  disconnectSocket: () => {
    if (memorySocket) {
      memorySocket.disconnect()
      memorySocket = null
    }
  },

  getSocket: () => memorySocket,

  // ── Socket helpers ───────────────────────
  joinMemoryRoom: (roomId, token, spectator = false) => {
    memorySocket?.emit('join_memory_room', { room_id: roomId, token, spectator })
  },

  leaveMemoryRoom: (roomId) => {
    memorySocket?.emit('leave_memory_room', { room_id: roomId })
  },

  emitPlayerReady: (roomId, token) => {
    memorySocket?.emit('player_ready', { room_id: roomId, token })
  },

  emitGameStarted: (roomId) => {
    memorySocket?.emit('memory_game_started', { room_id: roomId })
  },

  flipCard: (roomId, cardId, token) => {
    memorySocket?.emit('memory_flip_card', { room_id: roomId, card_id: cardId, token })
  },

  usePowerup: (roomId, powerupType, token) => {
    memorySocket?.emit('memory_use_powerup', { room_id: roomId, powerup_type: powerupType, token })
  },

  // ── Event listeners ─────────────────────
  onPlayerJoined: (cb) => memorySocket?.on('player_joined', cb),
  onRoomUpdated: (cb) => memorySocket?.on('room_updated', cb),
  onGameStart: (cb) => memorySocket?.on('memory_game_start', cb),
  onBoardState: (cb) => memorySocket?.on('memory_board_state', cb),
  onCardFlipped: (cb) => memorySocket?.on('memory_card_flipped', cb),
  onMatch: (cb) => memorySocket?.on('memory_match', cb),
  onNoMatch: (cb) => memorySocket?.on('memory_no_match', cb),
  onTurnChange: (cb) => memorySocket?.on('memory_turn_change', cb),
  onGameFinished: (cb) => memorySocket?.on('memory_game_finished', cb),
  onPowerupResult: (cb) => memorySocket?.on('memory_powerup_result', cb),
  onError: (cb) => memorySocket?.on('error', cb),

  // Remove listeners
  offPlayerJoined: () => memorySocket?.off('player_joined'),
  offRoomUpdated: () => memorySocket?.off('room_updated'),
  offGameStart: () => memorySocket?.off('memory_game_start'),
  offBoardState: () => memorySocket?.off('memory_board_state'),
  offCardFlipped: () => memorySocket?.off('memory_card_flipped'),
  offMatch: () => memorySocket?.off('memory_match'),
  offNoMatch: () => memorySocket?.off('memory_no_match'),
  offTurnChange: () => memorySocket?.off('memory_turn_change'),
  offGameFinished: () => memorySocket?.off('memory_game_finished'),
  offPowerupResult: () => memorySocket?.off('memory_powerup_result'),
  offError: () => memorySocket?.off('error'),
}
