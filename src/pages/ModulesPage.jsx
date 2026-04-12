import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getModulesByLanguage, getSelectedLanguageId, listLessonsByModule } from '../services/learningApi'

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
  const [modules, setModules] = useState([])
  const [expandedModule, setExpandedModule] = useState(null)
  const [lessons, setLessons] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [lessonErrors, setLessonErrors] = useState({})
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
      setLessonErrors((prev) => ({
        ...prev,
        [normalizedId]: error.message || 'No fue posible cargar las lecciones del módulo.',
      }))
    } finally {
      setLoadingLessons((current) => (current === normalizedId ? null : current))
    }
  }, [])

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
        navigate('/diagnostic')
        return
      }

      setModules([])
      setLoadError(error.message || 'No fue posible cargar los módulos.')
    } finally {
      setLoading(false)
    }
  }, [languageId, loadLessonsForModule, navigate])

  useEffect(() => {
    if (!languageId) {
      navigate('/dashboard')
      return
    }

    loadModules()
  }, [languageId, loadModules, navigate])

  const toggleModule = async (moduleId) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null)
      return
    }

    setExpandedModule(moduleId)
    await loadLessonsForModule(moduleId)
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
        return 'Completado'
      case 'en_progreso':
        return 'En progreso'
      case 'disponible':
        return 'Disponible'
      default:
        return 'Bloqueado'
    }
  }

  if (loading) {
    return (
      <div className="modules-page">
        <div className="modules-loading">
          <div className="spinner" />
          <p>Cargando módulos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="modules-page">
      <div className="modules-container">
        <div className="modules-header">
          <button className="modules-back" onClick={() => navigate('/dashboard')} type="button">
            ← Dashboard
          </button>
          <h1>Ruta de Aprendizaje</h1>
        </div>

        <div className="modules-list">
          {loadError && <p className="modules-error-message">{loadError}</p>}

          {!loadError && modules.length === 0 && (
            <div className="modules-empty-state">
              <p>Aún no hay módulos disponibles para este lenguaje.</p>
              <button onClick={() => navigate('/dashboard')} type="button">
                Volver al Dashboard
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
                    <p className="lessons-loading">Cargando lecciones...</p>
                  ) : lessonErrors[mod.id] ? (
                    <p className="modules-error-message">{lessonErrors[mod.id]}</p>
                  ) : (lessons[mod.id] || []).length === 0 ? (
                    <p className="lessons-empty-message">
                      Este módulo aún no tiene lecciones publicadas.
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
                          className="lesson-go-btn"
                          onClick={() => navigate(`/lesson/${lesson.id}`)}
                          type="button"
                          disabled={lesson.estado === 'bloqueado'}
                        >
                          {lesson.estado === 'completada'
                            ? 'Repetir'
                            : lesson.estado === 'bloqueado'
                              ? '🔒'
                              : 'Empezar'}
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
    </div>
  )
}

export default ModulesPage
