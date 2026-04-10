import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listAvailableLanguages, selectLanguage } from '../services/learningApi'

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

  const loadLanguages = async () => {
    setLoadingLanguages(true)
    setLoadError('')

    try {
      const list = await listAvailableLanguages()
      setLanguages(list)

      if (list.length === 0) {
        setLoadError('No hay lenguajes disponibles en este momento.')
      }
    } catch (error) {
      setLoadError(error.message || 'No fue posible cargar los lenguajes.')
      setLanguages([])
    } finally {
      setLoadingLanguages(false)
    }
  }

  useEffect(() => {
    loadLanguages()
  }, [])

  const handleContinue = async () => {
    if (!selected) return

    setSubmitError('')
    setLoading(true)

    try {
      await selectLanguage(selected)
      navigate('/onboarding/tour')
    } catch (error) {
      setSubmitError(error.message || 'No fue posible guardar tu selección.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <span className="onboarding-step">Paso 1 de 2</span>
          <h1>¡Bienvenido, {user?.nombre}!</h1>
          <p>¿Qué lenguaje de programación quieres aprender?</p>
        </div>

        {loadError && <p className="onboarding-error-message">{loadError}</p>}
        {submitError && <p className="onboarding-error-message">{submitError}</p>}

        <div className="language-grid">
          {loadingLanguages ? (
            <p className="onboarding-loading-message">Cargando lenguajes...</p>
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
            Reintentar carga de lenguajes
          </button>
        )}

        <button
          className="onboarding-continue-btn"
          onClick={handleContinue}
          disabled={!selected || loading || loadingLanguages || languages.length === 0}
          type="button"
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}

export default OnboardingLanguagePage
