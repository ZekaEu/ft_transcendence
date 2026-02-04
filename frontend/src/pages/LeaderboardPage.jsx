import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/common'

function LeaderboardPage() {
    const { t } = useTranslation()
    const [players, setPlayers] = useState([
        { id: 1, username: 'QuizMaster', points: 12500, streak: 12, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmwMhaQR8XCBKdyX6ICfmG-KiG-ByIpqh_ShFw50NdDBVfbZqd5tlwFSrCpgL0hCsCQ-Qt1umnli60oAJWyTMGaPFBmsDDjeks42YicAlAyWBAnjaHA0dOA8vIoSmpExgvffLaUEsVSqhhmkL92I0yq3970wiHktQncfu6eOLk5U1WmpJJ5AUvMBFcN_hAFO7tyidvUUeR-hXo9qtYdDE96qRkyht_68D0OLOQYAknKSzs4K2vaDomvBGwhLGNaaBlAW6syEFmjw' },
        { id: 2, username: 'TriviaQueen', points: 11200, streak: 8, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqYtYpHNqueaHCJ_KEuUqO79srB5qn_H1YdoNlxmnS2skXpoWyKJLDXcIymacWHmcBwX2ZhVvNtjq4frTME4uQinEwymKJFAmmXi-8_hALykEUHl-7J9ykPdrNShl9bE-8tYOCNSfKkXLKHi-QQNFOVbae6gmqvhQYQF_ialDJg2-qF19BuNCSdAN6vqh01MAxV7hcNz8HvzfBS6vK31thidG7DHHhdlxVwZ1D7nakVn_clnU9-DR1Q6V9uOC1UKCxHndExRlOhA' },
        { id: 3, username: 'LogicWizard', points: 10800, streak: 15, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt8-76v9M854Y_hN-K79srB5qn_H1YdoNlxmnS2skXpoWyKJLDXcIymacWHmcBwX2ZhVvNtjq4frTME4uQinEwymKJFAmmXi-8_hALykEUHl-7J9ykPdrNShl9bE-8tYOCNSfKkXLKHi-QQNFOVbae6gmqvhQYQF_ialDJg2-qF19BuNCSdAN6vqh01MAxV7hcNz8HvzfBS6vK31thidG7DHHhdlxVwZ1D7nakVn_clnU9-DR1Q6V9uOC1UKCxHndExRlOhA' },
    ])

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">
                    {t('ranking.title')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">{t('ranking.subtitle')}</p>
            </div>

            {/* Podium Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-12">
                {/* 2nd Place */}
                <div className="order-2 md:order-1 flex flex-col items-center space-y-4 pb-4">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-slate-300 overflow-hidden">
                            <img src={players[1].avatar} alt={players[1].username} />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-800 font-bold px-3 py-1 rounded-full text-sm shadow-md">2nd</div>
                    </div>
                    <p className="font-bold text-lg">{players[1].username}</p>
                    <div className="w-full h-32 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-2xl flex items-center justify-center">
                        <span className="text-2xl font-black text-slate-400">{players[1].points}</span>
                    </div>
                </div>

                {/* 1st Place */}
                <div className="order-1 md:order-2 flex flex-col items-center space-y-4 scale-110 relative z-10">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-yellow-400 overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                            <img src={players[0].avatar} alt={players[0].username} />
                        </div>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl animate-bounce">👑</div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-bold px-4 py-1 rounded-full shadow-lg">1st</div>
                    </div>
                    <p className="font-black text-2xl">{players[0].username}</p>
                    <div className="w-full h-48 bg-gradient-to-t from-primary-500 to-sky-400 rounded-t-3xl flex items-center justify-center shadow-xl">
                        <span className="text-4xl font-black text-white">{players[0].points}</span>
                    </div>
                </div>

                {/* 3rd Place */}
                <div className="order-3 md:order-3 flex flex-col items-center space-y-4 pb-4">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-orange-400 overflow-hidden">
                            <img src={players[2].avatar} alt={players[2].username} />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-400 text-orange-900 font-bold px-3 py-1 rounded-full text-sm shadow-md">3rd</div>
                    </div>
                    <p className="font-bold text-lg">{players[2].username}</p>
                    <div className="w-full h-24 bg-gradient-to-t from-orange-200 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/20 rounded-t-2xl flex items-center justify-center">
                        <span className="text-2xl font-black text-orange-400">{players[2].points}</span>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <Card className="p-0 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {players.map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-6">
                                <span className="text-xl font-black text-slate-300 w-6">#{index + 1}</span>
                                <div className="relative">
                                    <img src={player.avatar} alt={player.username} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700" />
                                    {index < 3 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white dark:border-slate-800"></div>}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white">{player.username}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('ranking.streak')}: {player.streak}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-primary-500">{player.points.toLocaleString()}</p>
                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t('ranking.points')}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}

export default LeaderboardPage
