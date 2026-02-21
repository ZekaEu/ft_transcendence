import apiClient from './apiClient'

export const userService = {
  // Get user profile
  getUserProfile: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`)
    return response.data
  },

  // Update user profile
  updateProfile: async (userId, data) => {
    const response = await apiClient.put(`/users/${userId}`, data)
    return response.data
  },

  // Upload avatar
  uploadAvatar: async (userId, file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await apiClient.post(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': undefined, // Let browser/axios set it automatically
      },
    })
    return response.data
  },

  // Remove avatar
  removeAvatar: async (userId) => {
    const response = await apiClient.delete(`/users/${userId}/avatar`)
    return response.data
  },

  // Get friends list
  getFriendsList: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/friends`)
    return response.data
  },

  // Add friend
  addFriend: async (userId, friendId) => {
    const response = await apiClient.post(`/users/${userId}/friends`, {
      friendId,
    })
    return response.data
  },

  // Remove friend
  removeFriend: async (userId, friendId) => {
    const response = await apiClient.delete(`/users/${userId}/friends/${friendId}`)
    return response.data
  },

  // Get online status
  getOnlineStatus: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/status`)
    return response.data
  },

  // Search users
  searchUsers: async (query) => {
    const response = await apiClient.get('/users/search', {
      params: { q: query },
    })
    return response.data
  },
}
