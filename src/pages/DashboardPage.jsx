import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { apiFetch } from '../services/api'

function DashboardPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
    try {
      const res = await apiFetch('/api/progress/overview')
      if (res.ok) {
        const data = await res.json()
        setOverview(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleLanguageClick = (lang) => {
    localStorage.setItem('selectedLanguageId', lang.lenguaje_id)
    if (!lang.diagnostico_completado) {
      navigate('/diagnostic')
    } else {
      navigate('/modules')
    }
  }

  return (
    <div className="dashboard-page">
      <Navbar title="Panel de aprendizaje" />

      <section className="dashboard-stats">
        <article className="stat-card">
          <p>🔥 Racha</p>
          <strong>{loading ? '...' : `${overview?.racha || 0} días`}</strong>
        </article>
        <article className="stat-card">
          <p>⭐ XP total</p>
          <strong>{loading ? '...' : (overview?.xpTotal || 0).toLocaleString()}</strong>
        </article>
        <article className="stat-card">
          <p>📊 Nivel</p>
          <strong>{loading ? '...' : overview?.nivel || 1}</strong>
        </article>
      </section>

      {/* Lenguajes del usuario */}
      <section className="dashboard-languages">
        <div className="section-header">
          <h2>Mis lenguajes</h2>
          <button
            className="add-language-btn"
            onClick={() => navigate('/onboarding/language')}
            type="button"
          >
            + Agregar
          </button>
        </div>

        {loading ? (
          <p className="loading-text">Cargando...</p>
        ) : overview?.languages?.length > 0 ? (
          <div className="language-cards-row">
            {overview.languages.map((lang) => (
              <button
                key={lang.lenguaje_id}
                className="dashboard-lang-card"
                onClick={() => handleLanguageClick(lang)}
                type="button"
              >
                <span className="lang-icon">{lang.icono}</span>
                <span className="lang-name">{lang.nombre}</span>
                {lang.diagnostico_completado ? (
                  <div className="lang-progress">
                    <div className="lang-progress-bar">
                      <div
                        className="lang-progress-fill"
                        style={{
                          width: `${lang.modulosTotal > 0 ? (lang.modulosCompletados / lang.modulosTotal) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="lang-progress-text">
                      {lang.modulosCompletados}/{lang.modulosTotal} módulos
                    </span>
                  </div>
                ) : (
                  <span className="lang-diagnostic-badge">Diagnóstico pendiente</span>
                )}
                <span className="lang-level-badge">
                  {lang.nivel_diagnostico || 'Sin evaluar'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Aún no has seleccionado un lenguaje.</p>
            <button onClick={() => navigate('/onboarding/language')} type="button">
              Elegir lenguaje
            </button>
          </div>
        )}
      </section>

      {/* Logros recientes */}
      {overview?.achievements?.length > 0 && (
        <section className="dashboard-achievements">
          <h2>Logros recientes</h2>
          <div className="achievements-row">
            {overview.achievements.map((ach, idx) => (
              <div key={idx} className="achievement-badge">
                <span className="achievement-icon">{ach.icono}</span>
                <span className="achievement-name">{ach.nombre}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actividad semanal */}
      {overview?.recentXP?.length > 0 && (
        <section className="dashboard-activity">
          <h2>Actividad esta semana</h2>
          <div className="activity-bars">
            {overview.recentXP.map((day) => {
              const maxXP = Math.max(...overview.recentXP.map((d) => d.xp), 1)
              return (
                <div key={day.dia} className="activity-bar-col">
                  <div className="activity-bar-wrapper">
                    <div
                      className="activity-bar"
                      style={{ height: `${(day.xp / maxXP) * 100}%` }}
                    />
                  </div>
                  <span className="activity-day">
                    {new Date(day.dia).toLocaleDateString('es', { weekday: 'short' })}
                  </span>
                  <span className="activity-xp">{day.xp}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

export default DashboardPage
