import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { Button, Input, Card, Avatar, Spinner } from '../components/common'
import { gameService } from '../services/gameService'
import toast from 'react-hot-toast'

function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')

  // Match history state
  const [historyFilter, setHistoryFilter] = useState('all')
  const [matches, setMatches] = useState([])
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, win_rate: 0 })
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Fetch match history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true)
      try {
        const data = await gameService.getMatchHistory(historyFilter)
        setMatches(data.matches || [])
        setStats(data.stats || { total: 0, wins: 0, losses: 0, win_rate: 0 })
      } catch (err) {
        console.error('Failed to load match history:', err)
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [historyFilter])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Call user service to update profile
      updateUser({
        username,
        email,
        avatar: avatarPreview,
      })
      toast.success(t('profile.updated'))
    } catch (err) {
      toast.error(t('profile.updateFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <Spinner />

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('profile.myProfile')}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
            <Avatar
              src={avatarPreview}
              alt={username}
              size="lg"
            />
            <div>
              <label className="block">
                <Button type="button" variant="outline">
                  {t('profile.changeAvatar')}
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Username */}
          <Input
            label={t('profile.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />

          {/* Email */}
          <Input
            label={t('profile.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          {/* Submit Button */}
          <div className="flex gap-4 pt-6">
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? t('profile.saving') : t('profile.saveChanges')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
            >
              {t('profile.changePassword')}
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Match History Section ── */}
      <Card className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('profile.matchHistory')}</h2>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">{t('profile.totalGames')}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
            <p className="text-sm text-gray-500">{t('profile.wins')}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.losses}</p>
            <p className="text-sm text-gray-500">{t('profile.losses')}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.win_rate}%</p>
            <p className="text-sm text-gray-500">{t('profile.winRate')}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
          {['all', 'wins', 'losses'].map((filter) => (
            <button
              key={filter}
              onClick={() => setHistoryFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                historyFilter === filter
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' && t('profile.allMatches')}
              {filter === 'wins' && t('profile.wins')}
              {filter === 'losses' && t('profile.losses')}
            </button>
          ))}
        </div>

        {/* Match List */}
        {loadingHistory ? (
          <div className="flex justify-center py-12">
            <Spinner />
            <span className="ml-3 text-gray-500">{t('profile.loadingHistory')}</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎮</div>
            <p className="text-gray-500 font-medium">{t('profile.noMatches')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('profile.playFirst')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.room_id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  match.is_winner
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-red-200 bg-red-50/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Result Badge */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      match.is_winner ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {match.is_winner ? '🏆' : '💔'}
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">{match.room_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        match.is_winner
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {match.is_winner ? t('profile.victory') : t('profile.defeat')}
                      </span>
                      <span className="capitalize">{t('profile.mode')}: {match.game_mode}</span>
                      <span>{t('profile.players')}: {match.total_players}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">{match.score}</p>
                  <p className="text-xs text-gray-500">
                    {t('profile.rank')}: {match.rank}/{match.total_players}
                  </p>
                  {match.played_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(match.played_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default ProfilePage
