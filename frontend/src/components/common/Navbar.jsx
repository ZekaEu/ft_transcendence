import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from './Button'
import { Avatar } from './Avatar'

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-primary-600">
            Triple Trouble Trivia
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-primary-600 transition">
              Home
            </Link>
            <Link to="/friends" className="text-gray-700 hover:text-primary-600 transition">
              Friends
            </Link>
            <Link to="/profile" className="text-gray-700 hover:text-primary-600 transition">
              Profile
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <Avatar
              src={user.avatar || 'https://via.placeholder.com/40'}
              alt={user.username}
              size="md"
              online={user.online}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 flex flex-col gap-2">
            <Link to="/" className="text-gray-700 hover:text-primary-600">
              Home
            </Link>
            <Link to="/friends" className="text-gray-700 hover:text-primary-600">
              Friends
            </Link>
            <Link to="/profile" className="text-gray-700 hover:text-primary-600">
              Profile
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
