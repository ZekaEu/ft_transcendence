import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { Button, Input, Card, Avatar, Spinner } from '../components/common'
import { userService } from '../services/userService'
import toast from 'react-hot-toast'

function ProfilePage() {
  const { t } = useTranslation()
  const { user, refreshUserData } = useAuth()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setEmail(user.email || '')
      setDisplayName(user.display_name || '')
      setBio(user.bio || '')
      setAvatarPreview(user.avatar_url || '')
    }
  }, [user])

  // Validate file before preview
  const validateFile = (file) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB

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
    setAvatarFile(null)
    setAvatarPreview('')
  }

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return

    setUploadingAvatar(true)
    try {
      const response = await userService.uploadAvatar(user.id, avatarFile)
      // Update preview with the server response
      if (response.user) {
        setAvatarPreview(response.user.avatar_url)
      }
      setAvatarFile(null)
      toast.success(t('profile.updated'))
    } catch (err) {
      console.error('Avatar upload error:', err)
      toast.error(err.message || t('profile.updateFailed'))
    } finally {
      setUploadingAvatar(false)
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
        display_name: displayName.trim(),
        bio: bio.trim(),
      }

      // Update profile fields
      const response = await userService.updateProfile(user.id, updateData)

      // Update avatar if a new file was selected
      if (avatarFile) {
        await uploadAvatar()
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
    const name = displayName || username
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('profile.myProfile')}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
            <div className="relative">
              {avatarPreview ? (
                <Avatar
                  src={avatarPreview}
                  alt={displayName || username}
                  size="lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {getInitials()}
                </div>
              )}
              {avatarFile && (
                <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{t('profile.uploadingAvatar')}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 flex-1">
              <label className="block">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || uploadingAvatar}
                >
                  {t('profile.selectFile')}
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={loading || uploadingAvatar}
                />
              </label>

              {avatarPreview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveAvatar}
                  disabled={loading || uploadingAvatar}
                  className="text-red-600 hover:bg-red-50"
                >
                  {t('profile.removeAvatar')}
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

          {/* Display Name */}
          <Input
            label={t('profile.displayName')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            placeholder="John Doe"
            maxLength="128"
          />

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.bio')}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
              placeholder={t('profile.bioPlaceholder')}
              maxLength="500"
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
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
    </div>
  )
}

export default ProfilePage
