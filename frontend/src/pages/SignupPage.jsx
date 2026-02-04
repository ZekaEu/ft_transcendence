import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { Button, Input, Card, Alert } from '../components/common'
import toast from 'react-hot-toast'

function SignupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }

    if (password.length < 8) {
      setError(t('auth.passwordMinLength'))
      return
    }

    setLoading(true)

    try {
      await signup(username, email, password)
      toast.success(t('auth.accountCreated'))
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.message || t('auth.signupFailed')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center px-4 transition-colors duration-300">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary-500/20 rounded-full blur-[120px]"></div>
      </div>

      <Card className="w-full max-w-md glass relative z-10 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-primary-500 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            <span className="material-icons-round text-4xl">person_add</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('auth.signup')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Join Triple Trouble Trivia today.</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4" />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('auth.username')}
            type="text"
            placeholder="your_username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label={t('auth.email')}
            type="email"
            placeholder="your@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('auth.password')}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              label={t('auth.confirmPassword')}
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            disabled={loading}
            className="mt-6 bg-gradient-to-r from-primary-500 to-primary-600 juicy-shadow py-4 text-lg font-bold"
          >
            {loading ? t('auth.creatingAccount') : t('auth.signup')}
          </Button>
        </form>

        <div className="mt-8 text-center bg-slate-50 dark:bg-slate-800/50 -mx-8 -mb-8 p-6 rounded-b-[2rem] border-t border-slate-100 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-bold underline decoration-2 underline-offset-4">
              {t('auth.loginNow')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default SignupPage
