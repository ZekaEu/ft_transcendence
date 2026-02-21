import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

      {/* Game Modes */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="material-icons-round text-secondary-500">category</span>
            {t('home.gameModes')}
          </h2>
          <Link to="/modes" className="text-primary-500 font-semibold hover:underline">
            {t('home.viewAll')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GameModeCard
            title={t('home.classic')}
            description={t('home.classicDesc')}
            icon="emoji_events"
            color="purple"
            to="/lobby?mode=classic"
          />
          <GameModeCard
            title={t('home.survival')}
            description={t('home.survivalDesc')}
            icon="timer"
            color="red"
            to="/lobby?mode=survival"
          />
          <GameModeCard
            title={t('home.timed')}
            description={t('home.timedDesc')}
            icon="bolt"
            color="amber"
            to="/lobby?mode=duel"
          />
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

function GameModeCard({ title, description, icon, color, to }) {
  const { t } = useTranslation()
  const colors = {
    purple: 'from-purple-400 to-purple-600 ring-secondary-500 bg-secondary-500/10',
    red: 'from-red-400 to-red-600 ring-red-500 bg-red-500/10',
    amber: 'from-amber-400 to-amber-600 ring-amber-500 bg-amber-500/10',
  }

  const textColor = {
    purple: 'text-secondary-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
  }

  return (
    <Link to={to} className={`group relative glass rounded-2xl p-8 hover:ring-2 ${colors[color].split(' ')[2]} transition-all cursor-pointer overflow-hidden block`}>
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${colors[color].split(' ')[3]} rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
      <div className="relative space-y-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors[color].split(' ')[0]} ${colors[color].split(' ')[1]} flex items-center justify-center text-white shadow-lg`}>
          <span className="material-icons-round text-3xl">{icon}</span>
        </div>
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400">{description}</p>
        <div className={`pt-4 flex items-center gap-2 ${textColor[color]} font-bold`}>
          {t('lobby.ready')} <span className="material-icons-round group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </div>
      </div>
    </Link>
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
  const navigate = useNavigate()

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
    </div>
  )
}

export default HomePage
