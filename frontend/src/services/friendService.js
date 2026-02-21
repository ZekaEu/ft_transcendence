import apiClient from './apiClient'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let friendsSocket = null

export const friendService = {
  // ── REST API ─────────────────────────────

  // Get all accepted friends
  getFriends: async () => {
    const response = await apiClient.get('/friends/list')
    return response.data
  },

  // Get online friends
  getOnlineFriends: async () => {
    const response = await apiClient.get('/friends/online')
    return response.data
  },

  // Get pending friend requests (received)
  getPendingRequests: async () => {
    const response = await apiClient.get('/friends/pending')
    return response.data
  },

  // Get sent friend requests
  getSentRequests: async () => {
    const response = await apiClient.get('/friends/sent')
    return response.data
  },

  // Send friend request
  sendFriendRequest: async (friendId) => {
    const response = await apiClient.post('/friends/request', { friend_id: friendId })
    return response.data
  },

  // Accept friend request
  acceptFriendRequest: async (friendshipId) => {
    const response = await apiClient.post(`/friends/accept/${friendshipId}`)
    return response.data
  },

  // Reject friend request
  rejectFriendRequest: async (friendshipId) => {
    const response = await apiClient.post(`/friends/reject/${friendshipId}`)
    return response.data
  },

  // Remove friend
  removeFriend: async (friendId) => {
    const response = await apiClient.delete(`/friends/remove/${friendId}`)
    return response.data
  },

  // Block user
  blockUser: async (targetId) => {
    const response = await apiClient.post(`/friends/block/${targetId}`)
    return response.data
  },

  // Unblock user
  unblockUser: async (targetId) => {
    const response = await apiClient.post(`/friends/unblock/${targetId}`)
    return response.data
  },

  // Search users
  searchUsers: async (query) => {
    const response = await apiClient.get('/friends/search', { params: { q: query } })
    return response.data
  },

  // ── Socket.IO (namespace /friends) ───────

  connectSocket: (token) => {
    if (friendsSocket?.connected) return friendsSocket

    friendsSocket = io(`${SOCKET_URL}/friends`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    friendsSocket.on('connect', () => {
      console.log('[friends] socket connected')
    })

    friendsSocket.on('connect_error', (err) => {
      console.error('[friends] socket connection error:', err.message)
    })

    friendsSocket.on('disconnect', (reason) => {
      console.log('[friends] socket disconnected:', reason)
    })

    return friendsSocket
  },

  disconnectSocket: () => {
    if (friendsSocket) {
      friendsSocket.disconnect()
      friendsSocket = null
    }
  },

  getSocket: () => friendsSocket,

  // ── Event listeners ─────────────────────

  onFriendRequest: (callback) => {
    friendsSocket?.on('friend_request', callback)
  },

  onFriendAccepted: (callback) => {
    friendsSocket?.on('friend_accepted', callback)
  },

  onFriendRemoved: (callback) => {
    friendsSocket?.on('friend_removed', callback)
  },

  onFriendStatus: (callback) => {
    friendsSocket?.on('friend_status', callback)
  },

  // Remove listeners
  offFriendRequest: () => friendsSocket?.off('friend_request'),
  offFriendAccepted: () => friendsSocket?.off('friend_accepted'),
  offFriendRemoved: () => friendsSocket?.off('friend_removed'),
  offFriendStatus: () => friendsSocket?.off('friend_status'),
}
