import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import { useLanguage } from '../context/useLanguage'
import { API_URL } from '../services/api'
import { notifyError, notifySuccess } from '../utils/notify'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Si no hay token, mostrar error
  if (!token) {
    return (
      <MotionPage className="auth-page" delay={0.05}>
        <div className="auth-layout auth-layout--single">
          <section className="auth-panel auth-panel--single">
            <div className="auth-panel__brand">
              <span>&lt;/&gt;</span>
              <strong>CodeQuest</strong>
            </div>
            <h2>{t('auth.reset.title')}</h2>
            <p className="auth-panel__subtitle">
              {t('auth.reset.invalid')}
            </p>
            <div className="auth-panel__footer">
              <span>{t('auth.reset.newLinkPrompt')}</span>
              <Link to="/forgot-password">{t('auth.reset.newLink')}</Link>
            </div>
          </section>
        </div>
      </MotionPage>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      notifyError(t('auth.reset.passwordMismatch'))
      return
    }

    if (password.length < 8) {
      notifyError(t('auth.reset.passwordMin'))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || t('auth.reset.error'))
      }

      notifySuccess(t('auth.reset.success'))
      setTimeout(() => navigate('/login'), 2000)
    } catch (submitError) {
      notifyError(submitError.message || t('auth.reset.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MotionPage className="auth-page" delay={0.05}>
      <div className="auth-layout auth-layout--single">
        <section className="auth-panel auth-panel--single">
          <div className="auth-panel__brand">
            <span>&lt;/&gt;</span>
            <strong>CodeQuest</strong>
          </div>

          <h2>{t('auth.reset.title')}</h2>
          <p className="auth-panel__subtitle">{t('auth.reset.subtitle')}</p>

          <form onSubmit={handleSubmit} className="form auth-panel__form">
            <label htmlFor="password">{t('auth.reset.newPassword')}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 chars"
              minLength="8"
            />

            <label htmlFor="confirmPassword">{t('auth.reset.confirmPassword')}</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat password"
              minLength="8"
            />

            <button className="auth-panel__submit ui-jitter" type="submit" disabled={isLoading}>
              {isLoading ? t('auth.reset.submitting') : t('auth.reset.submit')}
            </button>
          </form>

          <div className="auth-panel__footer">
            <span>{t('auth.reset.backPrompt')}</span>
            <Link to="/login">{t('auth.register.link')}</Link>
          </div>
        </section>
      </div>
    </MotionPage>
  )
}

export default ResetPasswordPage
