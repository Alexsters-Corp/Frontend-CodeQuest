import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import MotionPage from '../components/MotionPage'
import { API_URL } from '../services/api'
import { notifyError, notifySuccess } from '../utils/notify'

function RegisterPage() {
  const navigate = useNavigate()
  const { saveSession } = useAuth()
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || t('auth.register.error'))
      }

      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      })

      notifySuccess(t('auth.register.success'))
      setTimeout(() => navigate('/dashboard'), 400)
    } catch (submitError) {
      notifyError(submitError.message || t('auth.register.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MotionPage className="auth-page" delay={0.05}>
      <div className="auth-layout auth-layout--register">
        <section className="auth-visual">
          <span className="auth-visual__badge">{t('auth.register.visualBadge')}</span>
          <h1>
            {t('auth.register.visualTitle1')}
            <em>{t('auth.register.visualTitle2')}</em>
          </h1>
          <p>
            {t('auth.register.visualDescription')}
          </p>
          <div className="auth-visual__chips">
            <span>{t('auth.register.chip1')}</span>
            <span>{t('auth.register.chip2')}</span>
            <span>{t('auth.register.chip3')}</span>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__brand">
            <span>&lt;/&gt;</span>
            <strong>CodeQuest</strong>
          </div>

          <h2>{t('auth.register.title')}</h2>
          <p className="auth-panel__subtitle">{t('auth.register.subtitle')}</p>

          <form onSubmit={handleSubmit} className="form auth-panel__form">
            <label htmlFor="nombre">{t('auth.register.name')}</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Alex Dev"
            />

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
              minLength={6}
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 chars"
            />

            <button type="submit" className="auth-panel__submit ui-jitter" disabled={isLoading}>
              {isLoading ? t('auth.register.submitting') : t('auth.register.submit')}
            </button>
          </form>

          <div className="auth-panel__footer">
            <span>{t('auth.register.prompt')}</span>
            <Link to="/login">{t('auth.register.link')}</Link>
          </div>
        </section>
      </div>
    </MotionPage>
  )
}

export default RegisterPage
