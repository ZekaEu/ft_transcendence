import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function LobbyPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [searching, setSearching] = useState(true)

    useEffect(() => {
        // Simulate finding a match after 5 seconds
        const timer = setTimeout(() => {
            setSearching(false)
            // Automatically navigate to game after finding match if we want
            // For now, let's just show the found state
            setTimeout(() => navigate('/game'), 2000)
        }, 5000)

        return () => clearTimeout(timer)
    }, [navigate])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="mb-12 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-primary-500/10 text-primary-500 font-bold mb-4">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                    </span>
                    {searching ? 'FINDING MATCH...' : 'MATCH FOUND!'}
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-2">Competitive Battle</h1>
                <p className="text-slate-500 dark:text-slate-400">Searching for players with a similar level to yours</p>
            </div>

            <div className="relative w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Player 1 */}
                <div className="glass p-8 rounded-2xl shadow-xl flex flex-col items-center text-center transform hover:scale-[1.02] transition-transform">
                    <div className="relative mb-6">
                        <div className="w-32 h-32 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-lg overflow-hidden">
                            <img
                                src={user?.avatar || 'https://via.placeholder.com/128'}
                                alt="Your Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-primary-500 text-white text-sm font-bold px-3 py-1 rounded-full border-4 border-white dark:border-slate-700 shadow-md">
                            Lv. {user?.level || 1}
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{user?.username}</h3>
                    <p className="text-primary-500 font-medium mb-6">Player 1 (You)</p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <StatCard label="Win Rate" value="65%" />
                        <StatCard label="Rank" value="Gold III" />
                    </div>
                </div>

                {/* VS Badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                    <div className="bg-gradient-to-br from-[#0ea5e9] to-[#2563eb] w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-2xl rotate-12 border-4 border-white dark:border-slate-900">
                        VS
                    </div>
                </div>
                <div className="md:hidden flex justify-center py-4">
                    <div className="bg-gradient-to-br from-[#0ea5e9] to-[#2563eb] w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl">
                        VS
                    </div>
                </div>

                {/* Player 2 (Opponent) */}
                <div className="glass p-8 rounded-2xl shadow-xl flex flex-col items-center text-center transform hover:scale-[1.02] transition-transform">
                    {searching ? (
                        <>
                            <div className="relative mb-6">
                                <div className="w-32 h-32 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-lg overflow-hidden animate-pulse-ring">
                                    <span className="material-icons-round text-slate-300 dark:text-slate-600 text-7xl">person</span>
                                </div>
                            </div>
                            <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-3"></div>
                            <p className="text-slate-400 font-medium mb-6">Searching...</p>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <StatCard loading />
                                <StatCard loading />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="relative mb-6">
                                <div className="w-32 h-32 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-lg overflow-hidden">
                                    <img
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDT4BrXnfrU5I3xXNua8TL7PBCK3dVMB8fJ4vk95CTOapfDEUx4nJkqnUe_h8k_PbAvlmL_iCXdVvP9-Rxo8PZMyj84ZUedJo_Iv0r1ikAe6F-1VuheCNuXGNWJ4NEe8gftI3NLHdm52ehxbwS67JLcwz9DsxhtK6jirKm3_SOaQ4YLYz56iGR2CpPYeZuTCv5nIQebDS0F8nmylC2NFZGUkjJRPbVHlh8WXVnhbpwXWTNtMgBKr5Szw-zUqc_DQ--SGeD7VdksRQ"
                                        alt="Opponent Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full border-4 border-white dark:border-slate-700 shadow-md">
                                    Lv. 18
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">QuizWiz_Phoebe</h3>
                            <p className="text-red-500 font-medium mb-6">Opponent</p>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <StatCard label="Win Rate" value="72%" />
                                <StatCard label="Rank" value="Platinum II" />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="mt-16 w-full max-w-xl flex flex-col items-center gap-6">
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                    <span className="material-icons-round text-base animate-spin">refresh</span>
                    Searching for players in your region...
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-2 px-10 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-900/20 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                    <span className="material-icons-round group-hover:rotate-90 transition-transform duration-300">close</span>
                    CANCEL SEARCH
                </button>
            </div>
        </div>
    )
}

function StatCard({ label, value, loading }) {
    return (
        <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl">
            {loading ? (
                <>
                    <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-2 animate-pulse"></div>
                    <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded mx-auto animate-pulse"></div>
                </>
            ) : (
                <>
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">{label}</span>
                    <span className="text-xl font-extrabold text-slate-700 dark:text-slate-200">{value}</span>
                </>
            )}
        </div>
    )
}

export default LobbyPage
