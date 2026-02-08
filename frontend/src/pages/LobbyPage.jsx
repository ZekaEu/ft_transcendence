import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'

function LobbyPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [status, setStatus] = useState('searching') // 'searching', 'found', 'starting'
    const [countdown, setCountdown] = useState(5)

    useEffect(() => {
        // Simulate finding an opponent after 3 seconds
        const searchTimer = setTimeout(() => {
            setStatus('found')
        }, 4000)

        return () => clearTimeout(searchTimer)
    }, [])

    useEffect(() => {
        if (status === 'found') {
            const startTimer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(startTimer)
                        navigate('/game')
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(startTimer)
        }
    }, [status, navigate])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="relative mb-12">
                {/* Animated Rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-primary-500/20 rounded-full animate-ping"></div>
                    <div className="absolute w-48 h-48 border-4 border-secondary-500/20 rounded-full animate-ping delay-700"></div>
                </div>

                <div className="relative w-40 h-40 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-2xl z-10">
                    <span className="material-icons-round text-7xl text-primary-500 animate-pulse">
                        {status === 'searching' ? 'radar' : 'handshake'}
                    </span>
                </div>
            </div>

            <div className="space-y-6 max-w-md">
                <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-600">
                    {status === 'searching' ? t('lobby.matchmaking') : t('lobby.opponentFound')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                    {status === 'searching'
                        ? t('lobby.searching')
                        : `${t('lobby.startingIn')} ${countdown}...`}
                </p>

                <div className="pt-8">
                    {status === 'searching' ? (
                        <button
                            onClick={() => navigate('/')}
                            className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            {t('lobby.cancel')}
                        </button>
                    ) : (
                        <div className="flex items-center gap-4 justify-center animate-bounce">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-500">
                                <img src={user?.avatar} alt="You" />
                            </div>
                            <div className="text-2xl font-black text-primary-500">VS</div>
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-secondary-500 bg-slate-200 flex items-center justify-center">
                                <span className="material-icons-round text-slate-400">person</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Cards simulation */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl opacity-50">
                <LobbyStat label={t('home.classic')} value="Ready" />
                <LobbyStat label="Avg. MMR" value="1,240" />
                <LobbyStat label="Region" value="SA-East" />
                <LobbyStat label="Players" value="482" />
            </div>
        </div>
    )
}

function LobbyStat({ label, value }) {
    return (
        <div className="glass p-4 rounded-xl text-center border border-white/10">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{label}</p>
            <p className="text-xl font-black text-slate-700 dark:text-slate-200">{value}</p>
        </div>
    )
}

export default LobbyPage
