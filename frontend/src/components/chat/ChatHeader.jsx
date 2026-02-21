import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useChat } from '../../hooks/useChat'
import { Avatar } from '../common/Avatar'

export function ChatHeader() {
	const { t } = useTranslation()
	const { user } = useAuth()
	const { activeRoom, closeRoom } = useChat()

	if (!activeRoom) return null

	const isGroup = activeRoom.is_group
	const other = activeRoom.members?.find((m) => m.id !== user?.id)
	const displayName = isGroup
		? activeRoom.name || t('chat.group')
		: other?.display_name || other?.username || t('chat.directMessage')
	const subtitle = isGroup
		? `${activeRoom.members?.length || 0} ${t('chat.members')}`
		: other?.is_online
			? t('chat.online')
			: t('chat.offline')

	return (
		<div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
			{/* Back button (mobile) */}
			<button
				onClick={closeRoom}
				className="md:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
			>
				<span className="material-icons-round">arrow_back</span>
			</button>

			{/* Avatar */}
			{isGroup ? (
				<div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
					<span className="material-icons-round text-primary-500">group</span>
				</div>
			) : (
				<div className="relative">
					<Avatar src={other?.avatar_url} alt={displayName} size="md" />
					{other?.is_online && (
						<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
					)}
				</div>
			)}

			{/* Name */}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
					{displayName}
				</p>
				<p className={`text-xs ${other?.is_online ? 'text-green-500' : 'text-slate-400'}`}>
					{subtitle}
				</p>
			</div>
		</div>
	)
}
