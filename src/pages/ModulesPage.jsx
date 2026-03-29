import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../services/api'

function ModulesPage() {
  const navigate = useNavigate()
  const [modules, setModules] = useState([])
  const [expandedModule, setExpandedModule] = useState(null)
  const [lessons, setLessons] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(null)

  const languageId = localStorage.getItem('selectedLanguageId')

  useEffect(() => {
    if (!languageId) {
      navigate('/dashboard')
      return
    }
    loadModules()
  }, [languageId])

  const loadModules = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/lessons/modules?languageId=${languageId}`)
      const data = await res.json()
      if (res.ok) {
        setModules(data)
        // Auto-expandir el módulo en progreso
        const inProgress = data.find((m) => m.estado === 'en_progreso')
        if (inProgress) {
          toggleModule(inProgress.id)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleModule = async (moduleId) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null)
      return
    }
    setExpandedModule(moduleId)

    if (!lessons[moduleId]) {
      setLoadingLessons(moduleId)
      try {
        const res = await apiFetch(`/api/lessons/module/${moduleId}`)
        if (res.ok) {
          const data = await res.json()
          setLessons((prev) => ({ ...prev, [moduleId]: data }))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingLessons(null)
      }
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
          {modules.map((mod) => (
            <div key={mod.id} className={`module-card module-${mod.estado}`}>
              <button
                className="module-header-btn"
                onClick={() => mod.estado !== 'bloqueado' && toggleModule(mod.id)}
                type="button"
                disabled={mod.estado === 'bloqueado'}
              >
                <div className="module-info">
                  <span className="module-icon">{mod.icono || statusIcon(mod.estado)}</span>
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
