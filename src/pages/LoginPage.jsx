import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import MotionPage from '../components/MotionPage'
import { API_URL } from '../services/api'
import { notifyError, notifySuccess } from '../utils/notify'

function LoginPage() {
  const navigate = useNavigate()
  const { saveSession } = useAuth()
  const { t } = useLanguage()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || t('auth.login.error'))
      }

      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      })

      notifySuccess(t('auth.login.success'))
      setTimeout(() => navigate('/dashboard'), 400)
    } catch (submitError) {
      notifyError(submitError.message || t('auth.login.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MotionPage className="auth-page" delay={0.04}>
      <div className="auth-layout">
        <section className="auth-visual">
          <span className="auth-visual__badge">{t('auth.login.visualBadge')}</span>
          <h1>
            {t('auth.login.visualTitle1')}
            <em>{t('auth.login.visualTitle2')}</em>
          </h1>
          <p>
            {t('auth.login.visualDescription')}
          </p>
          <div className="auth-visual__chips">
            <span>{t('auth.login.chip1')}</span>
            <span>{t('auth.login.chip2')}</span>
            <span>{t('auth.login.chip3')}</span>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__brand">
            <span>&lt;/&gt;</span>
            <strong>CodeQuest</strong>
          </div>

          <h2>{t('auth.login.title')}</h2>
          <p className="auth-panel__subtitle">{t('auth.login.subtitle')}</p>

          <form onSubmit={handleSubmit} className="form auth-panel__form">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="dev@codequest.io"
            />

            <label htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />

            <Link className="auth-panel__link" to="/forgot-password">
              {t('auth.forgot')}
            </Link>

            <button className="auth-panel__submit ui-jitter" type="submit" disabled={isLoading}>
              {isLoading ? t('auth.login.submitting') : t('auth.login.submit')}
            </button>
          </form>

          <div className="auth-panel__footer">
            <span>{t('auth.signup.prompt')}</span>
            <Link to="/registro">{t('auth.signup.link')}</Link>
          </div>
        </section>
      </div>
    </MotionPage>
  )
}

export default LoginPage
