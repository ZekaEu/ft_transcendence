import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { gameService } from '../services/gameService'
import { memoryService } from '../services/memoryService'
import { useAuth } from '../hooks/useAuth'

const POWERUP_ICONS = {
    eliminate_two: 'remove_circle',
    show_answer: 'visibility',
    peek: 'preview',
    match_reveal: 'auto_fix_high',
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
    peek: {
        gradient: 'from-yellow-500 to-orange-500',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-500',
    },
    match_reveal: {
        gradient: 'from-emerald-500 to-teal-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-500',
    },
}

function ShopPage() {
    const { t } = useTranslation()
    const { user, refreshUserData } = useAuth()
    const [catalogue, setCatalogue] = useState([])
    const [memoryCatalogue, setMemoryCatalogue] = useState([])
    const [inventory, setInventory] = useState([])
    const [memoryInventory, setMemoryInventory] = useState([])
    const [xp, setXp] = useState(0)
    const [loading, setLoading] = useState(true)
    const [buying, setBuying] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, invRes, memCatRes, memInvRes] = await Promise.all([
                    gameService.getShopCatalogue(),
                    gameService.getInventory(),
                    memoryService.getShopCatalogue(),
                    memoryService.getInventory(),
                ])
                setCatalogue(catRes.items || [])
                setInventory(invRes.inventory || [])
                setMemoryCatalogue(memCatRes.items || [])
                setMemoryInventory(memInvRes.inventory || [])
                setXp(invRes.xp || 0)
            } catch (err) {
                console.error('Failed to load shop data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleBuy = async (powerupType, cost, isMemory = false) => {
        if (xp < cost) {
            toast.error(t('shop.notEnoughXP'))
            return
        }
        setBuying(powerupType)
        try {
            const service = isMemory ? memoryService : gameService
            const res = await service.buyPowerup(powerupType, 1)
            toast.success(t('shop.purchaseSuccess'))
            setXp(res.xp_remaining)
            // Refresh inventories
            const [invRes, memInvRes] = await Promise.all([
                gameService.getInventory(),
                memoryService.getInventory(),
            ])
            setInventory(invRes.inventory || [])
            setMemoryInventory(memInvRes.inventory || [])
            // Refresh user context (for navbar XP display)
            if (refreshUserData) refreshUserData()
        } catch (err) {
            const msg = err?.response?.data?.error || t('shop.purchaseFailed')
            toast.error(msg)
        } finally {
            setBuying(null)
        }
    }

    const getOwned = (type, isMemory = false) => {
        const source = isMemory ? memoryInventory : inventory
        const record = source.find((i) => i.powerup_type === type)
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

            {/* Power-ups Section — Trivia */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <span className="material-icons-round text-purple-500">bolt</span>
                    {t('shop.triviaPowerUps')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {catalogue.map((item) => (
                        <PowerupCard
                            key={item.type}
                            item={item}
                            owned={getOwned(item.type, false)}
                            xp={xp}
                            buying={buying}
                            onBuy={(type, cost) => handleBuy(type, cost, false)}
                            t={t}
                        />
                    ))}
                </div>
            </div>

            {/* Power-ups Section — Memory */}
            {memoryCatalogue.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-icons-round text-emerald-500">grid_view</span>
                        {t('shop.memoryPowerUps')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {memoryCatalogue.map((item) => (
                            <PowerupCard
                                key={item.type}
                                item={item}
                                owned={getOwned(item.type, true)}
                                xp={xp}
                                buying={buying}
                                onBuy={(type, cost) => handleBuy(type, cost, true)}
                                t={t}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Inventory Section */}
            {(inventory.filter((i) => i.quantity > 0).length > 0 || memoryInventory.filter((i) => i.quantity > 0).length > 0) && (
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-icons-round text-emerald-500">inventory_2</span>
                        {t('shop.inventory')}
                    </h2>
                    <div className="glass rounded-2xl p-6 border border-white/10 space-y-6">
                        {/* Trivia powerups */}
                        {inventory.filter((i) => i.quantity > 0).length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                                    <span className="material-icons-round text-base text-purple-500">quiz</span>
                                    {t('shop.triviaPowerUps')}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {inventory.filter((i) => i.quantity > 0).map((item) => {
                                        const colors = POWERUP_COLORS[item.powerup_type] || POWERUP_COLORS.eliminate_two
                                        return (
                                            <div key={item.powerup_type} className={`flex items-center gap-4 p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                                                    <span className="material-icons-round text-white text-xl">
                                                        {POWERUP_ICONS[item.powerup_type] || 'bolt'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 dark:text-white truncate">
                                                        {t(`shop.powerup_${item.powerup_type}`)}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                        {t(`shop.powerup_${item.powerup_type}_desc`)}
                                                    </p>
                                                </div>
                                                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r ${colors.gradient} shadow-sm flex-shrink-0`}>
                                                    <span className="text-white text-lg font-black">{item.quantity}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Separator */}
                        {inventory.filter((i) => i.quantity > 0).length > 0 && memoryInventory.filter((i) => i.quantity > 0).length > 0 && (
                            <div className="border-t border-slate-200 dark:border-slate-700" />
                        )}

                        {/* Memory powerups */}
                        {memoryInventory.filter((i) => i.quantity > 0).length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                                    <span className="material-icons-round text-base text-emerald-500">grid_view</span>
                                    {t('shop.memoryPowerUps')}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {memoryInventory.filter((i) => i.quantity > 0).map((item) => {
                                        const colors = POWERUP_COLORS[item.powerup_type] || POWERUP_COLORS.match_reveal
                                        return (
                                            <div key={item.powerup_type} className={`flex items-center gap-4 p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                                                    <span className="material-icons-round text-white text-xl">
                                                        {POWERUP_ICONS[item.powerup_type] || 'bolt'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 dark:text-white truncate">
                                                        {t(`shop.powerup_${item.powerup_type}`)}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                        {t(`shop.powerup_${item.powerup_type}_desc`)}
                                                    </p>
                                                </div>
                                                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r ${colors.gradient} shadow-sm flex-shrink-0`}>
                                                    <span className="text-white text-lg font-black">{item.quantity}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function PowerupCard({ item, owned, xp, buying, onBuy, t }) {
    const colors = POWERUP_COLORS[item.type] || POWERUP_COLORS.eliminate_two
    const canAfford = xp >= item.cost
    const isBuying = buying === item.type

    return (
        <div className={`glass rounded-2xl p-6 border ${colors.border} hover:shadow-xl transition-all relative overflow-hidden`}>
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
                    onClick={() => onBuy(item.type, item.cost)}
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
}

export default ShopPage
