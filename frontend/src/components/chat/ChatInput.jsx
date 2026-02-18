import React, { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useChat } from '../../hooks/useChat'

export function ChatInput() {
	const { t } = useTranslation()
	const { sendMessage, sendTyping, activeRoom } = useChat()
	const [text, setText] = useState('')
	const typingTimeout = useRef(null)

	const handleTyping = useCallback(() => {
		sendTyping(true)
		clearTimeout(typingTimeout.current)
		typingTimeout.current = setTimeout(() => {
			sendTyping(false)
		}, 2000)
	}, [sendTyping])

	const handleSend = () => {
		if (!text.trim()) return
		sendMessage(text)
		setText('')
		sendTyping(false)
		clearTimeout(typingTimeout.current)
	}

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	if (!activeRoom) return null

	return (
		<div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-white dark:bg-slate-900">
			<div className="flex items-end gap-2">
				<textarea
					value={text}
					onChange={(e) => {
						setText(e.target.value)
						handleTyping()
					}}
					onKeyDown={handleKeyDown}
					placeholder={t('chat.typeMessage')}
					rows={1}
					className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all max-h-32 overflow-y-auto"
					style={{ minHeight: '40px' }}
				/>
				<button
					onClick={handleSend}
					disabled={!text.trim()}
					className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white flex items-center justify-center transition-colors"
				>
					<span className="material-icons-round text-lg">send</span>
				</button>
			</div>
		</div>
	)
}
