import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { Button, Input, Card, Avatar, Spinner } from '../components/common'
import toast from 'react-hot-toast'

function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '')

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
    </div>
  )
}

export default ProfilePage
