import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import apiClient from '../services/apiClient'
import { friendService } from '../services/friendService'

function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineFriends, setOnlineFriends] = useState([])
  const [allFriends, setAllFriends] = useState([])

  // Fetch online count
  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await apiClient.get('/stats/online')
        setOnlineCount(res.data.online_count)
      } catch (err) {
        console.error('Failed to fetch online count:', err)
      }
    }
    fetchOnline()
    const interval = setInterval(fetchOnline, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch friends from backend
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const friends = await friendService.getFriends()
        setAllFriends(friends)
        setOnlineFriends(friends.filter((f) => f.is_online))
      } catch (err) {
        console.error('Failed to fetch friends:', err)
      }
    }
    fetchFriends()
    const interval = setInterval(fetchFriends, 15000)
    return () => clearInterval(interval)
  }, [])

  // Real-time friend status via socket
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    friendService.connectSocket(token)

    friendService.onFriendStatus((data) => {
      setAllFriends((prev) => {
        const updated = prev.map((f) =>
          f.id === data.user_id ? { ...f, is_online: data.is_online } : f
        )
        setOnlineFriends(updated.filter((f) => f.is_online))
        return updated
      })
    })

    return () => {
      friendService.offFriendStatus()
    }
  }, [])

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            {t('home.readyFor')} <span className="text-gradient">{t('home.challenge')}</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {t('home.heroSubtitle')}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <Link
            to="/lobby"
            className="group relative px-12 py-6 bg-gradient-to-br from-[#0ea5e9] to-[#0369a1] text-white rounded-2xl font-black text-3xl juicy-shadow hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-4"
          >
            <span className="material-icons-round text-4xl">play_arrow</span>
            {t('home.playNow')}
            <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full animate-bounce font-bold shadow-sm">
              +50 XP
            </div>
          </Link>
          <div className="mt-6 flex items-center gap-2 text-slate-400 dark:text-slate-500">
            <span className="material-icons-round text-sm">group</span>
            <span className="text-sm font-semibold">{onlineCount.toLocaleString()} {t('home.playersOnline')}</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="material-icons-round text-secondary-500">category</span>
            {t('home.categories')}
          </h2>
          <Link to="/lobby" className="text-primary-500 font-semibold hover:underline">
            {t('home.viewAll')}
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            { key: 'science', icon: 'science', color: 'from-blue-400 to-blue-600' },
            { key: 'history', icon: 'history_edu', color: 'from-amber-400 to-amber-600' },
            { key: 'geography', icon: 'public', color: 'from-green-400 to-green-600' },
            { key: 'sports', icon: 'sports_soccer', color: 'from-red-400 to-red-600' },
            { key: 'music', icon: 'music_note', color: 'from-purple-400 to-purple-600' },
            { key: 'movies', icon: 'movie', color: 'from-pink-400 to-pink-600' },
            { key: 'technology', icon: 'computer', color: 'from-cyan-400 to-cyan-600' },
            { key: 'nature', icon: 'park', color: 'from-emerald-400 to-emerald-600' },
            { key: 'gaming', icon: 'sports_esports', color: 'from-indigo-400 to-indigo-600' },
            { key: 'art', icon: 'palette', color: 'from-rose-400 to-rose-600' },
          ].map((cat) => (
            <Link
              key={cat.key}
              to="/lobby"
              className="group glass rounded-2xl p-5 hover:ring-2 hover:ring-primary-500/50 transition-all text-center space-y-3"
            >
              <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <span className="material-icons-round text-2xl">{cat.icon}</span>
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {t(`lobby.cat_${cat.key}`)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Achievements */}
        <div className="lg:col-span-2 glass rounded-2xl p-8 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-icons-round text-yellow-500">stars</span>
            {t('home.recentAchievements')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AchievementCard
              title={t('home.triviaKing')}
              description={t('home.triviaKingDesc')}
              icon="local_fire_department"
              color="blue"
            />
            <AchievementCard
              title={t('home.fastLearner')}
              description={t('home.fastLearnerDesc')}
              icon="psychology"
              color="green"
            />
          </div>
        </div>

        {/* Online Friends */}
        <div className="glass rounded-2xl p-8 space-y-6">
          <h3 className="text-xl font-bold flex items-center justify-between">
            {t('home.friends')}
            <span className="bg-green-500 w-2 h-2 rounded-full"></span>
          </h3>
          <div className="space-y-4">
            {onlineFriends.length > 0 ? (
              onlineFriends.slice(0, 5).map((friend) => (
                <FriendItem
                  key={friend.id}
                  name={friend.display_name || friend.username}
                  status={t('home.online')}
                  avatar={friend.avatar_url}
                  online={true}
                />
              ))
            ) : allFriends.length > 0 ? (
              allFriends.slice(0, 5).map((friend) => (
                <FriendItem
                  key={friend.id}
                  name={friend.display_name || friend.username}
                  status={friend.is_online ? t('home.online') : t('home.offline')}
                  avatar={friend.avatar_url}
                  online={friend.is_online}
                />
              ))
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                {t('friends.noFriends')}
              </p>
            )}
          </div>
          <Link to="/friends" className="block w-full py-2 text-sm font-bold text-slate-400 hover:text-primary-500 text-center transition-colors border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
            {t('home.viewAll')}
          </Link>
        </div>
      </div>
    </div>
  )
}

function AchievementCard({ title, description, icon, color }) {
  const bgColors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-500',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-500',
  }

  return (
    <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl border border-white/20">
      <div className={`p-2 rounded-lg ${bgColors[color]}`}>
        <span className="material-icons-round">{icon}</span>
      </div>
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function FriendItem({ name, status, avatar, online }) {
  return (
    <div className={`flex items-center justify-between ${!online ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          {avatar ? (
            <img src={avatar} alt={name} className="w-8 h-8 rounded-full bg-slate-100 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-xs font-bold">
              {name?.charAt(0).toUpperCase()}
            </div>
          )}
          {online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>}
        </div>
        <div>
          <p className="text-sm font-bold">{name}</p>
          <p className={`text-[10px] font-bold uppercase ${online ? 'text-green-500' : 'text-slate-400'}`}>
            {status}
          </p>
        </div>
      </div>
      <button className="p-1.5 rounded-lg hover:bg-sky-100 dark:hover:bg-slate-700 text-primary-500">
        <span className="material-icons-round text-sm">{online ? 'chat' : 'person_add'}</span>
      </button>
    </div>
  )
}

export default HomePage
