import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  clearSelectedLanguageId,
  deleteLanguageSelection,
  getDashboardOverview,
  getSelectedLanguageId,
  setSelectedLanguageId,
} from '../services/learningApi'

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function renderLanguageIcon(icon, label) {
  if (isHttpUrl(icon)) {
    return <img className="lang-icon-image" src={icon} alt={`Logo de ${label}`} loading="lazy" />
  }

  return <span className="lang-icon-text">{icon || '💻'}</span>
}

function DashboardPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogLanguage, setDeleteDialogLanguage] = useState(null)
  const [deleteLanguageNameInput, setDeleteLanguageNameInput] = useState('')
  const [deleteActionInput, setDeleteActionInput] = useState('')
  const [deleteProgressInput, setDeleteProgressInput] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
    try {
      const data = await getDashboardOverview()
      setOverview(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleLanguageClick = (lang) => {
    setSelectedLanguageId(lang.lenguaje_id)

    if (!lang.diagnostico_completado) {
      navigate('/diagnostic')
    } else {
      navigate('/modules')
    }
  }

  const openDeleteDialog = (lang) => {
    setDeleteDialogLanguage(lang)
    setDeleteLanguageNameInput('')
    setDeleteActionInput('')
    setDeleteProgressInput('')
    setDeleteError('')
  }

  const closeDeleteDialog = () => {
    if (deleteSubmitting) {
      return
    }

    setDeleteDialogLanguage(null)
    setDeleteLanguageNameInput('')
    setDeleteActionInput('')
    setDeleteProgressInput('')
    setDeleteError('')
  }

  const isDeleteConfirmationValid =
    deleteDialogLanguage &&
    deleteLanguageNameInput.trim() === deleteDialogLanguage.nombre &&
    deleteActionInput.trim().toUpperCase() === 'ELIMINAR' &&
    deleteProgressInput.trim().toUpperCase() === 'ELIMINAR TODO MI PROGRESO'

  const handleConfirmDeleteLanguage = async () => {
    if (!deleteDialogLanguage || !isDeleteConfirmationValid) {
      return
    }

    setDeleteSubmitting(true)
    setDeleteError('')

    try {
      await deleteLanguageSelection({
        languageId: deleteDialogLanguage.lenguaje_id,
        confirmationText: deleteActionInput,
        confirmationLanguageName: deleteLanguageNameInput,
        confirmProgressText: deleteProgressInput,
      })

      if (getSelectedLanguageId() === deleteDialogLanguage.lenguaje_id) {
        clearSelectedLanguageId()
      }

      await loadOverview()
      closeDeleteDialog()
    } catch (error) {
      setDeleteError(error.message || 'No fue posible eliminar el lenguaje.')
    } finally {
      setDeleteSubmitting(false)
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
              <div
                key={lang.lenguaje_id}
                className="dashboard-lang-card"
              >
                <button
                  className="lang-remove-btn"
                  onClick={() => openDeleteDialog(lang)}
                  type="button"
                >
                  Eliminar
                </button>

                <button
                  className="lang-open-btn"
                  onClick={() => handleLanguageClick(lang)}
                  type="button"
                >
                  <span className="lang-icon">{renderLanguageIcon(lang.icono, lang.nombre)}</span>
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
              </div>
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

      {deleteDialogLanguage && (
        <div className="language-delete-overlay" role="dialog" aria-modal="true">
          <div className="language-delete-modal">
            <h3>Eliminar lenguaje</h3>
            <p>
              Esta acción eliminará la ruta seleccionada y el progreso asociado a{' '}
              <strong>{deleteDialogLanguage.nombre}</strong>.
            </p>
            <p className="language-delete-help">
              Confirma en tres pasos para evitar borrados accidentales.
            </p>

            <label htmlFor="delete-language-name">Escribe el nombre exacto del lenguaje</label>
            <input
              id="delete-language-name"
              type="text"
              value={deleteLanguageNameInput}
              onChange={(event) => setDeleteLanguageNameInput(event.target.value)}
              placeholder={deleteDialogLanguage.nombre}
              disabled={deleteSubmitting}
            />

            <label htmlFor="delete-language-action">Escribe ELIMINAR</label>
            <input
              id="delete-language-action"
              type="text"
              value={deleteActionInput}
              onChange={(event) => setDeleteActionInput(event.target.value)}
              placeholder="ELIMINAR"
              disabled={deleteSubmitting}
            />

            <label htmlFor="delete-language-progress">Escribe ELIMINAR TODO MI PROGRESO</label>
            <input
              id="delete-language-progress"
              type="text"
              value={deleteProgressInput}
              onChange={(event) => setDeleteProgressInput(event.target.value)}
              placeholder="ELIMINAR TODO MI PROGRESO"
              disabled={deleteSubmitting}
            />

            {deleteError && <p className="language-delete-error">{deleteError}</p>}

            <div className="language-delete-actions">
              <button
                className="language-delete-cancel"
                onClick={closeDeleteDialog}
                type="button"
                disabled={deleteSubmitting}
              >
                Cancelar
              </button>
              <button
                className="language-delete-confirm"
                onClick={handleConfirmDeleteLanguage}
                type="button"
                disabled={!isDeleteConfirmationValid || deleteSubmitting}
              >
                {deleteSubmitting ? 'Eliminando...' : 'Eliminar lenguaje'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
