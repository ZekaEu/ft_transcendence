import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useChat } from '../../hooks/useChat'

export function ChatMessages() {
	const { t } = useTranslation()
	const { user } = useAuth()
	const { messages, typingUsers, activeRoom } = useChat()

	const formatTime = (isoStr) => {
		if (!isoStr) return ''
		return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	}

	const formatDateSeparator = (isoStr) => {
		if (!isoStr) return ''
		const d = new Date(isoStr)
		const today = new Date()
		const yesterday = new Date(today)
		yesterday.setDate(yesterday.getDate() - 1)

		if (d.toDateString() === today.toDateString()) return t('chat.today')
		if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday')
		return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
	}

	// Group messages by date
	const grouped = []
	let lastDate = null
	messages.forEach((msg) => {
		const msgDate = new Date(msg.created_at).toDateString()
		if (msgDate !== lastDate) {
			grouped.push({ type: 'date', date: msg.created_at })
			lastDate = msgDate
		}
		grouped.push({ type: 'message', ...msg })
	})

	const roomTyping = typingUsers[activeRoom?.id] || []

	return (
		<div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
			{grouped.length === 0 && (
				<div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
					<span className="material-icons-round text-3xl mb-2">forum</span>
					{t('chat.startConversation')}
				</div>
			)}

			{grouped.map((item, index) => {
				if (item.type === 'date') {
					return (
						<div key={`date-${index}`} className="flex items-center justify-center my-4">
							<span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
								{formatDateSeparator(item.date)}
							</span>
						</div>
					)
				}

				const isOwn = item.sender_id === user?.id
				const isSystem = item.is_system

				if (isSystem) {
					return (
						<div key={item.id} className="flex justify-center my-2">
							<span className="text-xs text-slate-400 italic">{item.content}</span>
						</div>
					)
				}

				return (
					<div
						key={item.id}
						className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
					>
						<div
							className={`max-w-[75%] px-3 py-2 rounded-2xl ${isOwn
								? 'bg-primary-500 text-white rounded-br-md'
								: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'
								}`}
						>
							{!isOwn && activeRoom?.is_group && (
								<p className="text-xs font-semibold text-primary-400 mb-0.5">
									{item.sender_username}
								</p>
							)}
							<p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>
							<div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
								<span className={`text-[10px] ${isOwn ? 'text-primary-200' : 'text-slate-400'}`}>
									{formatTime(item.created_at)}
								</span>
								{isOwn && (
									<span className={`material-icons-round text-xs ${item.is_read ? 'text-primary-200' : 'text-primary-300'}`}>
										{item.is_read ? 'done_all' : 'done'}
									</span>
								)}
							</div>
						</div>
					</div>
				)
			})}

			{/* Typing indicator */}
			{roomTyping.length > 0 && (
				<div className="flex items-center gap-2 px-2 py-1">
					<div className="flex gap-1">
						<span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
						<span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
						<span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
					</div>
					<span className="text-xs text-slate-400">
						{roomTyping.map((u) => u.username).join(', ')} {t('chat.isTyping')}
					</span>
				</div>
			)}
		</div>
	)
}
