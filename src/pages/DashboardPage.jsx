import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import { useLanguage } from '../context/useLanguage'
import {
  clearSelectedLanguageId,
  deleteLanguageSelection,
  getDashboardOverview,
  getSelectedLanguageId,
  setSelectedLanguageId,
} from '../services/learningApi'
import { notifyError, notifyPending, notifySuccess } from '../utils/notify'

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function renderLanguageIcon(icon, label) {
  if (isHttpUrl(icon)) {
    return <img className="lang-icon-image" src={icon} alt={`Logo de ${label}`} loading="lazy" />
  }

  return <span className="lang-icon-text">{icon || '💻'}</span>
}

function translateDiagnosticLevel(level, t) {
  if (!level) {
    return t('dashboard.notEvaluated')
  }

  const normalized = String(level).toLowerCase()

  if (normalized === 'principiante' || normalized === 'beginner') {
    return t('diagnostic.levelValue.principiante')
  }

  if (normalized === 'intermedio' || normalized === 'intermediate') {
    return t('diagnostic.levelValue.intermedio')
  }

  if (normalized === 'avanzado' || normalized === 'advanced') {
    return t('diagnostic.levelValue.avanzado')
  }

  return level
}

function DashboardPage() {
  const navigate = useNavigate()
  const { language, t } = useLanguage()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogLanguage, setDeleteDialogLanguage] = useState(null)
  const [deleteLanguageNameInput, setDeleteLanguageNameInput] = useState('')
  const [deleteActionInput, setDeleteActionInput] = useState('')
  const [deleteProgressInput, setDeleteProgressInput] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadOverview = useCallback(async () => {
    try {
      const data = await getDashboardOverview()
      setOverview(data)
    } catch (e) {
      console.error(e)
      notifyError(e?.message || t('dashboard.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

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
    deleteActionInput.trim().toUpperCase() === t('dashboard.deleteKeyword').toUpperCase() &&
    deleteProgressInput.trim().toUpperCase() === t('dashboard.deleteProgressKeyword').toUpperCase()

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
      notifySuccess(t('dashboard.deleteSuccess', { name: deleteDialogLanguage.nombre }))
    } catch (error) {
      const message = error.message || t('dashboard.deleteError')
      setDeleteError(message)
      notifyError(message)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId)
    if (!target) {
      return
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const streakLabel = loading
    ? '...'
    : t('dashboard.days', { count: overview?.racha || 0 })

  const xpLabel = loading
    ? '...'
    : (overview?.xpTotal || 0).toLocaleString(language === 'en' ? 'en-US' : 'es-CO')

  const levelLabel = loading
    ? '...'
    : overview?.nivel || 1

  return (
    <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar title={t('dashboard.title')} />

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <h2>{t('dashboard.sidebar.title')}</h2>
          <div className="dashboard-sidebar__stats">
            <article className="stat-card">
              <p>🔥 {t('dashboard.streak')}</p>
              <strong>{streakLabel}</strong>
            </article>
            <article className="stat-card">
              <p>⭐ {t('dashboard.totalXp')}</p>
              <strong>{xpLabel}</strong>
            </article>
            <article className="stat-card">
              <p>📊 {t('dashboard.level')}</p>
              <strong>{levelLabel}</strong>
            </article>
          </div>

          <h3>{t('dashboard.sidebar.navigate')}</h3>
          <div className="dashboard-sidebar__actions">
            <button type="button" onClick={() => scrollToSection('dashboard-languages')}>
              {t('dashboard.sidebar.languages')}
            </button>
            <button type="button" onClick={() => scrollToSection('dashboard-achievements')}>
              {t('dashboard.sidebar.achievements')}
            </button>
            <button type="button" onClick={() => scrollToSection('dashboard-activity')}>
              {t('dashboard.sidebar.activity')}
            </button>
            <button
              type="button"
              onClick={() => {
                notifyPending(t('dashboard.addLanguageHint'))
                navigate('/onboarding/language')
              }}
            >
              {t('dashboard.sidebar.onboarding')}
            </button>
          </div>
        </aside>

        <div className="dashboard-main">
          <section className="dashboard-languages" id="dashboard-languages">
            <div className="section-header">
              <h2>{t('dashboard.myLanguages')}</h2>
              <button
                className="add-language-btn"
                onClick={() => {
                  notifyPending(t('dashboard.addLanguageHint'))
                  navigate('/onboarding/language')
                }}
                type="button"
              >
                {t('dashboard.addLanguage')}
              </button>
            </div>

            {loading ? (
              <p className="loading-text">{t('dashboard.loading')}</p>
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
                      {t('dashboard.remove')}
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
                            {t('dashboard.modulesCount', {
                              completed: lang.modulosCompletados,
                              total: lang.modulosTotal,
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="lang-diagnostic-badge">{t('dashboard.pendingDiagnostic')}</span>
                      )}
                      <span className="lang-level-badge">
                        {translateDiagnosticLevel(lang.nivel_diagnostico, t)}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>{t('dashboard.emptyLanguages')}</p>
                <button onClick={() => navigate('/onboarding/language')} type="button">
                  {t('dashboard.pickLanguage')}
                </button>
              </div>
            )}
          </section>

          {overview?.achievements?.length > 0 && (
            <section className="dashboard-achievements" id="dashboard-achievements">
              <h2>{t('dashboard.achievements')}</h2>
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

          {overview?.recentXP?.length > 0 && (
            <section className="dashboard-activity" id="dashboard-activity">
              <h2>{t('dashboard.activityWeek')}</h2>
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
                        {new Date(day.dia).toLocaleDateString(language === 'en' ? 'en-US' : 'es-CO', { weekday: 'short' })}
                      </span>
                      <span className="activity-xp">{day.xp}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {deleteDialogLanguage && (
        <div className="language-delete-overlay" role="dialog" aria-modal="true">
          <div className="language-delete-modal">
            <h3>{t('dashboard.deleteTitle')}</h3>
            <p>
              {t('dashboard.deleteDescription', { name: deleteDialogLanguage.nombre })}
            </p>
            <p className="language-delete-help">
              {t('dashboard.deleteHelp')}
            </p>

            <label htmlFor="delete-language-name">{t('dashboard.deleteTypeLanguage')}</label>
            <input
              id="delete-language-name"
              type="text"
              value={deleteLanguageNameInput}
              onChange={(event) => setDeleteLanguageNameInput(event.target.value)}
              placeholder={deleteDialogLanguage.nombre}
              disabled={deleteSubmitting}
            />

            <label htmlFor="delete-language-action">{t('dashboard.deleteTypeDelete')}</label>
            <input
              id="delete-language-action"
              type="text"
              value={deleteActionInput}
              onChange={(event) => setDeleteActionInput(event.target.value)}
              placeholder={t('dashboard.deleteKeyword')}
              disabled={deleteSubmitting}
            />

            <label htmlFor="delete-language-progress">{t('dashboard.deleteTypeProgress')}</label>
            <input
              id="delete-language-progress"
              type="text"
              value={deleteProgressInput}
              onChange={(event) => setDeleteProgressInput(event.target.value)}
              placeholder={t('dashboard.deleteProgressKeyword')}
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
                {t('common.cancel')}
              </button>
              <button
                className="language-delete-confirm"
                onClick={handleConfirmDeleteLanguage}
                type="button"
                disabled={!isDeleteConfirmationValid || deleteSubmitting}
              >
                {deleteSubmitting ? t('dashboard.deleting') : t('dashboard.deleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </MotionPage>
  )
}

export default DashboardPage
