import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket = null

export const socketService = {
  // Connect to socket
  connect: (token) => {
    socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    })

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    return socket
  },

  // Disconnect from socket
  disconnect: () => {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  },

  // Get socket instance
  getSocket: () => socket,

  // Join a room
  joinRoom: (roomId) => {
    if (socket) {
      socket.emit('join-room', roomId)
    }
  },

  // Leave a room
  leaveRoom: (roomId) => {
    if (socket) {
      socket.emit('leave-room', roomId)
    }
  },

  // Listen to events
  on: (event, callback) => {
    if (socket) {
      socket.on(event, callback)
    }
  },

  // Emit events
  emit: (event, data) => {
    if (socket) {
      socket.emit(event, data)
    }
  },

  // Remove event listener
  off: (event) => {
    if (socket) {
      socket.off(event)
    }
  },
}
