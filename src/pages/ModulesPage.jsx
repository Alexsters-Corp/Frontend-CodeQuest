import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoMdArrowRoundBack } from 'react-icons/io'
import MotionPage from '../components/MotionPage'
import { useLanguage } from '../context/useLanguage'
import {
  getModulesByLanguage,
  getSelectedLanguageId,
  listFavoriteLessons,
  listLessonsByModule,
  toggleLessonFavorite,
} from '../services/learningApi'
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify'

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function renderModuleIcon(icon, fallback, label) {
  if (isHttpUrl(icon)) {
    return <img className="module-icon-image" src={icon} alt={`Logo de ${label}`} loading="lazy" />
  }

  return <span className="module-icon-text">{icon || fallback}</span>
}

function ModulesPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [modules, setModules] = useState([])
  const [expandedModule, setExpandedModule] = useState(null)
  const [lessons, setLessons] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [lessonErrors, setLessonErrors] = useState({})
  const [favoriteLessonIds, setFavoriteLessonIds] = useState(() => new Set())
  const loadedModulesRef = useRef(new Set())

  const languageId = getSelectedLanguageId()

  const loadLessonsForModule = useCallback(async (moduleId) => {
    const normalizedId = Number(moduleId)
    if (!normalizedId) {
      return
    }

    if (loadedModulesRef.current.has(normalizedId)) {
      return
    }

    loadedModulesRef.current.add(normalizedId)
    setLoadingLessons(normalizedId)
    setLessonErrors((prev) => ({ ...prev, [normalizedId]: '' }))

    try {
      const data = await listLessonsByModule(normalizedId)
      setLessons((prev) => ({ ...prev, [normalizedId]: data }))
    } catch (error) {
      loadedModulesRef.current.delete(normalizedId)
      setLessons((prev) => ({ ...prev, [normalizedId]: [] }))
      const message = error.message || t('modules.lessonsError')
      setLessonErrors((prev) => ({
        ...prev,
        [normalizedId]: message,
      }))
      notifyError(message)
    } finally {
      setLoadingLessons((current) => (current === normalizedId ? null : current))
    }
  }, [t])

  const loadModules = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setLessons({})
    setLessonErrors({})
    setExpandedModule(null)
    loadedModulesRef.current.clear()

    try {
      const data = await getModulesByLanguage(Number(languageId))
      setModules(data)

      // Auto-expandir el módulo en progreso
      const inProgress = data.find((m) => m.estado === 'en_progreso')
      if (inProgress) {
        setExpandedModule(inProgress.id)
        await loadLessonsForModule(inProgress.id)
      }
    } catch (error) {
      if (normalizeSearchText(error.message).includes('diagnostico')) {
        notifyInfo(t('modules.diagnosticRequired'))
        navigate('/diagnostic')
        return
      }

      setModules([])
      const message = error.message || t('modules.loadError')
      setLoadError(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [languageId, loadLessonsForModule, navigate, t])

  useEffect(() => {
    if (!languageId) {
      navigate('/dashboard')
      return
    }

    loadModules()
  }, [languageId, loadModules, navigate])

  useEffect(() => {
    let cancelled = false

    async function loadFavoriteIds() {
      try {
        const favorites = await listFavoriteLessons()
        if (cancelled) return

        const ids = new Set(favorites.map((item) => Number(item.lessonId)).filter(Boolean))
        setFavoriteLessonIds(ids)
      } catch {
        if (!cancelled) {
          setFavoriteLessonIds(new Set())
        }
      }
    }

    loadFavoriteIds()

    return () => {
      cancelled = true
    }
  }, [lessons])

  const toggleModule = async (moduleId) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null)
      return
    }

    setExpandedModule(moduleId)
    await loadLessonsForModule(moduleId)
  }

  const handleToggleFavorite = async ({ lesson, module }) => {
    try {
      const result = await toggleLessonFavorite({
        lessonId: lesson.id,
        lessonTitle: lesson.titulo,
        lessonDescription: lesson.descripcion,
        moduleId: module.id,
        moduleName: module.nombre,
        xpReward: lesson.xp_recompensa,
      })

      setFavoriteLessonIds((prev) => {
        const next = new Set(prev)
        if (result.favorite) {
          next.add(Number(lesson.id))
        } else {
          next.delete(Number(lesson.id))
        }
        return next
      })

      notifySuccess(
        result.favorite
          ? t('favorites.addedToast', { lesson: lesson.titulo })
          : t('favorites.removedToast', { lesson: lesson.titulo })
      )
    } catch (error) {
      notifyError(error.message || t('favorites.toggleError'))
    }
  }

  const statusIcon = (estado) => {
    switch (estado) {
      case 'completado':
      case 'completada':
        return '✅'
      case 'en_progreso':
      case 'disponible':
        return '📖'
      default:
        return '🔒'
    }
  }

  const statusLabel = (estado) => {
    switch (estado) {
      case 'completado':
      case 'completada':
        return t('modules.status.completed')
      case 'en_progreso':
        return t('modules.status.inProgress')
      case 'disponible':
        return t('modules.status.available')
      default:
        return t('modules.status.blocked')
    }
  }

  if (loading) {
    return (
      <MotionPage className="modules-page" delay={0.06}>
        <div className="modules-loading">
          <div className="spinner" />
          <p>{t('modules.loading')}</p>
        </div>
      </MotionPage>
    )
  }

  return (
    <MotionPage className="modules-page" delay={0.06}>
      <div className="modules-container">
        <div className="modules-header">
          <button className="modules-back" onClick={() => navigate('/dashboard')} type="button">
            <IoMdArrowRoundBack /> {t('modules.back')}
          </button>
          <h1>{t('modules.title')}</h1>
          <button className="modules-back" onClick={() => navigate('/favorites')} type="button">
            {t('favorites.title')}
          </button>
        </div>

        <div className="modules-list">
          {loadError && <p className="modules-error-message">{loadError}</p>}

          {!loadError && modules.length === 0 && (
            <div className="modules-empty-state">
              <p>{t('modules.empty')}</p>
              <button onClick={() => navigate('/dashboard')} type="button">
                {t('modules.backDashboard')}
              </button>
            </div>
          )}

          {modules.map((mod) => (
            <div key={mod.id} className={`module-card module-${mod.estado}`}>
              <button
                className="module-header-btn"
                onClick={() => mod.estado !== 'bloqueado' && toggleModule(mod.id)}
                type="button"
                disabled={mod.estado === 'bloqueado'}
              >
                <div className="module-info">
                  <span className="module-icon">
                    {renderModuleIcon(mod.icono, statusIcon(mod.estado), mod.nombre)}
                  </span>
                  <div>
                    <h2>
                      {mod.numero}. {mod.nombre}
                    </h2>
                    <p className="module-desc">{mod.descripcion}</p>
                  </div>
                </div>
                <div className="module-meta">
                  <span className={`module-status status-${mod.estado}`}>
                    {statusLabel(mod.estado)}
                  </span>
                  {mod.porcentaje > 0 && (
                    <div className="module-progress-mini">
                      <div
                        className="module-progress-fill"
                        style={{ width: `${mod.porcentaje}%` }}
                      />
                    </div>
                  )}
                  {mod.estado !== 'bloqueado' && (
                    <span className="module-arrow">
                      {expandedModule === mod.id ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </button>

              {expandedModule === mod.id && (
                <div className="module-lessons">
                  {loadingLessons === mod.id ? (
                    <p className="lessons-loading">{t('modules.lessonsLoading')}</p>
                  ) : lessonErrors[mod.id] ? (
                    <p className="modules-error-message">{lessonErrors[mod.id]}</p>
                  ) : (lessons[mod.id] || []).length === 0 ? (
                    <p className="lessons-empty-message">
                      {t('modules.noLessons')}
                    </p>
                  ) : (
                    (lessons[mod.id] || []).map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`lesson-item lesson-${lesson.estado}`}
                      >
                        <span className="lesson-status-icon">{statusIcon(lesson.estado)}</span>
                        <div className="lesson-info">
                          <h3>{lesson.titulo}</h3>
                          <p>{lesson.descripcion}</p>
                          <span className="lesson-xp">+{lesson.xp_recompensa} XP</span>
                        </div>
                        <button
                          className={`lesson-favorite-btn ${favoriteLessonIds.has(Number(lesson.id)) ? 'active' : ''}`}
                          onClick={() => handleToggleFavorite({ lesson, module: mod })}
                          type="button"
                          aria-label={favoriteLessonIds.has(Number(lesson.id)) ? t('favorites.remove') : t('favorites.add')}
                          title={favoriteLessonIds.has(Number(lesson.id)) ? t('favorites.remove') : t('favorites.add')}
                        >
                          {favoriteLessonIds.has(Number(lesson.id)) ? '★' : '☆'}
                        </button>
                        <button
                          className="lesson-go-btn"
                          onClick={() => navigate(`/lesson/${lesson.id}`)}
                          type="button"
                          disabled={lesson.estado === 'bloqueado'}
                        >
                          {lesson.estado === 'completada'
                            ? t('modules.repeat')
                            : lesson.estado === 'bloqueado'
                              ? '🔒'
                              : t('modules.start')}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MotionPage>
  )
}

export default ModulesPage
