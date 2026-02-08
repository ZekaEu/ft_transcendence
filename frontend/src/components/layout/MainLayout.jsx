import React from 'react'
import { useTranslation } from 'react-i18next'
import { Navbar } from '../common'

export function MainLayout({ children }) {
    const { t } = useTranslation()

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 transition-colors duration-300">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-12">
                {children}
            </main>
            <footer className="mt-20 py-12 px-6 border-t border-sky-100 dark:border-slate-800 text-center">
                <p className="text-slate-400 text-sm font-medium">
                    {t('footer.developedBy')}
                </p>
            </footer>
        </div>
    )
}
