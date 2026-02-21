import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useChat } from '../../hooks/useChat'
import { Avatar } from './Avatar'

export function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { totalUnread } = useChat()
  const navigate = useNavigate()
  const location = useLocation()
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'))

  const toggleDarkMode = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleLanguage = () => {
    const languages = ['en', 'pt', 'es', 'fr']
    const currentIndex = languages.indexOf(i18n.language)
    const nextIndex = (currentIndex + 1) % languages.length
    const nextLang = languages[nextIndex]
    i18n.changeLanguage(nextLang)
    localStorage.setItem('language', nextLang)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) return null

  const navLinks = [
    { name: t('navbar.home'), path: '/' },
    { name: t('navbar.chat'), path: '/chat', badge: totalUnread },
    { name: t('navbar.ranking'), path: '/ranking' },
    { name: t('navbar.shop'), path: '/shop' },
    { name: t('navbar.friends'), path: '/friends' },
  ]

  return (
    <nav className="sticky top-0 z-50 glass border-b border-sky-100 dark:border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary-500 p-2 rounded-xl text-white">
            <span className="material-icons-round">quiz</span>
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Triple Trouble <span className="text-primary-500">Trivia</span>
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 font-semibold">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative transition-colors ${location.pathname === link.path
                ? 'text-primary-500 border-b-2 border-primary-500 pb-1'
                : 'text-slate-600 dark:text-slate-300 hover:text-primary-500'
                }`}
            >
              {link.name}
              {link.badge > 0 && (
                <span className="absolute -top-2 -right-4 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {link.badge > 9 ? '9+' : link.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Action Menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 rounded-lg text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-all uppercase"
          >
            {i18n.language.toUpperCase()}
          </button>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-sky-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-icons-round block dark:hidden">dark_mode</span>
            <span className="material-icons-round hidden dark:block">light_mode</span>
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-sky-200 dark:border-slate-700">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {user.username}
              </p>
              <p className="text-sm font-bold text-primary-500">{user.xp ?? 0} XP</p>
            </div>

            <Link to="/profile" className="relative">
              <Avatar
                src={user.avatar_url}
                alt={user.username}
                size="md"
                className="ring-2 ring-primary-500"
              />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            </Link>

            <button
              onClick={handleLogout}
              className="ml-2 text-slate-400 hover:text-red-500 transition-colors"
              title={t('navbar.logout')}
            >
              <span className="material-icons-round">logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
