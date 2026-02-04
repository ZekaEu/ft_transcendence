import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'

function GamePage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [gameState, setGameState] = useState('question') // 'question', 'feedback', 'results'
    const [timeLeft, setTimeLeft] = useState(12)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [score, setScore] = useState(2450)
    const [streak, setStreak] = useState(5)

    // Timer simulation
    useEffect(() => {
        if (gameState !== 'question' || timeLeft <= 0) return

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1)
        }, 1000)

        return () => clearInterval(timer)
    }, [gameState, timeLeft])

    const handleAnswer = (index) => {
        setSelectedAnswer(index)
        setGameState('feedback')
        // Simulate moving to next question or results after feedback
        setTimeout(() => {
            if (streak >= 7) {
                setGameState('results')
            } else {
                // Reset for next question (mocked)
                setGameState('question')
                setTimeLeft(15)
                setSelectedAnswer(null)
                setStreak(prev => prev + 1)
                setScore(prev => prev + 250)
            }
        }, 3000)
    }

    if (gameState === 'results') {
        return <VictoryView user={user} navigate={navigate} />
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            {/* Timer Bar */}
            <div className="w-full max-w-3xl mb-12">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('game.timeRemaining')}</span>
                    <span className={`text-2xl font-black ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>{timeLeft}s</span>
                </div>
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-linear rounded-full ${timeLeft < 5 ? 'bg-red-500' : 'bg-yellow-500'}`}
                        style={{ width: `${(timeLeft / 15) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Question Card */}
            <div className="w-full glass rounded-[2rem] p-8 md:p-12 mb-12 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-500"></div>
                <span className="inline-block px-4 py-1 rounded-full bg-primary-500/10 text-primary-500 text-xs font-bold uppercase tracking-wider mb-6">
                    {t('game.questionOf', { current: streak + 3, total: 15 })}
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold leading-tight text-slate-800 dark:text-white">
                    Which planet in our solar system is known as the "Red Planet"?
                </h2>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-12">
                <AnswerButton
                    index="A"
                    label="Jupiter"
                    color="blue"
                    icon="circle"
                    onClick={() => handleAnswer(0)}
                    state={gameState === 'feedback' ? (selectedAnswer === 0 ? 'wrong' : 'idle') : 'idle'}
                />
                <AnswerButton
                    index="B"
                    label="Mars"
                    color="red"
                    icon="square"
                    onClick={() => handleAnswer(1)}
                    state={gameState === 'feedback' ? 'correct' : 'idle'}
                />
                <AnswerButton
                    index="C"
                    label="Venus"
                    color="amber"
                    icon="change_history"
                    onClick={() => handleAnswer(2)}
                    state={gameState === 'feedback' ? (selectedAnswer === 2 ? 'wrong' : 'idle') : 'idle'}
                />
                <AnswerButton
                    index="D"
                    label="Saturn"
                    color="emerald"
                    icon="diamond"
                    onClick={() => handleAnswer(3)}
                    state={gameState === 'feedback' ? (selectedAnswer === 3 ? 'wrong' : 'idle') : 'idle'}
                />
            </div>

            {/* Bottom Stats & Power-ups */}
            <div className="w-full flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('game.score')}</span>
                        <span className="text-2xl font-black text-primary-500">{score}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('game.combo')}</span>
                        <span className="text-2xl font-black text-orange-500 flex items-center gap-1">
                            {streak} <span className="material-icons-round text-sm">local_fire_department</span>
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <PowerUpButton label="50:50" title="50/50" />
                    <PowerUpButton icon="ac_unit" title="Freeze Time" />
                    <PowerUpButton icon="fast_forward" title="Skip Question" />
                </div>
            </div>

            {/* Feedback Overlay Message */}
            {gameState === 'feedback' && (
                <div className="fixed bottom-6 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                    <div className={`flex items-center gap-2 font-bold ${selectedAnswer === 1 ? 'text-green-500' : 'text-red-500'}`}>
                        <span className="material-icons-round">{selectedAnswer === 1 ? 'check_circle' : 'cancel'}</span>
                        <span>{selectedAnswer === 1 ? t('game.amazing') : t('game.almost', { answer: 'Mars' })}</span>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">{t('game.nextQuestion')}</p>
                </div>
            )}
        </div>
    )
}

function AnswerButton({ index, label, color, icon, onClick, state }) {
    const colors = {
        blue: 'bg-blue-600 shadow-[0_8px_0_rgb(29,78,216)] hover:bg-blue-500',
        red: 'bg-red-600 shadow-[0_8px_0_rgb(185,28,28)] hover:bg-red-500',
        amber: 'bg-amber-500 shadow-[0_8px_0_rgb(180,83,9)] hover:bg-amber-400',
        emerald: 'bg-emerald-600 shadow-[0_8px_0_rgb(4,120,87)] hover:bg-emerald-500',
    }

    let buttonClass = colors[color]
    if (state === 'correct') {
        buttonClass = 'bg-green-500 shadow-[0_8px_0_rgb(34,197,94)] animate-bounce-subtle'
    } else if (state === 'wrong') {
        buttonClass = 'bg-red-500 shadow-[0_8px_0_rgb(239,68,68)] opacity-100'
    }

    const opacity = state === 'idle' ? '' : (state === 'correct' || state === 'wrong' ? 'opacity-100' : 'opacity-40')

    return (
        <button
            onClick={onClick}
            disabled={state !== 'idle'}
            className={`group relative flex items-center p-6 text-white rounded-2xl active:shadow-none active:translate-y-[8px] transition-all overflow-hidden h-24 ${buttonClass} ${opacity}`}
        >
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 font-black mr-4">{index}</span>
            <span className="text-xl font-bold">{label}</span>
            {state === 'correct' && <span className="material-icons-round ml-auto text-3xl">check_circle</span>}
            <div className="absolute right-[-10%] top-[-20%] opacity-10 scale-150 pointer-events-none">
                <span className="material-icons-round text-9xl">{icon}</span>
            </div>
        </button>
    )
}

function PowerUpButton({ label, icon, title }) {
    return (
        <button className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-primary-500 hover:text-primary-500 transition-all shadow-sm group" title={title}>
            {label ? <span className="font-black text-xs group-hover:scale-110 transition-transform">{label}</span> :
                <span className="material-icons-round text-xl group-hover:scale-110 transition-transform">{icon}</span>}
        </button>
    )
}

function VictoryView({ user, navigate }) {
    const { t } = useTranslation()
    return (
        <main className="relative z-10 max-w-4xl mx-auto text-center animate-in zoom-in duration-500">
            <div className="mb-8 animate-bounce-slow">
                <h1 className="text-7xl md:text-8xl font-black text-yellow-500 dark:text-yellow-400 italic tracking-tighter uppercase">
                    {t('game.victory')}
                </h1>
                <p className="text-xl font-bold text-sky-600 dark:text-sky-300 mt-2">{t('game.dominated')}</p>
            </div>

            <div className="glass rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
                <div className="flex flex-col items-center mb-10">
                    <div className="relative mb-6">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full opacity-75 blur animate-pulse"></div>
                        <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full bg-white dark:bg-slate-700 border-4 border-yellow-400 overflow-hidden">
                            <img src={user?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-slate-900 font-black px-4 py-1 rounded-full shadow-lg text-sm">
                            MVP
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">{t('game.finalScore')}</span>
                        <div className="text-6xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                            2,500 <span className="text-2xl text-primary-500">pts</span>
                        </div>
                    </div>
                </div>

                <div className="max-w-md mx-auto mb-12">
                    <div className="flex justify-between items-end mb-3">
                        <div className="text-left">
                            <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{t('game.currentLevel')}</span>
                            <span className="text-2xl font-black text-primary-500">LVL {user?.level || 15}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs font-bold text-sky-400 uppercase animate-pulse">{t('game.levelUp')}</span>
                            <span className="text-2xl font-black text-yellow-500">LVL {(user?.level || 15) + 1}</span>
                        </div>
                    </div>
                    <div className="relative h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-inner">
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-sky-400 animate-fill-bar rounded-full shadow-[0_0_15px_rgba(14,165,233,0.5)]"></div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-3">{t('game.matchXP', { xp: 450 })}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="group relative flex-1 max-w-xs py-5 px-8 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-black text-xl rounded-2xl shadow-xl transform transition-all active:scale-95 hover:-translate-y-1"
                    >
                        {t('game.rematch')}
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 max-w-xs py-5 px-8 bg-transparent border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-primary-500 font-bold text-xl rounded-2xl transition-all active:scale-95"
                    >
                        {t('game.backMenu')}
                    </button>
                </div>
            </div>
        </main>
    )
}

export default GamePage
