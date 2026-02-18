import apiClient from './apiClient'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let gameSocket = null

// ──────────────────────────────────────────────
// REST API calls
// ──────────────────────────────────────────────
export const gameService = {
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

  createRoom: async ({ name, game_mode, max_players }) => {
    const response = await apiClient.post('/game/rooms', { name, game_mode, max_players })
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
  joinGameRoom: (roomId, token) => {
    gameSocket?.emit('join_game_room', { room_id: roomId, token })
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

  onError: (callback) => {
    gameSocket?.on('error', callback)
  },

  // Remove listeners
  offPlayerJoined: () => gameSocket?.off('player_joined'),
  offRoomUpdated: () => gameSocket?.off('room_updated'),
  offGameStart: () => gameSocket?.off('game_start'),
  offError: () => gameSocket?.off('error'),
}
