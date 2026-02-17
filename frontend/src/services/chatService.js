import apiClient from './apiClient'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let chatSocket = null

// ──────────────────────────────────────────────
// REST API calls
// ──────────────────────────────────────────────
export const chatService = {
  // ── Rooms ────────────────────────────────
  getRooms: async () => {
    const response = await apiClient.get('/chat/rooms')
    return response.data
  },

  createRoom: async ({ member_ids, is_group = false, name = '' }) => {
    const response = await apiClient.post('/chat/rooms', { member_ids, is_group, name })
    return response.data
  },

  getRoom: async (roomId) => {
    const response = await apiClient.get(`/chat/rooms/${roomId}`)
    return response.data
  },

  // ── Messages ─────────────────────────────
  getMessages: async (roomId, page = 1, perPage = 50) => {
    const response = await apiClient.get(`/chat/rooms/${roomId}/messages`, {
      params: { page, per_page: perPage },
    })
    return response.data
  },

  markAsRead: async (roomId) => {
    const response = await apiClient.post(`/chat/rooms/${roomId}/read`)
    return response.data
  },

  // ── Members ──────────────────────────────
  addMember: async (roomId, userId) => {
    const response = await apiClient.post(`/chat/rooms/${roomId}/members`, { user_id: userId })
    return response.data
  },

  leaveRoom: async (roomId) => {
    const response = await apiClient.post(`/chat/rooms/${roomId}/leave`)
    return response.data
  },

  // ── Socket.IO (namespace /chat) ──────────
  connectSocket: (token) => {
    if (chatSocket?.connected) return chatSocket

    chatSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    chatSocket.on('connect', () => {
      console.log('[chat] socket connected')
    })

    chatSocket.on('connect_error', (err) => {
      console.error('[chat] socket connection error:', err.message)
    })

    chatSocket.on('disconnect', (reason) => {
      console.log('[chat] socket disconnected:', reason)
    })

    return chatSocket
  },

  disconnectSocket: () => {
    if (chatSocket) {
      chatSocket.disconnect()
      chatSocket = null
    }
  },

  getSocket: () => chatSocket,

  // ── Socket helpers ───────────────────────
  joinRoom: (roomId, token) => {
    chatSocket?.emit('join_room', { room_id: roomId, token })
  },

  leaveSocketRoom: (roomId) => {
    chatSocket?.emit('leave_room', { room_id: roomId })
  },

  sendMessage: (roomId, content, token) => {
    chatSocket?.emit('send_message', { room_id: roomId, content, token })
  },

  sendTyping: (roomId, isTyping, token) => {
    chatSocket?.emit('typing', { room_id: roomId, is_typing: isTyping, token })
  },

  markReadSocket: (roomId, token) => {
    chatSocket?.emit('mark_read', { room_id: roomId, token })
  },

  // ── Event listeners ─────────────────────
  onNewMessage: (callback) => {
    chatSocket?.on('new_message', callback)
  },

  onUserTyping: (callback) => {
    chatSocket?.on('user_typing', callback)
  },

  onMessagesRead: (callback) => {
    chatSocket?.on('messages_read', callback)
  },

  onJoinedRoom: (callback) => {
    chatSocket?.on('joined_room', callback)
  },

  onError: (callback) => {
    chatSocket?.on('error', callback)
  },

  // Remove listeners
  offNewMessage: () => chatSocket?.off('new_message'),
  offUserTyping: () => chatSocket?.off('user_typing'),
  offMessagesRead: () => chatSocket?.off('messages_read'),
  offJoinedRoom: () => chatSocket?.off('joined_room'),
  offError: () => chatSocket?.off('error'),
}
