import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import MotionPage from '../components/MotionPage'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { API_URL } from '../services/api'
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify'

const MotionAside = motion.aside
const MotionArticle = motion.article

function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, saveSession } = useAuth()
  const { t } = useLanguage()
  const dashboardPath = isAuthenticated ? '/dashboard' : '/registro'
  const [activeSection, setActiveSection] = useState('')
  const [previewMode, setPreviewMode] = useState('login')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewForm, setPreviewForm] = useState({
    nombre: '',
    email: '',
    username: '',
    password: '',
  })
  const highlightTimeoutRef = useRef(null)

  const featureCards = useMemo(() => ([
    {
      title: t('home.card.editor.title'),
      description: t('home.card.editor.description'),
      snippet: "const mission = 'Learn Code';\nexecute(mission);",
    },
    {
      title: t('home.card.gamified.title'),
      description: t('home.card.gamified.description'),
      snippet: 'Current quest: Data Structures II',
    },
    {
      title: t('home.card.certs.title'),
      description: t('home.card.certs.description'),
      snippet: 'Verified by partner companies',
    },
  ]), [t])

  const scrollTo = (id) => {
    const target = document.getElementById(id)
    if (!target) {
      return
    }

    setActiveSection(id)
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setActiveSection('')
    }, 900)

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targetY = target.getBoundingClientRect().top + window.scrollY - 20

    if (prefersReducedMotion) {
      window.scrollTo({ top: targetY, behavior: 'auto' })
      return
    }

    window.scrollTo({ top: targetY, behavior: 'smooth' })
  }

  const handlePreviewChange = (event) => {
    const { name, value } = event.target
    setPreviewForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const switchPreviewMode = (nextMode) => {
    setPreviewMode(nextMode)
  }

  const handlePreviewSubmit = async (event) => {
    event.preventDefault()

    if (!previewForm.email.trim() || !previewForm.password.trim()) {
      notifyInfo(t('home.preview.completeFields'))
      return
    }

    if (previewMode === 'register' && !previewForm.nombre.trim()) {
      notifyInfo(t('home.preview.enterName'))
      return
    }

    if (previewMode === 'register' && !previewForm.username.trim()) {
      notifyInfo(t('home.preview.enterUsername') || 'Por favor ingresa un nombre de usuario')
      return
    }

    setPreviewLoading(true)

    try {
      const endpoint = previewMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = previewMode === 'login'
        ? {
          email: previewForm.email,
          password: previewForm.password,
        }
        : {
          nombre: previewForm.nombre,
          email: previewForm.email,
          username: previewForm.username,
          password: previewForm.password,
        }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || (previewMode === 'login' ? t('auth.login.error') : t('auth.register.error')))
      }

      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      })

      notifySuccess(previewMode === 'login' ? t('home.toast.loginSuccess') : t('home.toast.registerSuccess'))
      navigate('/dashboard')
    } catch (error) {
      notifyError(error.message || (previewMode === 'login' ? t('auth.login.error') : t('auth.register.error')))
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <MotionPage className="landing" delay={0.05}>
      <div className="landing__container">
        <header className="landing__header">
          <div className="landing__brand">
            <span className="landing__brand-mark">&lt;/&gt;</span>
            <div>
              <strong>CodeQuest</strong>
              <span>{t('home.brandTagline')}</span>
            </div>
          </div>

          <nav className="landing__nav">
            <button type="button" onClick={() => scrollTo('features')}>{t('home.nav.features')}</button>
            <button type="button" onClick={() => scrollTo('pricing')}>{t('home.nav.pricing')}</button>
            <button type="button" onClick={() => scrollTo('about')}>{t('home.nav.about')}</button>
          </nav>

          <div className="landing__actions">
            <Link className="landing__link-btn" to="/login">{t('home.login')}</Link>
            <Link className="landing__cta-btn ui-jitter" to={dashboardPath}>
              {isAuthenticated ? t('home.goDashboard') : t('home.getStarted')}
            </Link>
          </div>
        </header>

        <section className={`landing__hero ${activeSection === 'about' ? 'landing-section--targeted' : ''}`} id="about">
          <div className="landing__hero-copy">
            <span className="landing__status">{t('home.status')}</span>
            <h1>
              {t('home.hero.titleLine1')}
              <em>{t('home.hero.titleLine2')}</em>
            </h1>
            <p>
              {t('home.hero.description')}
            </p>

            <div className="landing__hero-actions">
              <Link className="landing__cta-btn ui-jitter" to="/demo">
                {t('home.hero.start')}
              </Link>
              <button className="landing__ghost-btn" type="button" onClick={() => scrollTo('features')}>
                {t('home.hero.viewCurriculum')}
              </button>
            </div>

            <p className="landing__companies">{t('home.hero.companies')}</p>
            <div className="landing__company-row" aria-hidden="true">
              <span>Alexsters Corp</span>
            </div>
          </div>

          <MotionAside
            className="landing__auth-preview"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <form onSubmit={handlePreviewSubmit} className="landing__auth-form">
              <div className="landing__auth-tabs">
                <button
                  type="button"
                  className={previewMode === 'login' ? 'active' : ''}
                  onClick={() => switchPreviewMode('login')}
                >
                  {t('home.preview.loginTab')}
                </button>
                <button
                  type="button"
                  className={previewMode === 'register' ? 'active' : ''}
                  onClick={() => switchPreviewMode('register')}
                >
                  {t('home.preview.signupTab')}
                </button>
              </div>

              {previewMode === 'register' && (
                <>
                  <label htmlFor="landing-nombre">{t('home.preview.name')}</label>
                  <input
                    id="landing-nombre"
                    name="nombre"
                    value={previewForm.nombre}
                    onChange={handlePreviewChange}
                    placeholder="Alex Dev"
                    autoComplete="name"
                  />

                  <label htmlFor="landing-username">{t('home.preview.username') || 'Nombre de usuario'}</label>
                  <input
                    id="landing-username"
                    name="username"
                    value={previewForm.username}
                    onChange={handlePreviewChange}
                    placeholder="alexdev"
                  />
                </>
              )}

              <label htmlFor="landing-email">{t('home.preview.email')}</label>
              <input
                id="landing-email"
                name="email"
                type="email"
                value={previewForm.email}
                onChange={handlePreviewChange}
                placeholder="dev@codequest.io"
                autoComplete="email"
              />

              <label htmlFor="landing-password">{t('home.preview.password')}</label>
              <input
                id="landing-password"
                name="password"
                type="password"
                value={previewForm.password}
                onChange={handlePreviewChange}
                placeholder="••••••••"
                autoComplete={previewMode === 'login' ? 'current-password' : 'new-password'}
              />

              <button
                className="landing__cta-btn landing__auth-submit ui-jitter"
                type="submit"
                disabled={previewLoading}
              >
                {previewLoading
                  ? (previewMode === 'login' ? t('home.preview.loginLoading') : t('home.preview.registerLoading'))
                  : (previewMode === 'login' ? t('home.preview.loginAction') : t('home.preview.registerAction'))}
              </button>
            </form>
          </MotionAside>
        </section>

        <section className={`landing__feature-section ${activeSection === 'features' ? 'landing-section--targeted' : ''}`} id="features">
          <div className="landing__feature-head">
            <h2>{t('home.feature.headline')}</h2>
            <p>
              {t('home.feature.description')}
            </p>
          </div>

          <div className="landing__feature-grid">
            {featureCards.map((card, index) => (
              <MotionArticle
                key={card.title}
                className="landing__feature-card"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20%' }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <pre>{card.snippet}</pre>
              </MotionArticle>
            ))}
          </div>
        </section>

        <section className={`landing__showcase ${activeSection === 'pricing' ? 'landing-section--targeted' : ''}`} id="pricing">
          <div className="landing__showcase-copy">
            <h2>
              {t('home.showcase.titleLine1')}
              <em>{t('home.showcase.titleLine2')}</em>
            </h2>
            <ul>
              <li>{t('home.showcase.item1')}</li>
              <li>{t('home.showcase.item2')}</li>
              <li>{t('home.showcase.item3')}</li>
            </ul>
          </div>

          <div className="landing__showcase-screen" aria-hidden="true">
            <span>{t('home.showcase.badge')}</span>
            <strong>{t('home.showcase.label')}</strong>
          </div>
        </section>

        <footer className="landing__footer">
          <strong>CodeQuest</strong>
          <span>© 2026 CodeQuest. {t('home.footer')}</span>
        </footer>
      </div>
    </MotionPage>
  )
}

export default HomePage
