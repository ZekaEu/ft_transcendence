import React from 'react'
import { useTranslation } from 'react-i18next'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../common/Avatar'

export function ChatRoomList() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { rooms, activeRoom, openRoom, loading } = useChat()

  if (loading && rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <span className="material-icons-round animate-spin mr-2">refresh</span>
        {t('chat.loading')}
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 px-4 text-center">
        <span className="material-icons-round text-4xl mb-2">chat_bubble_outline</span>
        <p className="text-sm">{t('chat.noRooms')}</p>
      </div>
    )
  }

  const getRoomDisplayName = (room) => {
    if (room.is_group) return room.name || t('chat.group')
    // DM: show the other user's name
    const other = room.members?.find((m) => m.id !== user?.id)
    return other?.display_name || other?.username || t('chat.directMessage')
  }

  const getRoomAvatar = (room) => {
    if (room.is_group) return null
    const other = room.members?.find((m) => m.id !== user?.id)
    return other?.avatar_url
  }

  const getOtherOnline = (room) => {
    if (room.is_group) return false
    const other = room.members?.find((m) => m.id !== user?.id)
    return other?.is_online
  }

  const formatTime = (isoStr) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const now = new Date()
    const diff = now - d
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {rooms.map((room) => {
        const isActive = activeRoom?.id === room.id
        return (
          <button
            key={room.id}
            onClick={() => openRoom(room)}
            className={`flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 dark:border-slate-800 hover:bg-sky-50 dark:hover:bg-slate-800 ${
              isActive ? 'bg-sky-50 dark:bg-slate-800 border-l-4 border-l-primary-500' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {room.is_group ? (
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <span className="material-icons-round text-primary-500 text-lg">group</span>
                </div>
              ) : (
                <Avatar src={getRoomAvatar(room)} alt={getRoomDisplayName(room)} size="md" />
              )}
              {!room.is_group && getOtherOnline(room) && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {getRoomDisplayName(room)}
                </p>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                  {formatTime(room.last_message?.created_at || room.updated_at)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-slate-400 truncate">
                  {room.last_message
                    ? `${room.last_message.sender_id === user?.id ? t('chat.you') + ': ' : ''}${room.last_message.content}`
                    : t('chat.noMessages')}
                </p>
                {room.unread_count > 0 && (
                  <span className="ml-2 flex-shrink-0 bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {room.unread_count > 9 ? '9+' : room.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
