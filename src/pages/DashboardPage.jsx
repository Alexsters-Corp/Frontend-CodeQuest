import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import LoadingSpinner from '../components/LoadingSpinner'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { useAuth } from '../context/useAuth'
import {
  clearSelectedLanguageId,
  deleteLanguageSelection,
  getDashboardOverview,
  getSelectedLanguageId,
  joinClassWithCode,
  setSelectedLanguageId,
} from '../services/learningApi'
import { getLeaderboard } from '../services/socialApi'
import { notifyError, notifyInfo, notifyPending, notifySuccess } from '../utils/notify'

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
  const showDeferredDashboardSections = false
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [streakJitter, setStreakJitter] = useState(false)
  const [pendingJitter, setPendingJitter] = useState(false)
  const [deleteDialogLanguage, setDeleteDialogLanguage] = useState(null)
  const [deleteLanguageNameInput, setDeleteLanguageNameInput] = useState('')
  const [deleteActionInput, setDeleteActionInput] = useState('')
  const [deleteProgressInput, setDeleteProgressInput] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [openCardMenuId, setOpenCardMenuId] = useState(null)
  const [rankingPreview, setRankingPreview] = useState([])
  const [rankingPreviewLoading, setRankingPreviewLoading] = useState(true)
  const [rankingPosition, setRankingPosition] = useState(null)

  const [showJoinModal, setShowJoinModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)

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

  useEffect(() => {
    if (!location.state?.fromLesson) return
    window.history.replaceState({}, document.title)
    setPendingJitter(true)
  }, [location.state])

  useEffect(() => {
    if (!pendingJitter || loading || !overview?.streakActiveToday) return
    setPendingJitter(false)
    const startTimer = setTimeout(() => {
      setStreakJitter(true)
      const endTimer = setTimeout(() => setStreakJitter(false), 1900)
      return () => clearTimeout(endTimer)
    }, 350)
    return () => clearTimeout(startTimer)
  }, [pendingJitter, loading, overview?.streakActiveToday])

  useEffect(() => {
    if (!openCardMenuId) return
    const close = () => setOpenCardMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openCardMenuId])

  const loadRankingPreview = useCallback(async () => {
    setRankingPreviewLoading(true)
    try {
      const data = await getLeaderboard('global', 5)
      setRankingPreview(Array.isArray(data.entries) ? data.entries.slice(0, 4) : [])

      const resolvedRank = Number(
        data?.viewerRank
        ?? data?.myRank
        ?? data?.currentUserRank
        ?? data?.position
      )
      setRankingPosition(Number.isFinite(resolvedRank) && resolvedRank > 0 ? resolvedRank : null)
    } catch (error) {
      console.error(error)
      setRankingPreview([])
      setRankingPosition(null)
    } finally {
      setRankingPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRankingPreview()
  }, [loadRankingPreview])

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

  const handleJoinClass = async (e) => {
    e.preventDefault()
    const code = String(inviteCode || '').trim().toUpperCase()
    if (!code) {
      notifyInfo(t('dashboard.joinClassPlaceholder'))
      return
    }

    setJoining(true)
    try {
      const result = await joinClassWithCode(code)
      notifySuccess(t('dashboard.joinSuccess', { name: result.className }))
      setInviteCode('')
      setShowJoinModal(false)
      await loadOverview()
    } catch (requestError) {
      notifyError(requestError.message || t('dashboard.joinError'))
    } finally {
      setJoining(false)
    }
  }

  const streakLabel = loading
    ? '...'
    : t('dashboard.days', { count: overview?.racha || 0 })

  const achievementsLabel = loading
    ? '...'
    : overview?.achievements?.length || 0

  const levelLabel = loading
    ? '...'
    : overview?.nivel || 1

  const streakEmojiClass = [
    'stat-card__icon',
    'streak-emoji',
    overview?.streakActiveToday ? 'streak-emoji--active' : 'streak-emoji--inactive',
    streakJitter ? 'streak-emoji--jitter' : '',
  ].filter(Boolean).join(' ')

  const getPodiumEntry = (targetRank) => {
    if (!Array.isArray(rankingPreview) || rankingPreview.length === 0) {
      return null
    }

    const byRank = rankingPreview.find((entry) => Number(entry.rank) === targetRank)
    if (byRank) {
      return byRank
    }

    const fallbackIndex = targetRank - 1
    return rankingPreview[fallbackIndex] || null
  }

  const podiumSecond = getPodiumEntry(2)
  const podiumFirst = getPodiumEntry(1)
  const podiumThird = getPodiumEntry(3)
  const fourthEntry = getPodiumEntry(4)

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar
        title={user?.nombre || t('nav.defaultName')}
        hideActions
        headerAside={(
          <div className="dashboard-header-summary__grid">
            <article className="stat-card">
              <span className={streakEmojiClass}>🔥</span>
              <div className="stat-card__content">
                <p>{t('dashboard.streak')}</p>
                <strong>{streakLabel}</strong>
              </div>
            </article>
            {/* Nota para futuras IAs: no eliminar la tarjeta ni la sección de "Logros".
                Se ocultan temporalmente en frontend por regla de producto y se reactivarán cuando esta funcionalidad escale. */}
            {showDeferredDashboardSections && (
              <article className="stat-card">
                <span className="stat-card__icon">🏆</span>
                <div className="stat-card__content">
                  <p>{t('dashboard.achievements')}</p>
                  <strong>{achievementsLabel}</strong>
                </div>
              </article>
            )}
            <article className="stat-card">
              <span className="stat-card__icon">📊</span>
              <div className="stat-card__content">
                <p>{t('dashboard.level')}</p>
                <strong>{levelLabel}</strong>
              </div>
            </article>
          </div>
        )}
      />

      <div className="dashboard-content-layout">
      <div className="dashboard-main">
          <section className="dashboard-languages" id="dashboard-languages">
              <div className="section-header">
                <h2>{t('dashboard.myLanguages')}</h2>
                <div className="section-actions">
                  <button
                    className="join-class-btn"
                    onClick={() => setShowJoinModal(true)}
                    type="button"
                  >
                    {t('dashboard.joinClass')}
                  </button>
                </div>
              </div>

            {loading ? (
              <div className="dashboard-loading-container">
                <LoadingSpinner size="large" />
                <p className="loading-text">{t('dashboard.loading')}</p>
              </div>
            ) : overview?.languages?.length > 0 ? (
              <div className="language-cards-row">
                {overview.languages.map((lang) => (
                  <div
                    key={lang.lenguaje_id}
                    className="dashboard-lang-card"
                  >
                    <button
                      type="button"
                      className="lang-menu-trigger"
                      onClick={(e) => { e.stopPropagation(); setOpenCardMenuId(openCardMenuId === lang.lenguaje_id ? null : lang.lenguaje_id) }}
                      aria-label="Opciones"
                    >
                      ⋯
                    </button>
                    {openCardMenuId === lang.lenguaje_id && (
                      <div className="lang-card-menu" role="menu">
                        <button type="button" className="lang-card-menu__item lang-card-menu__item--danger" onClick={() => { openDeleteDialog(lang); setOpenCardMenuId(null) }}>
                          🗑️ {t('dashboard.remove')}
                        </button>
                      </div>
                    )}

                    <button
                      className="lang-open-btn"
                      onClick={() => handleLanguageClick(lang)}
                      type="button"
                    >
                      <span className="lang-icon">{renderLanguageIcon(lang.icono, lang.nombre)}</span>
                      <span className="lang-name">{lang.nombre}</span>
                      {lang.diagnostico_completado ? (
                        <>
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
                        </>
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
              </div>
            )}
          </section>

          {showDeferredDashboardSections && overview?.achievements?.length > 0 && (
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
        </div>

        <aside className="dashboard-ranking-sidebar">
          <section className="dashboard-ranking-preview" id="dashboard-ranking-preview">
            <div className="dashboard-ranking-preview__head">
              <h3>{t('dashboard.rankingPreview.title')}</h3>
            </div>

            <div className="dashboard-ranking-preview__hero" aria-hidden="true">
              <div className="dashboard-ranking-preview__hero-light dashboard-ranking-preview__hero-light--left" />
              <div className="dashboard-ranking-preview__hero-light dashboard-ranking-preview__hero-light--right" />

              <div className="dashboard-ranking-preview__hero-podium">
                <div className="dashboard-ranking-preview__hero-step dashboard-ranking-preview__hero-step--silver">
                  <span className="dashboard-ranking-preview__hero-step-rank">2</span>
                  <span className="dashboard-ranking-preview__hero-step-avatar">{rankingPreviewLoading ? '…' : (podiumSecond?.username?.[0] || '?').toUpperCase()}</span>
                </div>
                <div className="dashboard-ranking-preview__hero-step dashboard-ranking-preview__hero-step--gold">
                  <span className="dashboard-ranking-preview__hero-step-rank">1</span>
                  <span className="dashboard-ranking-preview__hero-step-avatar">{rankingPreviewLoading ? '…' : (podiumFirst?.username?.[0] || '?').toUpperCase()}</span>
                </div>
                <div className="dashboard-ranking-preview__hero-step dashboard-ranking-preview__hero-step--bronze">
                  <span className="dashboard-ranking-preview__hero-step-rank">3</span>
                  <span className="dashboard-ranking-preview__hero-step-avatar">{rankingPreviewLoading ? '…' : (podiumThird?.username?.[0] || '?').toUpperCase()}</span>
                </div>
              </div>
            </div>

            {rankingPreviewLoading ? (
              <article className="dashboard-ranking-preview__item" role="status" aria-live="polite">
                <div className="dashboard-ranking-preview__rank">#4</div>
                <div className="dashboard-ranking-preview__meta">
                  <strong>...</strong>
                  <span>{t('dashboard.rankingPreview.loading')}</span>
                </div>
              </article>
            ) : fourthEntry ? (
              <article className="dashboard-ranking-preview__item" role="listitem">
                <div className="dashboard-ranking-preview__rank">#4</div>
                <div className="dashboard-ranking-preview__meta">
                  <strong>@{fourthEntry.username}</strong>
                  <span>
                    {t('ranking.xpLabel', { value: fourthEntry.totalXp || 0 })}
                    {' · '}
                    {t('ranking.levelLabel', { value: fourthEntry.currentLevel || 1 })}
                  </span>
                </div>
              </article>
            ) : (
              <p className="dashboard-ranking-preview__empty">{t('dashboard.rankingPreview.empty')}</p>
            )}

            <div className="dashboard-ranking-preview__position">
              <span className="dashboard-ranking-preview__position-label">{t('dashboard.rankingPreview.positionLabel')}</span>
              <strong className="dashboard-ranking-preview__position-value">
                {rankingPreviewLoading ? '...' : (rankingPosition || t('dashboard.rankingPreview.positionUnknown'))}
              </strong>
            </div>

            <button
              className="dashboard-ranking-preview__footer-btn"
              onClick={() => navigate('/ranking?scope=global')}
              type="button"
            >
              {t('dashboard.rankingPreview.viewAll')}
              <span className="footer-btn-icon">→</span>
            </button>
          </section>
        </aside>
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
      {showJoinModal && (
        <div className="language-delete-overlay" role="dialog" aria-modal="true">
          <div className="language-delete-modal join-class-modal">
            <h3>{t('dashboard.joinClassTitle')}</h3>
            <p>{t('dashboard.joinClassDescription')}</p>

            <form onSubmit={handleJoinClass}>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
                  setInviteCode(val);
                }}
                placeholder={t('dashboard.joinClassPlaceholder')}
                disabled={joining}
                autoFocus
              />

              <div className="language-delete-actions">
                <button
                  className="language-delete-cancel"
                  onClick={() => setShowJoinModal(false)}
                  type="button"
                  disabled={joining}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="language-delete-confirm join-confirm-btn"
                  type="submit"
                  disabled={joining || !inviteCode.trim()}
                >
                  {joining ? t('common.loading') : t('dashboard.joinAction')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </MotionPage>
    </SidebarLayout>
  )
}

export default DashboardPage
