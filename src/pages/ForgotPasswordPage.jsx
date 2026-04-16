import { useState } from 'react'
import { Link } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import { useLanguage } from '../context/useLanguage'
import { API_URL } from '../services/api'
import { notifyError, notifySuccess } from '../utils/notify'

function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || t('auth.forgot.error'))
      }

      notifySuccess(t('auth.forgot.success'))
      setEmail('')
    } catch (submitError) {
      notifyError(submitError.message || t('auth.forgot.error'))
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

          <h2>{t('auth.forgot.title')}</h2>
          <p className="auth-panel__subtitle">
            {t('auth.forgot.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="form auth-panel__form">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="dev@codequest.io"
            />

            <button className="auth-panel__submit ui-jitter" type="submit" disabled={isLoading}>
              {isLoading ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
            </button>
          </form>

          <div className="auth-panel__footer">
            <span>{t('auth.forgot.backPrompt')}</span>
            <Link to="/login">{t('auth.register.link')}</Link>
          </div>
        </section>
      </div>
    </MotionPage>
  )
}

export default ForgotPasswordPage
