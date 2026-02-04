import React from 'react'

function LeaderboardPage() {
    const topPlayers = [
        { rank: 4, name: 'Sarah_Quizzy', streak: 12, points: '12,150', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBtHlK26QtY-gLVi6nexYVJWEGzTTI7r33VNdUBIR-kkTnIv_KbHUxYV8KmDPBOTCvH0fvRhdjnM6_LROLIvZaz5ubzqe8J1DWUD1fggCBsBRoRW_WkrEkDfI5mwrMoRRSSGlBlPfsbzBIkEscF-tU2BTg69o-O-T79lV1EHNsiAl40VFXHyA_e2gxzAAa4RYfwq_GVU75pbi8OQRMLZ-8SOlqW_9qPjypYTR4FxApi7yKbADQe9ENmzKVRSUjJPjkSQqe6L6bTQ' },
        { rank: 5, name: 'MarkTheBrain', streak: 8, points: '11,900', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBsQ7hK3zihLi0XN0WYWdBWWPA6csl-Bd8lhMP8O5Wms7F3aLyFH1L6ZhmfeyEJ_ovjFFhHF5sYxGQJ_fK-goDmVNWTbVdATWHl6b1WhcPJG1m7RDksIZaZI2lf6rw5Sc1Jh5v0hRZkAu6FHuWP9y1_0_MwMuY-NUfGY8RV2-0zs86iXhX7JkZsbXLlWZfIWhTyN-i3nBI2Yv8UGPS_YxyZo11Zgb0RCqNQcZdmr1aHtHPTOOpB6LnGYU17YckAJWY1H1acBC0U1g' },
        { rank: 6, name: 'LunaStargazer', streak: 5, points: '10,450', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1x_m0cHbIigH0zH-1YETr9ZyeNfaFD-SKjlOG4I3ern1jjUKbaeDkl87ulyyHVLtSD9gz7BlbFFJER27d-zmKkL9O37TFNG48ymxcv0bMAWWCjcqFQNjczeXcnCXaspjN8HtqPAp5Q_MgvPiWFkWXOWieOvPJcKPbtY8mVOIasKp907zP2CVQHuMxdlvRSfarZ5lktrjIeBpa3KZgscR2-syhMdf9R0B3Kd2XRUI4b3qEYcJbFlsiEimkdUyumU_Tr5H88ZVlig' },
        { rank: 7, name: 'QuizWiz_Phoebe', streak: 3, points: '9,820', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDT4BrXnfrU5I3xXNua8TL7PBCK3dVMB8fJ4vk95CTOapfDEUx4nJkqnUe_h8k_PbAvlmL_iCXdVvP9-Rxo8PZMyj84ZUedJo_Iv0r1ikAe6F-1VuheCNuXGNWJ4NEe8gftI3NLHdm52ehxbwS67JLcwz9DsxhtK6jirKm3_SOaQ4YLYz56iGR2CpPYeZuTCv5nIQebDS0F8nmylC2NFZGUkjJRPbVHlh8WXVnhbpwXWTNtMgBKr5Szw-zUqc_DQ--SGeD7VdksRQ' },
        { rank: 8, name: 'Jake_Thunder', streak: 15, points: '9,100', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4sbqFqGNykLyG0aSdNPFBJ8s6bLn-0hth8HxkYVFuhuhQo4sYy9CoZlz0RdC-SzBNO_FSUvY_4PGSIwx3-T6f91sQB2tqLVIbeNuI-09AcVbVmAHsnS4eXAPlhdB0hWs5QPE7d3HF7TOEPb04zWVf0syTg3ivsA-uUt1InJMfQVSTb_yd11-wenevrIx4yyUlsrfL6PWaUTN3z3BHUkuTo1DHBVDPkp180YwYca2fMBeE-Fmf4hocL1AxJoH4Gq6D61br3IfjoQ' },
    ]

    return (
        <div className="max-w-4xl mx-auto pb-32">
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">
                    Global Ranking
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Compete with trivia masters around the world</p>
            </header>

            {/* Podium */}
            <div className="flex flex-col md:flex-row items-end justify-center gap-4 mb-12 px-4">
                {/* Rank 2 */}
                <div className="w-full md:w-1/3 order-2 md:order-1 group">
                    <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                            <div className="w-20 h-20 rounded-full border-4 border-slate-300 dark:border-slate-500 overflow-hidden shadow-xl transform group-hover:scale-110 transition-transform">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy7wFKmRYdtNXYeD0Lmaz9FuoFjO4C3lmsBuV8mSRgP-ktVELcUVsE6eSFqToJgRx28vwibih_OCD-Qm-wrQs2Ia15dLUHFyyMLJYgJ78MNacpCGCY6wUbtYscR-HLq87fq6BEj27Rfr7nqFSW-HrNQkZmIqOLP-F6CMmQNk3JJ_Nd0UyxVod8W4TbjL6pPDV1gohPiHMz8q46Qqj22FAaGFK7Zuy-d_mUzYMCYBXOgZDJjdydcPu3AIK5RcXNBtB7muGEFzjLuA" alt="Rank 2" />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-br from-slate-200 to-slate-400 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg font-bold">2</div>
                        </div>
                        <div className="w-full h-32 bg-gradient-to-br from-slate-200 to-slate-400 rounded-t-2xl p-4 flex flex-col items-center justify-start text-white shadow-lg">
                            <span className="font-bold text-lg truncate w-full text-center">Felix_Trivia</span>
                            <span className="text-sm opacity-90">14,820 pts</span>
                        </div>
                    </div>
                </div>

                {/* Rank 1 */}
                <div className="w-full md:w-1/3 order-1 md:order-2 group">
                    <div className="flex flex-col items-center">
                        <div className="relative mb-6">
                            <span className="material-symbols-rounded absolute -top-10 left-1/2 -translate-x-1/2 text-yellow-400 text-5xl animate-bounce">workspace_premium</span>
                            <div className="w-28 h-28 rounded-full border-4 border-yellow-400 overflow-hidden shadow-2xl transform group-hover:scale-110 transition-transform">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5KxaE_UMAoOcBFLSYVhlLYNRM5M9y50tPbcvzFDWkOSordGklanFQcGPqSFNuApfilkmLnr6v61VCOLgcxZRbEBact3ANgx9uEQq8L5DXc8fklSPxBWIbshsJmRYP8nl4qZEg9-zDCd4hs_wEMjPVfyV35qfB8JOberivB1Yxbd9sor845O4Gm0JzwE99sRK9R5dGxik3w-Vsq0E8sMCcRWj30rtUNIIqmi2akJX5xUNUIKmB1r7LFitHiyNZF192XyL1SHs3aQ" alt="Rank 1" />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-br from-yellow-300 to-amber-500 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg font-bold text-lg">1</div>
                        </div>
                        <div className="w-full h-44 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-t-2xl p-6 flex flex-col items-center justify-start text-white shadow-2xl">
                            <span className="font-extrabold text-xl truncate w-full text-center">TriviaQueen_99</span>
                            <span className="text-md opacity-90 font-semibold">18,250 pts</span>
                        </div>
                    </div>
                </div>

                {/* Rank 3 */}
                <div className="w-full md:w-1/3 order-3 md:order-3 group">
                    <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                            <div className="w-20 h-20 rounded-full border-4 border-orange-400 dark:border-orange-600 overflow-hidden shadow-xl transform group-hover:scale-110 transition-transform">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdb1YDdJelwF0tL_4rHVfI73pfWKAqFwK4xyrazLXbAmJkzjeG9fE5gPxFxc0-0kCN63Lxy1CJ9xP1UfEchQflOY-I_RqIATYcGQMBqaO_47ehRtbB146jlkGPFKWLskZgjlWsaU987hw_JZ73h1qQfNLC7WpKOM6Z_vaGW638JUqs_aXpLJOu_yXyAD1n5TrFVodPlefHWRmHpDqS_w_RTPyD3X8bKgihDc6eoDHIWao_eBd2dJwbVpHQLldKzzMKgT0CshdplA" alt="Rank 3" />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-br from-orange-300 to-orange-600 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg font-bold">3</div>
                        </div>
                        <div className="w-full h-24 bg-gradient-to-br from-orange-300 to-orange-600 rounded-t-2xl p-4 flex flex-col items-center justify-start text-white shadow-lg">
                            <span className="font-bold text-lg truncate w-full text-center">AlexMaster</span>
                            <span className="text-sm opacity-90">13,400 pts</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {topPlayers.map((player) => (
                    <div key={player.rank} className="glass flex items-center p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                        <div className="w-12 font-bold text-slate-400 dark:text-slate-500 text-lg">#{player.rank}</div>
                        <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border border-slate-200 dark:border-slate-700">
                            <img src={player.avatar} alt={player.name} />
                        </div>
                        <div className="flex-grow">
                            <h4 className="font-bold group-hover:text-primary-500 transition-colors uppercase">{player.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Current Streak: {player.streak}</p>
                        </div>
                        <div className="text-right">
                            <div className="font-extrabold text-slate-800 dark:text-slate-200">{player.points}</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Points</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default LeaderboardPage
