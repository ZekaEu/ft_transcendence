import React, { createContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { userService } from '../services/userService'
import { mockAuthService } from '../services/mockAuthService'

// Use mock API if VITE_USE_MOCK_API is true
const useMockAPI = import.meta.env.VITE_USE_MOCK_API === 'true'
const API = useMockAPI ? mockAuthService : authService

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          const userData = await API.getCurrentUser()
          setUser(userData)
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        localStorage.removeItem('authToken')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const response = await API.login(email, password)
      localStorage.setItem('authToken', response.token)
      setUser(response.user)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signup = async (username, email, password) => {
    setLoading(true)
    setError(null)
    try {
      const response = await API.signup(username, email, password)
      localStorage.setItem('authToken', response.token)
      setUser(response.user)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await API.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('authToken')
      setUser(null)
    }
  }

  const loginWithToken = async (token, refreshToken) => {
    setLoading(true)
    setError(null)
    try {
      localStorage.setItem('authToken', token)
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken)
      }
      const userData = await API.getCurrentUser()
      setUser(userData)
      return userData
    } catch (err) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Fetch fresh user data from server
  const refreshUserData = async () => {
    if (!user) return
    try {
      const freshUserData = await userService.getUserProfile(user.id)
      setUser(freshUserData)
      return freshUserData
    } catch (err) {
      console.error('Failed to refresh user data:', err)
      throw err
    }
  }

  // Update user in context (local state only)
  const updateUser = (updatedUserData) => {
    setUser((prev) => ({ ...prev, ...updatedUserData }))
  }

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    loginWithToken,
    updateUser,
    refreshUserData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
