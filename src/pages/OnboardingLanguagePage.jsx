import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { listAvailableLanguages, selectLanguage } from '../services/learningApi'
import { notifyError, notifyInfo, notifyPending, notifySuccess } from '../utils/notify'

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function renderLanguageIcon(icon, label) {
  if (isHttpUrl(icon)) {
    return <img className="language-icon-image" src={icon} alt={`Logo de ${label}`} loading="lazy" />
  }

  return <span className="language-icon-text">{icon || '💻'}</span>
}

function OnboardingLanguagePage() {
  const [languages, setLanguages] = useState([])
  const [selected, setSelected] = useState(null)
  const [loadingLanguages, setLoadingLanguages] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()

  const loadLanguages = useCallback(async () => {
    setLoadingLanguages(true)
    setLoadError('')

    try {
      const list = await listAvailableLanguages()
      setLanguages(list)

      if (list.length === 0) {
        const message = t('onboarding.noLanguages')
        setLoadError(message)
        notifyInfo(message)
      }
    } catch (error) {
      const message = error.message || t('onboarding.loadError')
      setLoadError(message)
      notifyError(message)
      setLanguages([])
    } finally {
      setLoadingLanguages(false)
    }
  }, [t])

  useEffect(() => {
    loadLanguages()
  }, [loadLanguages])

  const handleContinue = async () => {
    if (!selected) {
      notifyPending(t('onboarding.selectLanguageToast'))
      return
    }

    setSubmitError('')
    setLoading(true)

    try {
      await selectLanguage(selected)
      notifySuccess(t('onboarding.saveSuccess'))
      navigate('/onboarding/tour')
    } catch (error) {
      const message = error.message || t('onboarding.saveError')
      setSubmitError(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MotionPage className="onboarding-page" delay={0.06}>
      <div className="onboarding-container">
        <div className="onboarding-top-actions">
          <button
            className="onboarding-back-btn"
            onClick={() => navigate('/dashboard')}
            type="button"
            aria-label={t('onboarding.backDashboard')}
          >
            <span className="onboarding-back-btn__icon" aria-hidden="true">
              <svg
                className="onboarding-back-btn__svg"
                viewBox="4 3 22 18"
                focusable="false"
              >
                <path d="M13.2 3.7L5.1 11.8L13.2 19.9C14 20.7 15.4 20.2 15.4 19V15.2H22.1C24 15.2 25.5 13.7 25.5 11.8C25.5 9.9 24 8.4 22.1 8.4H15.4V4.6C15.4 3.4 14 2.9 13.2 3.7Z" />
              </svg>
            </span>
            <span className="onboarding-back-btn__text">{t('common.back')}</span>
          </button>
        </div>

        <div className="onboarding-header">
          <span className="onboarding-step">{t('onboarding.step', { current: 1, total: 2 })}</span>
          <h1>{t('onboarding.welcome', { name: user?.nombre || '' })}</h1>
          <p>{t('onboarding.selectLanguage')}</p>
        </div>

        {loadError && <p className="onboarding-error-message">{loadError}</p>}
        {submitError && <p className="onboarding-error-message">{submitError}</p>}

        <div className="language-grid">
          {loadingLanguages ? (
            <div className="onboarding-loading-container">
              <LoadingSpinner size="large" />
              <p className="onboarding-loading-message">{t('onboarding.loadingLanguages')}</p>
            </div>
          ) : (
            languages.map((lang) => (
              <button
                key={lang.id}
                className={`language-card ${selected === lang.id ? 'language-selected' : ''}`}
                onClick={() => setSelected(lang.id)}
                type="button"
              >
                <span className="language-icon">{renderLanguageIcon(lang.icono, lang.nombre)}</span>
                <span className="language-name">{lang.nombre}</span>
              </button>
            ))
          )}
        </div>

        {!loadingLanguages && languages.length === 0 && (
          <button className="onboarding-retry-btn" onClick={loadLanguages} type="button">
            {t('onboarding.retryLanguages')}
          </button>
        )}

        <button
          className="onboarding-continue-btn"
          onClick={handleContinue}
          disabled={!selected || loading || loadingLanguages || languages.length === 0}
          type="button"
        >
          {loading ? t('onboarding.saving') : t('onboarding.continue')}
        </button>
      </div>
    </MotionPage>
  )
}

export default OnboardingLanguagePage
