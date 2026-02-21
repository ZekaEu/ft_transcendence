import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import apiClient from '../services/apiClient'
import { friendService } from '../services/friendService'
import { gameService } from '../services/gameService'

function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineFriends, setOnlineFriends] = useState([])
  const [allFriends, setAllFriends] = useState([])
  const [achievements, setAchievements] = useState({ unlocked: [], locked: [] })
  const [loadingAchievements, setLoadingAchievements] = useState(true)

  // Fetch online count - re-runs when user changes (login)
  const fetchOnlineCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/stats/online')
      setOnlineCount(res.data.online_count)
    } catch (err) {
      console.error('Failed to fetch online count:', err)
    }
  }, [])

  useEffect(() => {
    fetchOnlineCount()
    const interval = setInterval(fetchOnlineCount, 15000)
    return () => clearInterval(interval)
  }, [user, fetchOnlineCount])

  // Fetch friends from backend - re-runs when user changes
  const fetchFriends = useCallback(async () => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    try {
      const friends = await friendService.getFriends()
      setAllFriends(friends)
      setOnlineFriends(friends.filter((f) => f.is_online))
    } catch (err) {
      console.error('Failed to fetch friends:', err)
    }
  }, [])

  useEffect(() => {
    fetchFriends()
    const interval = setInterval(fetchFriends, 15000)
    return () => clearInterval(interval)
  }, [user, fetchFriends])

  // Fetch achievements
  useEffect(() => {
    const fetchAchievements = async () => {
      const token = localStorage.getItem('authToken')
      if (!token) return
      setLoadingAchievements(true)
      try {
        const data = await gameService.getAchievements()
        setAchievements(data)
      } catch (err) {
        console.error('Failed to load achievements:', err)
      } finally {
        setLoadingAchievements(false)
      }
    }
    fetchAchievements()
  }, [user])

  // Real-time friend status via socket - also updates online count
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    friendService.connectSocket(token)

    friendService.onFriendStatus((data) => {
      // Update friends list
      setAllFriends((prev) => {
        const updated = prev.map((f) =>
          f.id === data.user_id ? { ...f, is_online: data.is_online } : f
        )
        setOnlineFriends(updated.filter((f) => f.is_online))
        return updated
      })
      // Refresh online count whenever someone's status changes
      fetchOnlineCount()
    })

    return () => {
      friendService.offFriendStatus()
    }
  }, [user, fetchOnlineCount])

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

        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/lobby"
              className="group relative px-12 py-6 bg-gradient-to-br from-[#0ea5e9] to-[#0369a1] text-white rounded-2xl font-black text-3xl juicy-shadow hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-4"
            >
              <span className="material-icons-round text-4xl">play_arrow</span>
              {t('home.playNow')}
              <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full animate-bounce font-bold shadow-sm">
                +XP
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
            <span className="material-icons-round text-sm">group</span>
            <span className="text-sm font-semibold">{onlineCount.toLocaleString()} {t('home.playersOnline')}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Achievements */}
        <div className="lg:col-span-2 glass rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="material-icons-round text-yellow-500">stars</span>
              {t('profile.achievements')}
            </h3>
            {!loadingAchievements && (
              <span className="text-sm text-slate-400 font-semibold">
                {achievements.unlocked.length}/{achievements.unlocked.length + achievements.locked.length}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {!loadingAchievements && (
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${achievements.unlocked.length + achievements.locked.length > 0
                    ? (achievements.unlocked.length / (achievements.unlocked.length + achievements.locked.length)) * 100
                    : 0}%`
                }}
              />
            </div>
          )}

          {loadingAchievements ? (
            <div className="flex justify-center py-8">
              <span className="material-icons-round animate-spin text-slate-400">refresh</span>
              <span className="ml-2 text-sm text-slate-400">{t('profile.loadingAchievements')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {achievements.unlocked.map((a) => (
                <div
                  key={a.key}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-yellow-300 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/20 dark:to-slate-800/50 shadow-sm hover:shadow-md transition-shadow"
                  title={t(`achv.${a.key}_desc`)}
                >
                  <span className="material-symbols-rounded text-2xl text-yellow-500 mb-1">{a.icon}</span>
                  <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight">{t(`achv.${a.key}`)}</p>
                </div>
              ))}
              {achievements.locked.map((a) => (
                <div
                  key={a.key}
                  className="relative flex flex-col items-center p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 opacity-40 grayscale"
                  title={t(`achv.${a.key}_desc`)}
                >
                  <span className="material-symbols-rounded text-2xl text-slate-400 mb-1">{a.icon}</span>
                  <p className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{t(`achv.${a.key}`)}</p>
                </div>
              ))}
            </div>
          )}
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
    </div>
  )
}

export default HomePage
