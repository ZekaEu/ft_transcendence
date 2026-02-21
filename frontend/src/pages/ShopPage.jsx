import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { gameService } from '../services/gameService'
import { useAuth } from '../hooks/useAuth'

const POWERUP_ICONS = {
    eliminate_two: 'remove_circle',
    show_answer: 'visibility',
}

const POWERUP_COLORS = {
    eliminate_two: {
        gradient: 'from-red-500 to-orange-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-500',
    },
    show_answer: {
        gradient: 'from-blue-500 to-cyan-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-500',
    },
}

function ShopPage() {
    const { t } = useTranslation()
    const { user, refreshUserData } = useAuth()
    const [catalogue, setCatalogue] = useState([])
    const [inventory, setInventory] = useState([])
    const [xp, setXp] = useState(0)
    const [loading, setLoading] = useState(true)
    const [buying, setBuying] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, invRes] = await Promise.all([
                    gameService.getShopCatalogue(),
                    gameService.getInventory(),
                ])
                setCatalogue(catRes.items || [])
                setInventory(invRes.inventory || [])
                setXp(invRes.xp || 0)
            } catch (err) {
                console.error('Failed to load shop data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleBuy = async (powerupType, cost) => {
        if (xp < cost) {
            toast.error(t('shop.notEnoughXP'))
            return
        }
        setBuying(powerupType)
        try {
            const res = await gameService.buyPowerup(powerupType, 1)
            toast.success(t('shop.purchaseSuccess'))
            setXp(res.xp_remaining)
            // Refresh inventory
            const invRes = await gameService.getInventory()
            setInventory(invRes.inventory || [])
            // Refresh user context (for navbar XP display)
            if (refreshUserData) refreshUserData()
        } catch (err) {
            const msg = err?.response?.data?.error || t('shop.purchaseFailed')
            toast.error(msg)
        } finally {
            setBuying(null)
        }
    }

    const getOwned = (type) => {
        const record = inventory.find((i) => i.powerup_type === type)
        return record ? record.quantity : 0
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">{t('shop.loading')}</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-purple-500">
                    {t('shop.title')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                    {t('shop.subtitle')}
                </p>
            </div>

            {/* XP Balance Card */}
            <div className="glass rounded-2xl p-6 flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                        <span className="material-icons-round text-white text-2xl">toll</span>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-bold text-slate-400 tracking-widest">{t('shop.yourBalance')}</p>
                        <p className="text-3xl font-black text-yellow-500">{xp.toLocaleString()} <span className="text-lg text-slate-400">XP</span></p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs uppercase font-bold text-slate-400 tracking-widest">{t('ranking.level')}</p>
                    <p className="text-2xl font-black text-primary-500">{Math.floor(xp / 1000) + 1}</p>
                </div>
            </div>

            {/* Power-ups Section */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <span className="material-icons-round text-purple-500">bolt</span>
                    {t('shop.powerUps')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {catalogue.map((item) => {
                        const colors = POWERUP_COLORS[item.type] || POWERUP_COLORS.eliminate_two
                        const owned = getOwned(item.type)
                        const canAfford = xp >= item.cost
                        const isBuying = buying === item.type

                        return (
                            <div
                                key={item.type}
                                className={`glass rounded-2xl p-6 border ${colors.border} hover:shadow-xl transition-all relative overflow-hidden`}
                            >
                                {/* Background decoration */}
                                <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${colors.gradient} rounded-full opacity-10 blur-2xl`} />

                                <div className="relative">
                                    {/* Icon + Name */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}>
                                            <span className="material-icons-round text-white text-3xl">
                                                {POWERUP_ICONS[item.type] || 'bolt'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                                {t(`shop.powerup_${item.type}`)}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {t(`shop.powerup_${item.type}_desc`)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Cost + Owned */}
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons-round text-yellow-500 text-sm">toll</span>
                                            <span className="text-lg font-black text-yellow-500">{item.cost}</span>
                                            <span className="text-sm text-slate-400">XP</span>
                                        </div>
                                        {owned > 0 && (
                                            <span className={`text-sm font-bold ${colors.text} ${colors.bg} px-3 py-1 rounded-full`}>
                                                {t('shop.owned')}: {owned}
                                            </span>
                                        )}
                                    </div>

                                    {/* Buy Button */}
                                    <button
                                        onClick={() => handleBuy(item.type, item.cost)}
                                        disabled={!canAfford || isBuying}
                                        className={`mt-4 w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95 ${
                                            canAfford
                                                ? `bg-gradient-to-r ${colors.gradient} hover:opacity-90 shadow-lg`
                                                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        {isBuying ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                {t('shop.buying')}
                                            </span>
                                        ) : canAfford ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="material-icons-round text-sm">shopping_cart</span>
                                                {t('shop.buy')}
                                            </span>
                                        ) : (
                                            t('shop.notEnoughXP')
                                        )}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Inventory Section */}
            {inventory.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-icons-round text-emerald-500">inventory_2</span>
                        {t('shop.inventory')}
                    </h2>
                    <div className="glass rounded-2xl p-6 border border-white/10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {inventory.filter((i) => i.quantity > 0).map((item) => {
                                const colors = POWERUP_COLORS[item.powerup_type] || POWERUP_COLORS.eliminate_two
                                return (
                                    <div key={item.powerup_type} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                                            <span className="material-icons-round text-white text-xl">
                                                {POWERUP_ICONS[item.powerup_type] || 'bolt'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 dark:text-white">
                                                {t(`shop.powerup_${item.powerup_type}`)}
                                            </p>
                                        </div>
                                        <span className={`text-2xl font-black ${colors.text}`}>
                                            ×{item.quantity}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ShopPage
