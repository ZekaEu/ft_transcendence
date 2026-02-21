import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { Button, Input, Card, Avatar, Spinner, Badge } from '../components/common'
import { friendService } from '../services/friendService'
import toast from 'react-hot-toast'

function FriendsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [activeTab, setActiveTab] = useState('friends')

  const fetchFriends = useCallback(async () => {
    try {
      const data = await friendService.getFriends()
      setFriends(data)
    } catch (err) {
      console.error('Failed to fetch friends:', err)
    }
  }, [])

  const fetchPending = useCallback(async () => {
    try {
      const data = await friendService.getPendingRequests()
      setPendingRequests(data)
    } catch (err) {
      console.error('Failed to fetch pending requests:', err)
    }
  }, [])

  const fetchSent = useCallback(async () => {
    try {
      const data = await friendService.getSentRequests()
      setSentRequests(data)
    } catch (err) {
      console.error('Failed to fetch sent requests:', err)
    }
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([fetchFriends(), fetchPending(), fetchSent()])
      setLoading(false)
    }
    loadAll()
  }, [fetchFriends, fetchPending, fetchSent])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    friendService.connectSocket(token)

    friendService.onFriendRequest(() => {
      fetchPending()
    })

    friendService.onFriendAccepted(() => {
      fetchFriends()
      fetchPending()
      fetchSent()
    })

    friendService.onFriendRemoved(() => {
      fetchFriends()
    })

    friendService.onFriendStatus((data) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.id === data.user_id ? { ...f, is_online: data.is_online } : f
        )
      )
    })

    return () => {
      friendService.offFriendRequest()
      friendService.offFriendAccepted()
      friendService.offFriendRemoved()
      friendService.offFriendStatus()
    }
  }, [fetchFriends, fetchPending, fetchSent])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return

    setSearchLoading(true)
    try {
      const data = await friendService.searchUsers(searchQuery.trim())
      setSearchResults(data)
    } catch (err) {
      toast.error(t('friends.searchFailed'))
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSendRequest = async (friendId) => {
    try {
      await friendService.sendFriendRequest(friendId)
      toast.success(t('friends.requestSent'))
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === friendId
            ? { ...u, friendship: { status: 'pending', is_sender: true } }
            : u
        )
      )
      fetchSent()
    } catch (err) {
      const msg = err.response?.data?.message || t('friends.requestFailed')
      toast.error(msg)
    }
  }

  const handleAcceptRequest = async (friendshipId) => {
    try {
      await friendService.acceptFriendRequest(friendshipId)
      toast.success(t('friends.requestAccepted'))
      fetchFriends()
      fetchPending()
    } catch (err) {
      toast.error(t('friends.actionFailed'))
    }
  }

  const handleRejectRequest = async (friendshipId) => {
    try {
      await friendService.rejectFriendRequest(friendshipId)
      toast.success(t('friends.requestRejected'))
      fetchPending()
    } catch (err) {
      toast.error(t('friends.actionFailed'))
    }
  }

  const handleRemoveFriend = async (friendId) => {
    try {
      await friendService.removeFriend(friendId)
      setFriends((prev) => prev.filter((f) => f.id !== friendId))
      toast.success(t('friends.friendRemoved'))
    } catch (err) {
      toast.error(t('friends.actionFailed'))
    }
  }

  const handleCancelRequest = async (friendshipId) => {
    try {
      await friendService.rejectFriendRequest(friendshipId)
      toast.success(t('friends.requestCancelled'))
      fetchSent()
    } catch (err) {
      toast.error(t('friends.actionFailed'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    )
  }

  const onlineFriends = friends.filter((f) => f.is_online)
  const offlineFriends = friends.filter((f) => !f.is_online)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('friends.title')}
        </h1>
        {pendingRequests.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            {pendingRequests.length} {t('friends.pendingCount')}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
        {[
          { key: 'friends', label: t('friends.myFriends'), count: friends.length },
          { key: 'pending', label: t('friends.pendingRequests'), count: pendingRequests.length },
          { key: 'search', label: t('friends.findFriends') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-6">
          {onlineFriends.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {t('friends.online')} ({onlineFriends.length})
              </h2>
              {onlineFriends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} onRemove={handleRemoveFriend} t={t} />
              ))}
            </div>
          )}

          {offlineFriends.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-500 dark:text-slate-400">
                {t('friends.offline')} ({offlineFriends.length})
              </h2>
              {offlineFriends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} onRemove={handleRemoveFriend} t={t} />
              ))}
            </div>
          )}

          {friends.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <span className="material-icons-round text-6xl text-slate-300 dark:text-slate-600">group_add</span>
              <p className="text-slate-500 dark:text-slate-400 text-lg">{t('friends.noFriends')}</p>
              <button
                onClick={() => setActiveTab('search')}
                className="px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
              >
                {t('friends.findFriends')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t('friends.receivedRequests')}</h2>
            {pendingRequests.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 py-4">{t('friends.noPending')}</p>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="glass rounded-xl p-4 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={req.user?.avatar_url} alt={req.user?.username} size="md" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{req.user?.display_name || req.user?.username}</p>
                      <p className="text-xs text-slate-500">@{req.user?.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleAcceptRequest(req.id)} className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 transition">
                      {t('friends.accept')}
                    </button>
                    <button onClick={() => handleRejectRequest(req.id)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-red-100 hover:text-red-500 transition">
                      {t('friends.reject')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t('friends.sentRequests')}</h2>
            {sentRequests.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 py-4">{t('friends.noSent')}</p>
            ) : (
              sentRequests.map((req) => (
                <div key={req.id} className="glass rounded-xl p-4 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={req.friend?.avatar_url} alt={req.friend?.username} size="md" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{req.friend?.display_name || req.friend?.username}</p>
                      <p className="text-xs text-slate-500">@{req.friend?.username}</p>
                    </div>
                  </div>
                  <button onClick={() => handleCancelRequest(req.id)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-red-100 hover:text-red-500 transition">
                    {t('friends.cancel')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder={t('friends.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searchLoading}
              />
            </div>
            <Button type="submit" disabled={searchLoading || searchQuery.trim().length < 2}>
              {searchLoading ? <Spinner size="sm" /> : t('friends.search')}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div key={result.id} className="glass rounded-xl p-4 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar src={result.avatar_url} alt={result.username} size="md" />
                      {result.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{result.display_name || result.username}</p>
                      <p className="text-xs text-slate-500">@{result.username}</p>
                    </div>
                  </div>
                  <div>
                    {result.friendship?.status === 'accepted' ? (
                      <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 text-sm font-bold rounded-lg">
                        {t('friends.alreadyFriends')}
                      </span>
                    ) : result.friendship?.status === 'pending' ? (
                      <span className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-sm font-bold rounded-lg">
                        {t('friends.pendingRequest')}
                      </span>
                    ) : (
                      <button onClick={() => handleSendRequest(result.id)} className="px-4 py-2 bg-primary-500 text-white text-sm font-bold rounded-lg hover:bg-primary-600 transition">
                        {t('friends.addFriend')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searchLoading && (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">{t('friends.noResults')}</p>
          )}
        </div>
      )}
    </div>
  )
}

function FriendCard({ friend, onRemove, t }) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div className="glass rounded-xl p-4 border border-white/10 flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar src={friend.avatar_url} alt={friend.username} size="md" />
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white dark:border-slate-900 rounded-full ${friend.is_online ? 'bg-green-500' : 'bg-slate-400'}`}></div>
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{friend.display_name || friend.username}</p>
          <p className={`text-xs font-semibold ${friend.is_online ? 'text-green-500' : 'text-slate-400'}`}>
            {friend.is_online ? t('friends.onlineNow') : t('friends.lastSeen')}
          </p>
        </div>
      </div>
      <div className="relative">
        <button onClick={() => setShowActions(!showActions)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <span className="material-icons-round text-sm">more_vert</span>
        </button>
        {showActions && (
          <div className="absolute right-0 top-10 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-slate-200 dark:border-slate-700 py-1 z-10 min-w-[140px]">
            <button
              onClick={() => { onRemove(friend.id); setShowActions(false) }}
              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"
            >
              {t('friends.remove')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FriendsPage