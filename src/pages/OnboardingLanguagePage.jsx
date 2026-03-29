import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../services/api'

function OnboardingLanguagePage() {
  const [languages, setLanguages] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    apiFetch('/api/languages')
      .then((r) => r.json())
      .then((data) => setLanguages(data.languages || data))
      .catch(() => {})
  }, [])

  const handleContinue = async () => {
    if (!selected) return
    setLoading(true)
    try {
      const res = await apiFetch('/api/languages/select', {
        method: 'POST',
        body: JSON.stringify({ languageId: selected }),
      })
      if (res.ok) {
        localStorage.setItem('selectedLanguageId', selected)
        navigate('/onboarding/tour')
      }
    } catch (e) {
      console.error(e)
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

        <div className="language-grid">
          {languages.map((lang) => (
            <button
              key={lang.id}
              className={`language-card ${selected === lang.id ? 'language-selected' : ''}`}
              onClick={() => setSelected(lang.id)}
              type="button"
            >
              <span className="language-icon">{lang.icono}</span>
              <span className="language-name">{lang.nombre}</span>
            </button>
          ))}
        </div>

        <button
          className="onboarding-continue-btn"
          onClick={handleContinue}
          disabled={!selected || loading}
          type="button"
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}

export default OnboardingLanguagePage
