import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import { MainLayout } from './components/layout'
import ProtectedRoute from './components/common/ProtectedRoute'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ProfilePage from './pages/ProfilePage'
import FriendsPage from './pages/FriendsPage'
import GamePage from './pages/GamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import LobbyPage from './pages/LobbyPage'
import ShopPage from './pages/ShopPage'
import ChatPage from './pages/ChatPage'
import MemoryGamePage from './pages/MemoryGamePage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <HomePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ProfilePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <FriendsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ranking"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <LeaderboardPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ShopPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lobby"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <LobbyPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/game"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <GamePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/memory/play"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <MemoryGamePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ChatPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ChatProvider>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AuthProvider>
    </Router>
  )
}

export default App
