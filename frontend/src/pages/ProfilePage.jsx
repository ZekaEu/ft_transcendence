import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { Button, Input, Card, Avatar, Spinner } from '../components/common'
import { gameService } from '../services/gameService'
import { userService } from '../services/userService'
import toast from 'react-hot-toast'

function ProfilePage() {
  const { t } = useTranslation()
  const { user, refreshUserData } = useAuth()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false)

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setEmail(user.email || '')
      setBio(user.bio || '')
      setAvatarPreview(user.avatar_url || '')
    }
  }, [user])

  // Validate file before preview
  const validateFile = (file) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast.error(t('profile.invalidFileType'))
      return false
    }

    if (file.size > maxSize) {
      toast.error(t('profile.fileTooLarge'))
      return false
    }

    return true
  }

  // Match history state
  const [historyFilter, setHistoryFilter] = useState('all')
  const [gameTypeFilter, setGameTypeFilter] = useState('all')
  const [matches, setMatches] = useState([])
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, win_rate: 0 })
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Achievements state
  const [achievements, setAchievements] = useState({ unlocked: [], locked: [] })
  const [loadingAchievements, setLoadingAchievements] = useState(true)

  // Fetch match history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true)
      try {
        const data = await gameService.getMatchHistory(historyFilter, gameTypeFilter)
        setMatches(data.matches || [])
        setStats(data.stats || { total: 0, wins: 0, losses: 0, win_rate: 0 })
      } catch (err) {
        console.error('Failed to load match history:', err)
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [historyFilter, gameTypeFilter])

  // Fetch achievements
  useEffect(() => {
    const fetchAchievements = async () => {
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
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file && validateFile(file)) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    setRemoveAvatarFlag(!removeAvatarFlag)
  }

  const handleAvatarUpload = async (fileToUpload) => {
    if (!fileToUpload || !user) return

    try {
      const response = await userService.uploadAvatar(user.id, fileToUpload)
      // Update preview with the server response
      if (response.user && response.user.avatar_url) {
        setAvatarPreview(response.user.avatar_url)
      }
      return true
    } catch (err) {
      console.error('Avatar upload error:', err)
      // Handle timeout specifically
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        toast.error(t('profile.uploadTimeout') || 'Upload timed out. File may be too large.')
      } else if (err.response?.status === 413) {
        // Show the server's detailed error message if available
        const serverMessage = err.response?.data?.message
        toast.error(serverMessage || t('profile.fileTooLarge') || 'File is too large for upload.')
      } else {
        // Show server error message if available, otherwise fallback
        const serverMessage = err.response?.data?.message
        toast.error(serverMessage || err.message || t('profile.updateFailed'))
      }
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) return

    setLoading(true)
    try {
      // Prepare update data
      const updateData = {
        username: username.trim(),
        email: email.trim(),
        bio: bio.trim(),
      }

      // Update profile fields
      await userService.updateProfile(user.id, updateData)

      // Remove avatar if flagged
      if (removeAvatarFlag) {
        try {
          await userService.removeAvatar(user.id)
          setAvatarFile(null)
          setAvatarPreview('')
          setRemoveAvatarFlag(false)
        } catch (err) {
          console.error('Avatar removal error:', err)
          toast.error(err.message || t('profile.updateFailed'))
        }
      }

      // Upload avatar if a new file was selected
      if (avatarFile) {
        setUploadingAvatar(true)
        const uploadSuccess = await handleAvatarUpload(avatarFile)
        // Always clear the file to remove the overlay, regardless of success
        setAvatarFile(null)
        setUploadingAvatar(false)
      }

      // Refresh user data from server to sync auth context
      await refreshUserData()

      toast.success(t('profile.updated'))
    } catch (err) {
      console.error('Profile update error:', err)
      toast.error(err.message || t('profile.updateFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <Spinner />

  // Generate initials for default avatar
  const getInitials = () => {
    return username
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{t('profile.myProfile')}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200 dark:border-slate-700">
            <div className="relative">
              {avatarPreview ? (
                <Avatar
                  src={avatarPreview}
                  alt={username}
                  size="lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {getInitials()}
                </div>
              )}
              {avatarFile && uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{t('profile.uploadingAvatar')}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 flex-1">
              <div>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={loading || uploadingAvatar}
                />
                <label htmlFor="avatar-input" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || uploadingAvatar}
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById('avatar-input').click()
                    }}
                  >
                    {t('profile.selectFile')}
                  </Button>
                </label>
              </div>

              {avatarPreview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveAvatar}
                  disabled={loading || uploadingAvatar}
                  className={removeAvatarFlag ? 'text-orange-600 hover:bg-orange-50' : 'text-red-600 hover:bg-red-50'}
                >
                  {removeAvatarFlag ? t('profile.cancelRemoveAvatar') || 'Cancel removal' : t('profile.removeAvatar')}
                </Button>
              )}
            </div>
          </div>

          {/* Username */}
          <Input
            label={t('profile.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            placeholder="johndoe"
          />

          {/* Email */}
          <Input
            label={t('profile.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="john@example.com"
          />

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('profile.bio')}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
              placeholder={t('profile.bioPlaceholder')}
              maxLength="500"
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed resize-none bg-white dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500">{bio.length}/500</p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-6">
            <Button
              type="submit"
              disabled={loading || uploadingAvatar}
            >
              {loading || uploadingAvatar ? t('profile.saving') : t('profile.saveChanges')}
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Match History Section ── */}
      <Card className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('profile.matchHistory')}</h2>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('profile.totalGames')}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.wins}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('profile.wins')}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.losses}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('profile.losses')}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.win_rate}%</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('profile.winRate')}</p>
          </div>
        </div>

        {/* Game Type Filter */}
        <div className="flex gap-2 mb-4">
          {['all', 'trivia', 'memory'].map((gType) => (
            <button
              key={gType}
              onClick={() => setGameTypeFilter(gType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                gameTypeFilter === gType
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {gType === 'all' && t('profile.allGames')}
              {gType === 'trivia' && t('profile.trivia')}
              {gType === 'memory' && t('profile.memory')}
            </button>
          ))}
        </div>

        {/* Win/Loss Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 pb-4">
          {['all', 'wins', 'losses'].map((filter) => (
            <button
              key={filter}
              onClick={() => setHistoryFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                historyFilter === filter
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
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
            {matches.map((match, idx) => (
              <div
                key={`${match.game_type}_${match.room_id}_${idx}`}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  match.is_winner
                    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20'
                    : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20'
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
                    <p className="font-semibold text-gray-900 dark:text-white">{match.room_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        match.is_winner
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {match.is_winner ? t('profile.victory') : t('profile.defeat')}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        match.game_type === 'trivia'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        {match.game_type === 'trivia' ? '🧠 ' + t('profile.trivia') : '🃏 ' + t('profile.memory')}
                      </span>
                      <span className="capitalize">{t('profile.players')}: {match.total_players}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{match.score}</p>
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

      {/* ── Achievements Section ── */}
      <Card className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profile.achievements')}</h2>
          {!loadingAchievements && (
            <span className="text-sm text-gray-500">
              {achievements.unlocked.length}/{achievements.unlocked.length + achievements.locked.length}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {!loadingAchievements && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${achievements.unlocked.length + achievements.locked.length > 0
                    ? (achievements.unlocked.length / (achievements.unlocked.length + achievements.locked.length)) * 100
                    : 0}%`
                }}
              />
            </div>
          </div>
        )}

        {loadingAchievements ? (
          <div className="flex justify-center py-12">
            <Spinner />
            <span className="ml-3 text-gray-500">{t('profile.loadingAchievements')}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* Unlocked achievements */}
            {achievements.unlocked.map((a) => (
              <div
                key={a.key}
                className="relative flex flex-col items-center p-4 rounded-xl border-2 border-yellow-300 dark:border-yellow-500/40 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/20 dark:to-slate-800 shadow-sm hover:shadow-md transition-shadow"
                title={t(`achv.${a.key}_desc`)}
              >
                <span className="material-symbols-rounded text-3xl text-yellow-500 mb-2">{a.icon}</span>
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 text-center leading-tight">{t(`achv.${a.key}`)}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{t(`achv.${a.key}_desc`)}</p>
              </div>
            ))}

            {/* Locked achievements */}
            {achievements.locked.map((a) => (
              <div
                key={a.key}
                className="relative flex flex-col items-center p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-50 grayscale"
                title={t(`achv.${a.key}_desc`)}
              >
                <span className="material-symbols-rounded text-3xl text-gray-400 mb-2">{a.icon}</span>
                <p className="text-xs font-semibold text-gray-500 text-center leading-tight">{t(`achv.${a.key}`)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default ProfilePage
