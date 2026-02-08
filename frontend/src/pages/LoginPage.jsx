import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { Button, Input, Card, Alert } from '../components/common'
import toast from 'react-hot-toast'

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(email, password)
      toast.success(t('auth.success'))
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.message || t('auth.error')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center px-4 transition-colors duration-300">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-500/20 rounded-full blur-[120px]"></div>
      </div>

      <Card className="w-full max-w-md glass relative z-10 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-primary-500 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            <span className="material-icons-round text-4xl">quiz</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Triple Trouble Trivia</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{t('home.heroSubtitle')}</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4" />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label={t('auth.email')}
            type="email"
            placeholder="your@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label={t('auth.password')}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            disabled={loading}
            className="mt-6 bg-gradient-to-r from-primary-500 to-primary-600 juicy-shadow py-4 text-lg font-bold"
          >
            {loading ? t('auth.signingIn') : t('auth.login')}
          </Button>
        </form>

        <div className="mt-8 text-center bg-slate-50 dark:bg-slate-800/50 -mx-8 -mb-8 p-6 rounded-b-[2rem] border-t border-slate-100 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="text-primary-500 hover:text-primary-600 font-bold underline decoration-2 underline-offset-4">
              {t('auth.signupNow')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage
