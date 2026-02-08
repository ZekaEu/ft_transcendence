import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/common'

function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-600 mb-4">{t('notFound.title')}</h1>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('notFound.subtitle')}</h2>
        <p className="text-gray-600 mb-8">
          {t('notFound.message')}
        </p>
        <Link to="/">
          <Button size="lg">{t('notFound.goHome')}</Button>
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
