import React, { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../common/Avatar'
import apiClient from '../../services/apiClient'

export function NewChatModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { startDM, createGroup, openRoom } = useChat()

  const [tab, setTab] = useState('dm') // 'dm' | 'group'
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const debounceRef = useRef(null)

  const handleSearch = useCallback((query) => {
    setSearch(query)
    clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true)
        const response = await apiClient.get('/auth/users/search', {
          params: { q: query.trim() },
        })
        setResults(response.data || [])
      } catch (err) {
        console.error('Search failed:', err)
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  const handleStartDM = async (otherUser) => {
    setCreating(true)
    try {
      const room = await startDM(otherUser.id)
      if (room) {
        await openRoom(room)
        handleClose()
      }
    } finally {
      setCreating(false)
    }
  }

  const toggleUser = (u) => {
    setSelectedUsers((prev) =>
      prev.find((s) => s.id === u.id)
        ? prev.filter((s) => s.id !== u.id)
        : [...prev, u],
    )
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 1) return
    setCreating(true)
    try {
      const room = await createGroup(
        groupName.trim(),
        selectedUsers.map((u) => u.id),
      )
      if (room) {
        await openRoom(room)
        handleClose()
      }
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setSearch('')
    setResults([])
    setSelectedUsers([])
    setGroupName('')
    setTab('dm')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-10 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {t('chat.newChat')}
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <span className="material-icons-round">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTab('dm')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === 'dm'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="material-icons-round text-base align-middle mr-1">person</span>
            {t('chat.directMessage')}
          </button>
          <button
            onClick={() => setTab('group')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === 'group'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="material-icons-round text-base align-middle mr-1">group_add</span>
            {t('chat.newGroup')}
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Group name (only for group tab) */}
          {tab === 'group' && (
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('chat.groupNamePlaceholder')}
              className="w-full mb-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          )}

          {/* Selected users chips (group only) */}
          {tab === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-xs font-semibold"
                >
                  {u.display_name || u.username}
                  <button onClick={() => toggleUser(u)} className="hover:text-red-500">
                    <span className="material-icons-round text-sm">close</span>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative mb-3">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('chat.searchUsers')}
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {searching && (
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm">
                <span className="material-icons-round animate-spin mr-2 text-base">refresh</span>
                {t('chat.searching')}
              </div>
            )}

            {!searching && search.length >= 2 && results.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                {t('chat.noUsersFound')}
              </div>
            )}

            {!searching &&
              results.map((u) => {
                const isSelected = selectedUsers.find((s) => s.id === u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => (tab === 'dm' ? handleStartDM(u) : toggleUser(u))}
                    disabled={creating}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    } disabled:opacity-50`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar src={u.avatar_url} alt={u.username} size="md" />
                      {u.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {u.display_name || u.username}
                      </p>
                      <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                    </div>
                    {tab === 'dm' && (
                      <span className="material-icons-round text-primary-500 text-lg">chat_bubble</span>
                    )}
                    {tab === 'group' && (
                      <span className={`material-icons-round text-lg ${isSelected ? 'text-primary-500' : 'text-slate-300'}`}>
                        {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    )}
                  </button>
                )
              })}

            {!searching && search.length < 2 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                {t('chat.searchHint')}
              </div>
            )}
          </div>
        </div>

        {/* Footer – group create button */}
        {tab === 'group' && (
          <div className="px-4 pb-4">
            <button
              onClick={handleCreateGroup}
              disabled={creating || !groupName.trim() || selectedUsers.length < 1}
              className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {creating ? (
                <span className="material-icons-round animate-spin text-base">refresh</span>
              ) : (
                <span className="material-icons-round text-base">group_add</span>
              )}
              {t('chat.createGroup')} {selectedUsers.length > 0 && `(${selectedUsers.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
