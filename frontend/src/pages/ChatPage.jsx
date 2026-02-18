import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChat } from '../hooks/useChat'
import { ChatRoomList, ChatMessages, ChatInput, ChatHeader, NewChatModal } from '../components/chat'

export default function ChatPage() {
	const { t } = useTranslation()
	const { fetchRooms, activeRoom } = useChat()
	const [showNewChat, setShowNewChat] = useState(false)

	useEffect(() => {
		fetchRooms()
	}, [fetchRooms])

	return (
		<div className="flex h-[calc(100vh-180px)] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
			{/* Sidebar – room list */}
			<div
				className={`w-full md:w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900 ${activeRoom ? 'hidden md:flex' : 'flex'
					}`}
			>
				{/* Header */}
				<div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
					<h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
						<span className="material-icons-round text-primary-500">chat</span>
						{t('chat.title')}
					</h2>
					<button
						onClick={() => setShowNewChat(true)}
						className="p-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors shadow-md hover:shadow-lg"
						title={t('chat.newChat')}
					>
						<span className="material-icons-round text-lg">edit_square</span>
					</button>
				</div>

				{/* Room list */}
				<div className="flex-1 overflow-y-auto">
					<ChatRoomList />
				</div>
			</div>

			{/* Main – messages area */}
			<div
				className={`flex-1 flex flex-col ${!activeRoom ? 'hidden md:flex' : 'flex'
					}`}
			>
				{activeRoom ? (
					<>
						<ChatHeader />
						<ChatMessages />
						<ChatInput />
					</>
				) : (
					<div className="flex-1 flex flex-col items-center justify-center text-slate-400">
						<span className="material-icons-round text-6xl mb-4">forum</span>
						<p className="text-lg font-semibold">{t('chat.selectRoom')}</p>
						<p className="text-sm mt-1">{t('chat.selectRoomHint')}</p>
					</div>
				)}
			</div>

			{/* New Chat Modal */}
			<NewChatModal isOpen={showNewChat} onClose={() => setShowNewChat(false)} />
		</div>
	)
}
