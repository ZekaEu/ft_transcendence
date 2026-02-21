import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { gameService } from '../services/gameService'

const ANSWER_COLORS = [
    { bg: 'bg-blue-600', shadow: 'shadow-[0_8px_0_rgb(29,78,216)]', hover: 'hover:bg-blue-500', icon: 'circle' },
    { bg: 'bg-red-600', shadow: 'shadow-[0_8px_0_rgb(185,28,28)]', hover: 'hover:bg-red-500', icon: 'square' },
    { bg: 'bg-amber-500', shadow: 'shadow-[0_8px_0_rgb(180,83,9)]', hover: 'hover:bg-amber-400', icon: 'change_history' },
    { bg: 'bg-emerald-600', shadow: 'shadow-[0_8px_0_rgb(4,120,87)]', hover: 'hover:bg-emerald-500', icon: 'diamond' },
]
const INDEX_LABELS = ['A', 'B', 'C', 'D']

function GamePage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [phase, setPhase] = useState('loading') // loading, question, feedback, results
    const [question, setQuestion] = useState(null)
    const [timeLeft, setTimeLeft] = useState(0)
    const [totalTime, setTotalTime] = useState(15)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [lastResult, setLastResult] = useState(null)
    const [myScore, setMyScore] = useState(0)
    const [scoreboard, setScoreboard] = useState([])
    const [room, setRoom] = useState(null)
    const [streak, setStreak] = useState(0)
    const timerRef = useRef(null)

    // ── Restore room on mount ─────────────
    useEffect(() => {
        const init = async () => {
            try {
                const currentRoom = await gameService.getCurrentRoom()
                if (currentRoom && currentRoom.status === 'playing') {
                    setRoom(currentRoom)
                } else {
                    navigate('/lobby')
                }
            } catch {
                navigate('/lobby')
            }
        }
        init()
    }, [navigate])

    // ── Socket connection ─────────────────
    useEffect(() => {
        if (!room) return
        const token = localStorage.getItem('authToken')
        if (!token) return

        const socket = gameService.connectSocket(token)
        gameService.joinGameRoom(room.id, token)

        gameService.onNewQuestion((data) => {
            setQuestion(data)
            setTimeLeft(data.time)
            setTotalTime(data.time)
            setSelectedAnswer(null)
            setLastResult(null)
            setPhase('question')
        })

        gameService.onAnswerResult((data) => {
            setLastResult(data)
            setMyScore(data.total_score)
            if (data.correct) {
                setStreak((prev) => prev + 1)
            } else {
                setStreak(0)
            }
            setPhase('feedback')
        })

        gameService.onScoreboardUpdate((data) => {
            setScoreboard(data.scoreboard)
        })

        gameService.onGameFinished((data) => {
            setScoreboard(data.scoreboard)
            setPhase('results')
        })

        gameService.onError((err) => {
            console.error('[game] error:', err.message)
        })

        // Don't emit game_started here — LobbyPage already did it

        return () => {
            gameService.offNewQuestion()
            gameService.offAnswerResult()
            gameService.offScoreboardUpdate()
            gameService.offGameFinished()
            gameService.offError()
            gameService.disconnectSocket()
        }
    }, [room])

    // ── Countdown timer ───────────────────
    useEffect(() => {
        if (phase !== 'question' || timeLeft <= 0) {
            if (phase === 'question' && timeLeft <= 0 && selectedAnswer === null) {
                // Time expired without answering
                setLastResult({ correct: false, correct_answer: question?.answer, points: 0, total_score: myScore })
                setStreak(0)
                setPhase('feedback')
                // Host reports time expiry
                if (room && user && room.host_id === user.id) {
                    const token = localStorage.getItem('authToken')
                    gameService.emitTimeExpired(room.id, token)
                }
            }
            return
        }

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timerRef.current)
    }, [phase, timeLeft])

    // ── Handle answer ─────────────────────
    const handleAnswer = useCallback((index) => {
        if (phase !== 'question' || selectedAnswer !== null) return
        setSelectedAnswer(index)
        clearInterval(timerRef.current)

        const token = localStorage.getItem('authToken')
        gameService.submitAnswer(room.id, index, timeLeft, token)
    }, [phase, selectedAnswer, room, timeLeft])

    // ── Loading state ─────────────────────
    if (phase === 'loading' || !room) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">{t('game.loading')}</p>
            </div>
        )
    }

    // ── Results screen ────────────────────
    if (phase === 'results') {
        return <ResultsView scoreboard={scoreboard} user={user} room={room} navigate={navigate} t={t} />
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            {/* Timer Bar */}
            <div className="w-full max-w-3xl mb-12">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {t('game.timeRemaining')}
                    </span>
                    <span className={`text-2xl font-black ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                        {timeLeft}s
                    </span>
                </div>
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-linear rounded-full ${timeLeft < 5 ? 'bg-red-500' : 'bg-yellow-500'}`}
                        style={{ width: `${(timeLeft / totalTime) * 100}%` }}
                    />
                </div>
            </div>

            {/* Question Card */}
            {question && (
                <div className="w-full glass rounded-[2rem] p-8 md:p-12 mb-12 shadow-2xl text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-500" />
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <span className="inline-block px-4 py-1 rounded-full bg-primary-500/10 text-primary-500 text-xs font-bold uppercase tracking-wider">
                            {t('game.questionOf', { current: question.index + 1, total: question.total })}
                        </span>
                        {question.category && (
                            <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-xs font-bold uppercase tracking-wider">
                                {question.category}
                            </span>
                        )}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold leading-tight text-slate-800 dark:text-white">
                        {question.question}
                    </h2>
                </div>
            )}

            {/* Options Grid */}
            {question && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-12">
                    {question.options.map((option, i) => {
                        let state = 'idle'
                        if (phase === 'feedback' && lastResult) {
                            if (i === lastResult.correct_answer) {
                                state = 'correct'
                            } else if (i === selectedAnswer && !lastResult.correct) {
                                state = 'wrong'
                            }
                        }
                        return (
                            <AnswerButton
                                key={i}
                                index={INDEX_LABELS[i]}
                                label={option}
                                color={ANSWER_COLORS[i]}
                                onClick={() => handleAnswer(i)}
                                state={state}
                                disabled={phase !== 'question' || selectedAnswer !== null}
                            />
                        )
                    })}
                </div>
            )}

            {/* Bottom Stats */}
            <div className="w-full flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('game.score')}</span>
                        <span className="text-2xl font-black text-primary-500">{myScore.toLocaleString()}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('game.combo')}</span>
                        <span className="text-2xl font-black text-orange-500 flex items-center gap-1">
                            {streak} <span className="material-icons-round text-sm">local_fire_department</span>
                        </span>
                    </div>
                </div>

                {/* Mini scoreboard */}
                {scoreboard.length > 0 && (
                    <div className="flex items-center gap-2">
                        {scoreboard.slice(0, 4).map((p, i) => (
                            <div key={p.user_id} className="flex items-center gap-1 text-sm" title={`${p.display_name}: ${p.score}`}>
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-xs font-bold border border-white dark:border-slate-900">
                                    {p.avatar_url ? (
                                        <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        p.username?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <span className="font-bold text-slate-600 dark:text-slate-300">{p.score}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Feedback Overlay */}
            {phase === 'feedback' && lastResult && (
                <div className="fixed bottom-6 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                    <div className={`flex items-center gap-2 font-bold text-lg ${lastResult.correct ? 'text-green-500' : 'text-red-500'}`}>
                        <span className="material-icons-round text-2xl">{lastResult.correct ? 'check_circle' : 'cancel'}</span>
                        <span>
                            {lastResult.correct
                                ? `${t('game.amazing')} +${lastResult.points}`
                                : t('game.almost', { answer: question?.options[lastResult.correct_answer] || '' })}
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm font-medium bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full">{t('game.nextQuestion')}</p>
                </div>
            )}
        </div>
    )
}

// ──────────────────────────────────────────────
// Answer Button
// ──────────────────────────────────────────────
function AnswerButton({ index, label, color, onClick, state, disabled }) {
    let buttonClass = `${color.bg} ${color.shadow} ${color.hover}`
    if (state === 'correct') {
        buttonClass = 'bg-green-500 shadow-[0_8px_0_rgb(34,197,94)] animate-bounce-subtle'
    } else if (state === 'wrong') {
        buttonClass = 'bg-red-500 shadow-[0_8px_0_rgb(239,68,68)] opacity-100'
    }

    const opacity = state === 'idle' ? '' : (state === 'correct' || state === 'wrong' ? 'opacity-100' : 'opacity-40')

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`group relative flex items-center p-6 text-white rounded-2xl active:shadow-none active:translate-y-[8px] transition-all overflow-hidden h-24 ${buttonClass} ${opacity} ${disabled ? 'cursor-not-allowed' : ''}`}
        >
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 font-black mr-4">{index}</span>
            <span className="text-xl font-bold">{label}</span>
            {state === 'correct' && <span className="material-icons-round ml-auto text-3xl">check_circle</span>}
            <div className="absolute right-[-10%] top-[-20%] opacity-10 scale-150 pointer-events-none">
                <span className="material-icons-round text-9xl">{color.icon}</span>
            </div>
        </button>
    )
}

// ──────────────────────────────────────────────
// Results View (Final Ranking)
// ──────────────────────────────────────────────
function ResultsView({ scoreboard, user, room, navigate, t }) {
    // Compute dense ranks (tied scores share the same position)
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
    const isWinner = winners.some((w) => w.user_id === user?.id)
    const myEntry = scoreboard.find((p) => p.user_id === user?.id)
    const myIdx = scoreboard.findIndex((p) => p.user_id === user?.id)
    const myRank = myIdx >= 0 ? ranks[myIdx] : 0

    const medalColors = ['text-yellow-500', 'text-slate-400', 'text-amber-700']
    const medalIcons = ['emoji_events', 'military_tech', 'military_tech']

    return (
        <main className="relative z-10 max-w-3xl mx-auto text-center animate-in zoom-in duration-500 space-y-8">
            {/* Title */}
            <div className="mb-4">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600">
                    {t('game.gameOver')}
                </h1>
                <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mt-2">
                    {room?.name}
                </p>
            </div>

            {/* Winner spotlight — shows all tied MVPs */}
            {winners.length > 0 && (
                <div className="glass rounded-[2.5rem] p-8 shadow-2xl border border-yellow-400/30">
                    <div className={`flex ${winners.length > 1 ? 'flex-row flex-wrap justify-center gap-8' : 'flex-col items-center'} mb-6`}>
                        {winners.map((w) => (
                            <div key={w.user_id} className="flex flex-col items-center">
                                <div className="relative mb-4">
                                    <div className="absolute -inset-3 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full opacity-60 blur animate-pulse" />
                                    <div className={`relative ${winners.length > 1 ? 'w-20 h-20' : 'w-28 h-28'} rounded-full bg-white dark:bg-slate-700 border-4 border-yellow-400 overflow-hidden`}>
                                        {w.avatar_url ? (
                                            <img src={w.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-secondary-400 text-white text-4xl font-black">
                                                {w.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-slate-900 font-black px-3 py-1 rounded-full shadow-lg text-xs">
                                        MVP
                                    </div>
                                </div>
                                <h2 className={`${winners.length > 1 ? 'text-lg' : 'text-2xl'} font-black text-slate-800 dark:text-white`}>
                                    {w.display_name}
                                </h2>
                            </div>
                        ))}
                    </div>
                    <div className="text-4xl font-black text-yellow-500 flex items-center justify-center gap-2 mt-1">
                        {winner.score.toLocaleString()} <span className="text-lg">pts</span>
                    </div>
                </div>
            )}

            {/* Full ranking */}
            <div className="glass rounded-2xl p-6 border border-white/10 space-y-2">
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center justify-center gap-2">
                    <span className="material-icons-round text-yellow-500">leaderboard</span>
                    {t('game.finalRanking')}
                </h3>
                {scoreboard.map((entry, i) => {
                    const isMe = entry.user_id === user?.id
                    const rank = ranks[i]
                    return (
                        <div
                            key={entry.user_id}
                            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isMe
                                ? 'bg-primary-500/10 border-2 border-primary-500/30'
                                : 'bg-slate-50 dark:bg-slate-800/50'
                                }`}
                        >
                            {/* Rank */}
                            <div className="w-10 text-center">
                                {rank <= 3 ? (
                                    <span className={`material-icons-round text-2xl ${medalColors[rank - 1]}`}>
                                        {medalIcons[rank - 1]}
                                    </span>
                                ) : (
                                    <span className="text-lg font-black text-slate-400">#{rank}</span>
                                )}
                            </div>

                            {/* Avatar + name */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-bold text-sm border-2 border-white dark:border-slate-900 flex-shrink-0">
                                    {entry.avatar_url ? (
                                        <img src={entry.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        entry.username?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <span className={`font-bold truncate ${isMe ? 'text-primary-500' : 'text-slate-800 dark:text-white'}`}>
                                    {entry.display_name}
                                    {isMe && <span className="ml-1 text-xs opacity-60">({t('game.you')})</span>}
                                </span>
                            </div>

                            {/* Score */}
                            <div className="text-right">
                                <span className="text-xl font-black text-slate-700 dark:text-slate-200">
                                    {entry.score.toLocaleString()}
                                </span>
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
                        <p className="text-3xl font-black text-primary-500">#{myRank}</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('game.finalScore')}</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{myEntry.score.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <button
                    onClick={() => navigate('/lobby')}
                    className="flex-1 max-w-xs py-4 px-8 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-black text-lg rounded-2xl shadow-xl hover:opacity-90 transition-all active:scale-95"
                >
                    {t('game.playAgain')}
                </button>
                <button
                    onClick={() => navigate('/')}
                    className="flex-1 max-w-xs py-4 px-8 bg-transparent border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-primary-500 font-bold text-lg rounded-2xl transition-all active:scale-95"
                >
                    {t('game.backMenu')}
                </button>
            </div>
        </main>
    )
}

export default GamePage
