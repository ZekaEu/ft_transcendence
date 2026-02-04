import React from 'react'
import { useTranslation } from 'react-i18next'

function ShopPage() {
    const { t } = useTranslation()
    return (
        <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4">{t('shop.title')}</h1>
            <p className="text-slate-500">{t('shop.subtitle')}</p>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 opacity-50 grayscale">
                <div className="glass p-8 rounded-2xl">
                    <span className="material-icons-round text-5xl mb-4">face</span>
                    <h3 className="text-xl font-bold">{t('shop.premiumAvatars')}</h3>
                </div>
                <div className="glass p-8 rounded-2xl">
                    <span className="material-icons-round text-5xl mb-4">bolt</span>
                    <h3 className="text-xl font-bold">{t('shop.powerUps')}</h3>
                </div>
                <div className="glass p-8 rounded-2xl">
                    <span className="material-icons-round text-5xl mb-4">palette</span>
                    <h3 className="text-xl font-bold">{t('shop.uiThemes')}</h3>
                </div>
            </div>
        </div>
    )
}

export default ShopPage
