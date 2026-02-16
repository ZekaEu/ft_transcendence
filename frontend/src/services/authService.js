import apiClient from './apiClient'

export const authService = {
  // User registration
  signup: async (username, email, password) => {
    const response = await apiClient.post('/auth/register', {
      username,
      email,
      password,
    })
    return response.data
  },

  // User login
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    })
    return response.data
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

  // Logout
  logout: async () => {
    await apiClient.post('/auth/logout')
  },

  // Get OAuth authorization URL
  getOAuthUrl: async (provider) => {
    const response = await apiClient.get(`/auth/oauth/${provider}/authorize`)
    return response.data
  },

  // OAuth login (exchange code for token via backend)
  oauthLogin: async (provider, code) => {
    const response = await apiClient.post('/auth/oauth/callback', {
      provider,
      code,
    })
    return response.data
  },

  // Refresh token
  refreshToken: async () => {
    const response = await apiClient.post('/auth/refresh')
    return response.data
  },
}
