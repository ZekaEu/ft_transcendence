import React, { createContext, useState, useEffect, useCallback, useRef } from 'react'
import { chatService } from '../services/chatService'
import { useAuth } from '../hooks/useAuth'

export const ChatContext = createContext(null)

export function ChatProvider({ children }) {
	const { user } = useAuth()
	const [rooms, setRooms] = useState([])
	const [activeRoom, setActiveRoom] = useState(null)
	const [messages, setMessages] = useState([])
	const [typingUsers, setTypingUsers] = useState({}) // { roomId: [{ userId, username }] }
	const [loading, setLoading] = useState(false)
	const [totalUnread, setTotalUnread] = useState(0)
	const socketReady = useRef(false)

	const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

	// ── Connect socket on mount ──────────────
	useEffect(() => {
		if (!user || !token) return

		const sock = chatService.connectSocket(token)
		socketReady.current = true

		// Listen for new messages globally
		chatService.onNewMessage((msg) => {
			// Add to current message list if we're in that room
			setMessages((prev) => {
				if (prev.length > 0 && prev[0]?.room_id === msg.room_id) {
					// Avoid duplicates
					if (prev.find((m) => m.id === msg.id)) return prev
					return [...prev, msg]
				}
				return prev
			})

			// Update room list (bump last_message + unread)
			setRooms((prev) =>
				prev.map((r) => {
					if (r.id === msg.room_id) {
						const isActive = activeRoom?.id === msg.room_id
						return {
							...r,
							last_message: msg,
							unread_count: isActive ? r.unread_count : (r.unread_count || 0) + 1,
							updated_at: msg.created_at,
						}
					}
					return r
				}),
			)
		})

		chatService.onUserTyping(({ room_id, user_id, username, is_typing }) => {
			setTypingUsers((prev) => {
				const current = prev[room_id] || []
				if (is_typing) {
					if (current.find((u) => u.userId === user_id)) return prev
					return { ...prev, [room_id]: [...current, { userId: user_id, username }] }
				} else {
					return { ...prev, [room_id]: current.filter((u) => u.userId !== user_id) }
				}
			})
		})

		chatService.onMessagesRead(({ room_id, reader_id }) => {
			if (reader_id === user.id) return
			setMessages((prev) =>
				prev.map((m) =>
					m.room_id === room_id && m.sender_id === user.id ? { ...m, is_read: true } : m,
				),
			)
		})

		chatService.onError((err) => {
			console.error('[chat] socket error:', err)
		})

		// When a new room is created that we're part of, auto-join and add to list
		chatService.onRoomCreated((roomData) => {
			if (token) {
				chatService.joinRoom(roomData.id, token)
			}
			setRooms((prev) => {
				if (prev.find((r) => r.id === roomData.id)) return prev
				return [roomData, ...prev]
			})
		})

		return () => {
			chatService.offNewMessage()
			chatService.offUserTyping()
			chatService.offMessagesRead()
			chatService.offRoomCreated()
			chatService.offError()
			chatService.disconnectSocket()
			socketReady.current = false
		}
	}, [user, token]) // eslint-disable-line react-hooks/exhaustive-deps

	// ── Compute total unread ─────────────────
	useEffect(() => {
		const total = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0)
		setTotalUnread(total)
	}, [rooms])

	// ── Fetch rooms ──────────────────────────
	const fetchRooms = useCallback(async () => {
		if (!token) return
		try {
			setLoading(true)
			const data = await chatService.getRooms()
			setRooms(data)
		} catch (err) {
			console.error('Failed to fetch rooms:', err)
		} finally {
			setLoading(false)
		}
	}, [token])

	// ── Open a room ──────────────────────────
	const openRoom = useCallback(
		async (room) => {
			setActiveRoom(room)
			try {
				const data = await chatService.getMessages(room.id)
				setMessages(data.messages || [])

				// Join socket room
				if (token) {
					chatService.joinRoom(room.id, token)
					chatService.markReadSocket(room.id, token)
					await chatService.markAsRead(room.id)

					// Clear unread count locally
					setRooms((prev) =>
						prev.map((r) => (r.id === room.id ? { ...r, unread_count: 0 } : r)),
					)
				}
			} catch (err) {
				console.error('Failed to load messages:', err)
			}
		},
		[token],
	)

	// ── Send message ─────────────────────────
	const sendMessage = useCallback(
		(content) => {
			if (!activeRoom || !content.trim() || !token) return
			chatService.sendMessage(activeRoom.id, content.trim(), token)
		},
		[activeRoom, token],
	)

	// ── Typing indicator ────────────────────
	const sendTyping = useCallback(
		(isTyping) => {
			if (!activeRoom || !token) return
			chatService.sendTyping(activeRoom.id, isTyping, token)
		},
		[activeRoom, token],
	)

	// ── Start DM ─────────────────────────────
	const startDM = useCallback(
		async (otherUserId) => {
			if (!user) return null
			try {
				const room = await chatService.createRoom({
					member_ids: [user.id, otherUserId],
					is_group: false,
				})
				await fetchRooms()
				return room
			} catch (err) {
				console.error('Failed to start DM:', err)
				return null
			}
		},
		[user, fetchRooms],
	)

	// ── Create group ─────────────────────────
	const createGroup = useCallback(
		async (name, memberIds) => {
			if (!user) return null
			try {
				const room = await chatService.createRoom({
					member_ids: [...memberIds, user.id],
					is_group: true,
					name,
				})
				await fetchRooms()
				return room
			} catch (err) {
				console.error('Failed to create group:', err)
				return null
			}
		},
		[user, fetchRooms],
	)

	// ── Close room ───────────────────────────
	const closeRoom = useCallback(() => {
		if (activeRoom) {
			chatService.leaveSocketRoom(activeRoom.id)
		}
		setActiveRoom(null)
		setMessages([])
	}, [activeRoom])

	const value = {
		rooms,
		activeRoom,
		messages,
		typingUsers,
		loading,
		totalUnread,
		fetchRooms,
		openRoom,
		closeRoom,
		sendMessage,
		sendTyping,
		startDM,
		createGroup,
	}

	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
