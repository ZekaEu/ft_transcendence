import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { memoryService } from '../services/memoryService'

function MemoryGamePage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const spectateRoomId = searchParams.get('spectate')
    const [isSpectator, setIsSpectator] = useState(!!spectateRoomId)

    const [phase, setPhase] = useState('loading') // loading, playing, results
    const [board, setBoard] = useState([])
    const [rows, setRows] = useState(0)
    const [cols, setCols] = useState(0)
    const [currentTurn, setCurrentTurn] = useState(null)
    const [scoreboard, setScoreboard] = useState([])
    const [room, setRoom] = useState(null)
    const [totalPairs, setTotalPairs] = useState(0)
    const [matchedPairs, setMatchedPairs] = useState(0)
    const [lastMatch, setLastMatch] = useState(null)
    const [flipAnimation, setFlipAnimation] = useState({}) // { cardId: true }
    const [matchAnimation, setMatchAnimation] = useState({}) // { cardId: true }
    const [powerups, setPowerups] = useState({})
    const [usedThisTurn, setUsedThisTurn] = useState({})
    const [peekCards, setPeekCards] = useState({}) // { cardId: symbol }
    const [revealedPair, setRevealedPair] = useState({}) // { cardId: symbol }
    const [streak, setStreak] = useState(0)

    // ── Restore room on mount ─────────────
    useEffect(() => {
        const init = async () => {
            try {
                if (spectateRoomId) {
                    const roomData = await memoryService.getRoom(spectateRoomId)
                    if (roomData && roomData.status === 'playing') {
                        setRoom(roomData)
                        setIsSpectator(true)
                    } else {
                        navigate('/lobby')
                    }
                } else {
                    const currentRoom = await memoryService.getCurrentRoom()
                    if (currentRoom && currentRoom.status === 'playing') {
                        setRoom(currentRoom)
                    } else {
                        navigate('/lobby')
                    }
                    const invRes = await memoryService.getInventory()
                    const inv = {}
                    ;(invRes.inventory || []).forEach((r) => { inv[r.powerup_type] = r.quantity })
                    setPowerups(inv)
                }
            } catch {
                navigate('/lobby')
            }
        }
        init()
    }, [navigate, spectateRoomId])

    // ── Socket connection ─────────────────
    useEffect(() => {
        if (!room) return
        const token = localStorage.getItem('authToken')
        if (!token) return

        memoryService.connectSocket(token)
        memoryService.joinMemoryRoom(room.id, token, isSpectator)

        memoryService.onBoardState((data) => {
            setBoard(data.board)
            setRows(data.rows)
            setCols(data.cols)
            setCurrentTurn(data.current_turn)
            setScoreboard(data.scores)
            setTotalPairs(data.total_pairs)
            setMatchedPairs(data.matched_pairs)
            setPhase('playing')
        })

        memoryService.onCardFlipped((data) => {
            setBoard((prev) => prev.map((card) =>
                card.id === data.card_id
                    ? { ...card, symbol: data.symbol, flipped: true }
                    : card
            ))
            setFlipAnimation((prev) => ({ ...prev, [data.card_id]: true }))
            setTimeout(() => {
                setFlipAnimation((prev) => {
                    const next = { ...prev }
                    delete next[data.card_id]
                    return next
                })
            }, 600)
        })

        memoryService.onMatch((data) => {
            setBoard((prev) => prev.map((card) =>
                card.id === data.card1_id || card.id === data.card2_id
                    ? { ...card, matched: true, flipped: true }
                    : card
            ))
            setMatchAnimation({ [data.card1_id]: true, [data.card2_id]: true })
            setTimeout(() => setMatchAnimation({}), 1000)
            setLastMatch({ userId: data.user_id, points: data.points, streak: data.streak })
            if (data.user_id === user?.id) {
                setStreak(data.streak)
            }
            setScoreboard(data.scores)
            setMatchedPairs(data.matched_pairs)
            setTotalPairs(data.total_pairs)
            setTimeout(() => setLastMatch(null), 2000)
        })

        memoryService.onNoMatch((data) => {
            setTimeout(() => {
                setBoard((prev) => prev.map((card) =>
                    card.id === data.card1_id || card.id === data.card2_id
                        ? { ...card, symbol: null, flipped: false }
                        : card
                ))
            }, 300)
            if (data.user_id === user?.id) {
                setStreak(0)
            }
        })

        memoryService.onTurnChange((data) => {
            setCurrentTurn(data.current_turn)
            setScoreboard(data.scores)
            setUsedThisTurn({})
            setPeekCards({})
            setRevealedPair({})
        })

        memoryService.onGameFinished((data) => {
            setScoreboard(data.scoreboard)
            setPhase('results')
        })

        memoryService.onPowerupResult((data) => {
            if (!data.success) return
            if (data.powerup_type === 'peek' && data.peek_cards) {
                const peek = {}
                data.peek_cards.forEach((c) => { peek[c.id] = c.symbol })
                setPeekCards(peek)
                // Auto-hide after 2s
                setTimeout(() => setPeekCards({}), 2000)
            } else if (data.powerup_type === 'match_reveal' && data.revealed_pair) {
                const reveal = {}
                data.revealed_pair.forEach((c) => { reveal[c.id] = c.symbol })
                setRevealedPair(reveal)
                setTimeout(() => setRevealedPair({}), 3000)
            }
            setPowerups((prev) => {
                const updated = { ...prev }
                if (updated[data.powerup_type]) {
                    updated[data.powerup_type] = Math.max(0, updated[data.powerup_type] - 1)
                }
                return updated
            })
        })

        memoryService.onError((err) => {
            console.error('[memory] error:', err.message)
        })

        return () => {
            memoryService.offBoardState()
            memoryService.offCardFlipped()
            memoryService.offMatch()
            memoryService.offNoMatch()
            memoryService.offTurnChange()
            memoryService.offGameFinished()
            memoryService.offPowerupResult()
            memoryService.offError()
            memoryService.disconnectSocket()
        }
    }, [room, isSpectator, user?.id])

    // ── Handle card flip ──────────────────
    const handleFlip = useCallback((cardId) => {
        if (isSpectator) return
        if (phase !== 'playing') return
        if (currentTurn !== user?.id) return

        const card = board.find((c) => c.id === cardId)
        if (!card || card.matched || card.flipped) return

        const token = localStorage.getItem('authToken')
        memoryService.flipCard(room.id, cardId, token)
    }, [isSpectator, phase, currentTurn, user?.id, board, room])

    // ── Handle powerup ────────────────────
    const handleUsePowerup = useCallback((type) => {
        if (isSpectator) return
        if (phase !== 'playing') return
        if (currentTurn !== user?.id) return
        if (usedThisTurn[type]) return
        if (!powerups[type] || powerups[type] <= 0) return

        const token = localStorage.getItem('authToken')
        memoryService.usePowerup(room.id, type, token)
        setUsedThisTurn((prev) => ({ ...prev, [type]: true }))
    }, [isSpectator, phase, currentTurn, user?.id, room, powerups, usedThisTurn])

    // ── Loading ───────────────────────────
    if (phase === 'loading' || !room) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">{t('memory.loading')}</p>
            </div>
        )
    }

    // ── Results ───────────────────────────
    if (phase === 'results') {
        return <MemoryResultsView scoreboard={scoreboard} user={user} room={room} navigate={navigate} t={t} isSpectator={isSpectator} />
    }

    const isMyTurn = currentTurn === user?.id
    const currentPlayer = scoreboard.find((p) => p.user_id === currentTurn)

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
            {/* Spectator Banner */}
            {isSpectator && (
                <div className="w-full max-w-4xl flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30">
                    <span className="material-icons-round text-purple-500">visibility</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{t('game.spectating')}</span>
                </div>
            )}

            {/* Turn indicator */}
            <div className="w-full max-w-4xl">
                <div className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl transition-all ${isMyTurn && !isSpectator
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/50'
                    : 'glass border border-white/10'
                }`}>
                    {currentPlayer && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-900">
                            {currentPlayer.avatar_url ? (
                                <img src={currentPlayer.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                currentPlayer.username?.charAt(0).toUpperCase()
                            )}
                        </div>
                    )}
                    <span className={`font-bold text-lg ${isMyTurn && !isSpectator ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                        {isMyTurn && !isSpectator ? t('memory.yourTurn') : t('memory.playerTurn', { player: currentPlayer?.display_name || '...' })}
                    </span>
                    <span className="text-sm text-slate-400 ml-2">
                        {matchedPairs}/{totalPairs} {t('memory.pairsFound')}
                    </span>
                </div>
            </div>

            {/* Board */}
            <div
                className="grid gap-2 md:gap-3 w-full max-w-4xl px-2"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
                {board.map((card) => {
                    const isPeeked = peekCards[card.id]
                    const isRevealed = revealedPair[card.id]
                    const showSymbol = card.matched || card.flipped || isPeeked || isRevealed
                    const displaySymbol = card.symbol || isPeeked || isRevealed

                    return (
                        <button
                            key={card.id}
                            onClick={() => handleFlip(card.id)}
                            disabled={isSpectator || !isMyTurn || card.matched || card.flipped}
                            className={`
                                relative aspect-square rounded-xl md:rounded-2xl text-3xl md:text-5xl
                                flex items-center justify-center
                                transition-all duration-300 transform
                                ${card.matched
                                    ? 'bg-emerald-500/20 border-2 border-emerald-500/50 scale-95 opacity-60'
                                    : showSymbol
                                        ? isPeeked
                                            ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400 shadow-lg shadow-yellow-400/20'
                                            : isRevealed
                                                ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 shadow-lg shadow-blue-400/20 animate-pulse'
                                                : 'bg-white dark:bg-slate-700 border-2 border-emerald-400 shadow-lg'
                                        : `bg-gradient-to-br from-emerald-500 to-teal-600 border-2 border-emerald-600 shadow-md
                                           ${!isSpectator && isMyTurn ? 'hover:scale-105 hover:shadow-xl hover:border-emerald-400 cursor-pointer active:scale-95' : 'cursor-not-allowed'}`
                                }
                                ${flipAnimation[card.id] ? 'animate-flip' : ''}
                                ${matchAnimation[card.id] ? 'animate-match-pop' : ''}
                            `}
                        >
                            {showSymbol ? (
                                <span className={`${card.matched ? 'opacity-50' : ''}`}>{displaySymbol}</span>
                            ) : (
                                <span className="text-white/30 text-2xl md:text-3xl">❓</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Power-up Buttons */}
            {!isSpectator && isMyTurn && phase === 'playing' && (
                <div className="flex items-center justify-center gap-3">
                    {/* Peek */}
                    {(powerups.peek > 0 || usedThisTurn.peek) && (
                        <button
                            onClick={() => handleUsePowerup('peek')}
                            disabled={usedThisTurn.peek}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                                usedThisTurn.peek
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:opacity-90 shadow-lg'
                            }`}
                        >
                            <span className="material-icons-round text-lg">preview</span>
                            {t('memory.powerup_peek')}
                            {!usedThisTurn.peek && (
                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{powerups.peek}</span>
                            )}
                        </button>
                    )}

                    {/* Match Reveal */}
                    {(powerups.match_reveal > 0 || usedThisTurn.match_reveal) && (
                        <button
                            onClick={() => handleUsePowerup('match_reveal')}
                            disabled={usedThisTurn.match_reveal}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                                usedThisTurn.match_reveal
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90 shadow-lg'
                            }`}
                        >
                            <span className="material-icons-round text-lg">auto_fix_high</span>
                            {t('memory.powerup_match_reveal')}
                            {!usedThisTurn.match_reveal && (
                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{powerups.match_reveal}</span>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Match feedback */}
            {lastMatch && (
                <div className="fixed bottom-6 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 font-bold text-lg text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-6 py-3 rounded-2xl shadow-xl">
                        <span className="material-icons-round text-2xl">check_circle</span>
                        <span>+{lastMatch.points}</span>
                        {lastMatch.streak > 1 && (
                            <span className="text-orange-500 flex items-center gap-1">
                                🔥 ×{lastMatch.streak}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom scoreboard */}
            <div className="w-full max-w-4xl flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                {scoreboard.map((p) => {
                    const isMe = p.user_id === user?.id
                    const isCurrent = p.user_id === currentTurn
                    return (
                        <div
                            key={p.user_id}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isCurrent
                                ? 'bg-emerald-500/10 border border-emerald-500/30 ring-2 ring-emerald-400/50'
                                : 'bg-slate-50 dark:bg-slate-800/50'
                            }`}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold border dark:border-slate-900">
                                {p.avatar_url ? (
                                    <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    p.username?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="text-left">
                                <p className={`text-xs font-bold truncate max-w-[80px] ${isMe ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {p.display_name}
                                </p>
                                <p className="text-sm font-black text-slate-800 dark:text-white">{p.score}</p>
                            </div>
                            <div className="text-right ml-1">
                                <p className="text-[10px] text-slate-400">{p.pairs_found} {t('memory.pairs')}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}


function MemoryResultsView({ scoreboard, user, room, navigate, t, isSpectator }) {
    const ranks = []
    scoreboard.forEach((entry, i) => {
        if (i === 0) {
            ranks.push(1)
        } else {
            ranks.push(entry.score === scoreboard[i - 1].score ? ranks[i - 1] : i + 1)
        }
    })

    const winner = scoreboard[0]
    const winners = scoreboard.filter((p) => p.score === winner?.score)
    const myEntry = scoreboard.find((p) => p.user_id === user?.id)
    const myIdx = scoreboard.findIndex((p) => p.user_id === user?.id)
    const myRank = myIdx >= 0 ? ranks[myIdx] : 0

    const medalColors = ['text-yellow-500', 'text-slate-400', 'text-amber-700']

    return (
        <main className="relative z-10 max-w-3xl mx-auto text-center animate-in zoom-in duration-500 space-y-8">
            <div className="mb-4">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-600">
                    {t('game.gameOver')}
                </h1>
                <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mt-2">
                    {room?.name}
                </p>
            </div>

            {/* Winner spotlight */}
            {winners.length > 0 && (
                <div className="glass rounded-[2.5rem] p-8 shadow-2xl border border-emerald-400/30">
                    <div className={`flex ${winners.length > 1 ? 'flex-row flex-wrap justify-center gap-8' : 'flex-col items-center'} mb-6`}>
                        {winners.map((w) => (
                            <div key={w.user_id} className="flex flex-col items-center">
                                <div className="relative mb-4">
                                    <div className="absolute -inset-3 bg-gradient-to-tr from-emerald-400 to-teal-600 rounded-full opacity-60 blur animate-pulse" />
                                    <div className={`relative ${winners.length > 1 ? 'w-20 h-20' : 'w-28 h-28'} rounded-full bg-white dark:bg-slate-700 border-4 border-emerald-400 overflow-hidden`}>
                                        {w.avatar_url ? (
                                            <img src={w.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-400 text-white text-4xl font-black">
                                                {w.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-emerald-400 text-slate-900 font-black px-3 py-1 rounded-full shadow-lg text-xs">
                                        MVP
                                    </div>
                                </div>
                                <h2 className={`${winners.length > 1 ? 'text-lg' : 'text-2xl'} font-black text-slate-800 dark:text-white`}>
                                    {w.display_name}
                                </h2>
                            </div>
                        ))}
                    </div>
                    <div className="text-4xl font-black text-emerald-500 flex items-center justify-center gap-2 mt-1">
                        {winner.score.toLocaleString()} <span className="text-lg">pts</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-2">
                        {winner.pairs_found} {t('memory.pairsFound')} · {winner.moves} {t('memory.moves')}
                    </p>
                </div>
            )}

            {/* Full ranking */}
            <div className="glass rounded-2xl p-6 border border-white/10 space-y-2">
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center justify-center gap-2">
                    <span className="material-icons-round text-emerald-500">leaderboard</span>
                    {t('game.finalRanking')}
                </h3>
                {scoreboard.map((entry, i) => {
                    const isMe = entry.user_id === user?.id
                    const rank = ranks[i]
                    return (
                        <div
                            key={entry.user_id}
                            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isMe
                                ? 'bg-emerald-500/10 border-2 border-emerald-500/30'
                                : 'bg-slate-50 dark:bg-slate-800/50'
                            }`}
                        >
                            <div className="w-10 text-center">
                                {rank <= 3 ? (
                                    <span className={`material-icons-round text-2xl ${medalColors[rank - 1]}`}>emoji_events</span>
                                ) : (
                                    <span className="text-lg font-black text-slate-400">#{rank}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white font-bold text-sm border-2 border-white dark:border-slate-900 flex-shrink-0">
                                    {entry.avatar_url ? (
                                        <img src={entry.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        entry.username?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <span className={`font-bold truncate block ${isMe ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
                                        {entry.display_name}
                                        {isMe && <span className="ml-1 text-xs opacity-60">({t('game.you')})</span>}
                                    </span>
                                    <span className="text-xs text-slate-400">{entry.pairs_found} {t('memory.pairs')} · {entry.moves} {t('memory.moves')}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-black text-slate-700 dark:text-slate-200">{entry.score.toLocaleString()}</span>
                                <span className="text-xs text-slate-400 ml-1">pts</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Your stats */}
            {myEntry && (
                <div className="glass rounded-xl p-5 border border-white/10 flex items-center justify-around">
                    <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('game.yourRank')}</p>
                        <p className="text-3xl font-black text-emerald-500">#{myRank}</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('game.finalScore')}</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{myEntry.score.toLocaleString()}</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('memory.pairs')}</p>
                        <p className="text-3xl font-black text-teal-500">{myEntry.pairs_found}</p>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <button
                    onClick={() => navigate('/lobby')}
                    className="flex-1 max-w-xs py-4 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-lg rounded-2xl shadow-xl hover:opacity-90 transition-all active:scale-95"
                >
                    {t('game.playAgain')}
                </button>
                <button
                    onClick={() => navigate('/')}
                    className="flex-1 max-w-xs py-4 px-8 bg-transparent border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-emerald-500 font-bold text-lg rounded-2xl transition-all active:scale-95"
                >
                    {t('game.backMenu')}
                </button>
            </div>
        </main>
    )
}

export default MemoryGamePage
