// Mock Auth Service - Uses localStorage for development without backend
// Replace with real authService when backend is ready

export const mockAuthService = {
  // Mock database in localStorage
  _getUsers: () => {
    const users = localStorage.getItem('mock_users')
    return users ? JSON.parse(users) : []
  },

  _saveUsers: (users) => {
    localStorage.setItem('mock_users', JSON.stringify(users))
  },

  _generateToken: (userId) => {
    // Generate a simple mock JWT-like token
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ userId, iat: Date.now() }))
    const signature = btoa('mock_signature_' + userId)
    return `${header}.${payload}.${signature}`
  },

  _generateId: () => {
    return 'user_' + Math.random().toString(36).substr(2, 9)
  },

  // User registration
  signup: async (username, email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = mockAuthService._getUsers()

        // Check if user already exists
        if (users.some((u) => u.email === email)) {
          reject({
            response: {
              status: 400,
              data: { message: 'Email already registered' },
            },
          })
          return
        }

        if (users.some((u) => u.username === username)) {
          reject({
            response: {
              status: 400,
              data: { message: 'Username already taken' },
            },
          })
          return
        }

        // Create new user
        const newUser = {
          id: mockAuthService._generateId(),
          username,
          email,
          password, // In real app, this would be hashed!
          avatar: null,
          createdAt: new Date().toISOString(),
          online: true,
          friends: [],
        }

        users.push(newUser)
        mockAuthService._saveUsers(users)

        const token = mockAuthService._generateToken(newUser.id)
        localStorage.setItem('authToken', token)

        resolve({
          token,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            avatar: newUser.avatar,
            online: true,
          },
        })
      }, 500) // Simulate network delay
    })
  },

  // User login
  login: async (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = mockAuthService._getUsers()
        const user = users.find((u) => u.email === email)

        if (!user) {
          reject({
            response: {
              status: 401,
              data: { message: 'Invalid email or password' },
            },
          })
          return
        }

        if (user.password !== password) {
          reject({
            response: {
              status: 401,
              data: { message: 'Invalid email or password' },
            },
          })
          return
        }

        const token = mockAuthService._generateToken(user.id)
        localStorage.setItem('authToken', token)

        resolve({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            online: true,
          },
        })
      }, 500) // Simulate network delay
    })
  },

  // Get current user
  getCurrentUser: async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const token = localStorage.getItem('authToken')
        if (!token) {
          reject(new Error('No token'))
          return
        }

        // Decode token to get userId
        const parts = token.split('.')
        if (parts.length !== 3) {
          reject(new Error('Invalid token'))
          return
        }

        const payload = JSON.parse(atob(parts[1]))
        const users = mockAuthService._getUsers()
        const user = users.find((u) => u.id === payload.userId)

        if (!user) {
          reject(new Error('User not found'))
          return
        }

        resolve({
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          online: true,
        })
      }, 300)
    })
  },

  // Logout
  logout: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.removeItem('authToken')
        resolve()
      }, 300)
    })
  },

  // Get mock user by ID (for profile, friends, etc.)
  getUserById: async (userId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = mockAuthService._getUsers()
        const user = users.find((u) => u.id === userId)

        if (!user) {
          reject(new Error('User not found'))
          return
        }

        resolve({
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          online: user.online,
          createdAt: user.createdAt,
          friends: user.friends,
        })
      }, 300)
    })
  },

  // Get all mock users (for search/friends)
  getAllUsers: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = mockAuthService._getUsers()
        resolve(
          users.map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            avatar: u.avatar,
            online: u.online,
          })),
        )
      }, 300)
    })
  },
}
