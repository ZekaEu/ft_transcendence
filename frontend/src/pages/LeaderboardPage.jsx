import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { Card, Spinner, Avatar } from '../components/common'
import { gameService } from '../services/gameService'

function LeaderboardPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [players, setPlayers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRanking = async () => {
            setLoading(true)
            try {
                const data = await gameService.getRanking()
                setPlayers(data || [])
            } catch (err) {
                console.error('Failed to load ranking:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchRanking()
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Spinner size="lg" />
                <p className="text-slate-500">{t('ranking.loading')}</p>
            </div>
        )
    }

    // Need at least 3 for podium, fill with nulls if less
    const podium = [players[0] || null, players[1] || null, players[2] || null]

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">
                    {t('ranking.title')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">{t('ranking.subtitle')}</p>
            </div>

            {players.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-6xl mb-4">🏆</div>
                    <p className="text-slate-500 font-medium text-lg">{t('ranking.noPlayers')}</p>
                    <p className="text-slate-400 text-sm mt-2">{t('ranking.beFirst')}</p>
                </div>
            ) : (
                <>
                    {/* Podium Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-12">
                        {/* 2nd Place */}
                        <div className="order-2 md:order-1 flex flex-col items-center space-y-4 pb-4">
                            {podium[1] ? (
                                <>
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full border-4 border-slate-300 overflow-hidden bg-slate-200 flex items-center justify-center">
                                            {podium[1].avatar_url ? (
                                                <img src={podium[1].avatar_url} alt={podium[1].username} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl font-bold text-slate-500">{podium[1].username?.[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-800 font-bold px-3 py-1 rounded-full text-sm shadow-md">2nd</div>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-lg">{podium[1].display_name}</p>
                                        <p className="text-xs text-slate-400">{t('ranking.level')} {podium[1].level}</p>
                                    </div>
                                    <div className="w-full h-32 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-2xl flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-slate-500">{podium[1].xp.toLocaleString()}</span>
                                        <span className="text-xs text-slate-400 uppercase tracking-wider">{t('ranking.xp')}</span>
                                    </div>
                                </>
                            ) : <div className="h-32" />}
                        </div>

                        {/* 1st Place */}
                        <div className="order-1 md:order-2 flex flex-col items-center space-y-4 scale-110 relative z-10">
                            {podium[0] ? (
                                <>
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-full border-4 border-yellow-400 overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.3)] bg-yellow-100 flex items-center justify-center">
                                            {podium[0].avatar_url ? (
                                                <img src={podium[0].avatar_url} alt={podium[0].username} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-4xl font-bold text-yellow-600">{podium[0].username?.[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl animate-bounce">👑</div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-bold px-4 py-1 rounded-full shadow-lg">1st</div>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black text-2xl">{podium[0].display_name}</p>
                                        <p className="text-xs text-slate-400">{t('ranking.level')} {podium[0].level}</p>
                                    </div>
                                    <div className="w-full h-48 bg-gradient-to-t from-primary-500 to-sky-400 rounded-t-3xl flex flex-col items-center justify-center shadow-xl">
                                        <span className="text-4xl font-black text-white">{podium[0].xp.toLocaleString()}</span>
                                        <span className="text-xs text-white/70 uppercase tracking-wider">{t('ranking.xp')}</span>
                                    </div>
                                </>
                            ) : <div className="h-48" />}
                        </div>

                        {/* 3rd Place */}
                        <div className="order-3 md:order-3 flex flex-col items-center space-y-4 pb-4">
                            {podium[2] ? (
                                <>
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full border-4 border-orange-400 overflow-hidden bg-orange-100 flex items-center justify-center">
                                            {podium[2].avatar_url ? (
                                                <img src={podium[2].avatar_url} alt={podium[2].username} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl font-bold text-orange-600">{podium[2].username?.[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-400 text-orange-900 font-bold px-3 py-1 rounded-full text-sm shadow-md">3rd</div>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-lg">{podium[2].display_name}</p>
                                        <p className="text-xs text-slate-400">{t('ranking.level')} {podium[2].level}</p>
                                    </div>
                                    <div className="w-full h-24 bg-gradient-to-t from-orange-200 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/20 rounded-t-2xl flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-orange-500">{podium[2].xp.toLocaleString()}</span>
                                        <span className="text-xs text-orange-400 uppercase tracking-wider">{t('ranking.xp')}</span>
                                    </div>
                                </>
                            ) : <div className="h-24" />}
                        </div>
                    </div>

                    {/* Full List */}
                    <Card className="p-0 overflow-hidden">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {players.map((player) => (
                                <div
                                    key={player.user_id}
                                    className={`flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                        player.user_id === user?.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <span className="text-xl font-black text-slate-300 w-8">#{player.rank}</span>
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 overflow-hidden bg-slate-200 flex items-center justify-center">
                                                {player.avatar_url ? (
                                                    <img src={player.avatar_url} alt={player.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg font-bold text-slate-500">{player.username?.[0]?.toUpperCase()}</span>
                                                )}
                                            </div>
                                            {player.rank <= 3 && (
                                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${
                                                    player.rank === 1 ? 'bg-yellow-400' : player.rank === 2 ? 'bg-slate-300' : 'bg-orange-400'
                                                }`} />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white">
                                                {player.display_name}
                                                {player.user_id === user?.id && (
                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">you</span>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                <span>{t('ranking.level')} {player.level}</span>
                                                <span>•</span>
                                                <span>{player.games_played} {t('ranking.gamesPlayed')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-primary-500">{player.xp.toLocaleString()}</p>
                                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t('ranking.xp')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}

export default LeaderboardPage
