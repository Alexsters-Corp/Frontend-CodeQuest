import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useRole } from '../hooks/useRole'
import {
  createInstructorClass,
  getClassAnalytics,
  listInstructorClasses,
} from '../services/rbacApi'

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value) {
  if (!value) {
    return 'Sin fecha'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : DATE_FORMATTER.format(date)
}

function InstructorDashboardPage() {
  const navigate = useNavigate()
  const { role } = useRole()

  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newClassName, setNewClassName] = useState('')
  const [newClassDescription, setNewClassDescription] = useState('')
  const [creatingClass, setCreatingClass] = useState(false)

  const [selectedClassId, setSelectedClassId] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')

  useEffect(() => {
    loadClasses()
  }, [])

  const selectedClass = useMemo(
    () => classes.find((item) => Number(item.id) === Number(selectedClassId)) || null,
    [classes, selectedClassId]
  )

  async function loadClasses() {
    setLoading(true)
    setError('')
    try {
      const payload = await listInstructorClasses()
      setClasses(payload)
    } catch (requestError) {
      setError(requestError.message || 'No fue posible cargar las clases.')
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClass(event) {
    event.preventDefault()

    const trimmedName = String(newClassName || '').trim()
    if (trimmedName.length < 3) {
      setError('El nombre de la clase debe tener al menos 3 caracteres.')
      return
    }

    setCreatingClass(true)
    setError('')

    try {
      await createInstructorClass({
        name: trimmedName,
        description: newClassDescription,
      })

      setNewClassName('')
      setNewClassDescription('')
      await loadClasses()
    } catch (requestError) {
      setError(requestError.message || 'No fue posible crear la clase.')
    } finally {
      setCreatingClass(false)
    }
  }

  async function handleLoadAnalytics(classId) {
    setSelectedClassId(classId)
    setAnalytics(null)
    setAnalyticsError('')
    setAnalyticsLoading(true)

    try {
      const payload = await getClassAnalytics(classId)
      setAnalytics(payload)
    } catch (requestError) {
      setAnalyticsError(requestError.message || 'No fue posible cargar analytics de la clase.')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  return (
    <div className="rbac-page">
      <Navbar title="Panel de instructor" />

      <div className="rbac-header">
        <div>
          <p className="rbac-kicker">Panel por rol</p>
          <h1>Instructor</h1>
          <p className="rbac-subtitle">
            Gestiona tus clases y revisa métricas de progreso de estudiantes.
          </p>
        </div>
        <div className="rbac-actions-inline">
          <span className="rbac-role-chip">Rol actual: {role}</span>
          <button type="button" onClick={() => navigate('/dashboard')}>
            Volver al dashboard
          </button>
        </div>
      </div>

      <section className="rbac-card">
        <h2>Crear clase</h2>
        <form className="rbac-form" onSubmit={handleCreateClass}>
          <label htmlFor="class-name">Nombre</label>
          <input
            id="class-name"
            value={newClassName}
            onChange={(event) => setNewClassName(event.target.value)}
            placeholder="Ejemplo: Backend 2025 - Grupo A"
            disabled={creatingClass}
          />

          <label htmlFor="class-description">Descripción (opcional)</label>
          <input
            id="class-description"
            value={newClassDescription}
            onChange={(event) => setNewClassDescription(event.target.value)}
            placeholder="Notas para identificar el grupo"
            disabled={creatingClass}
          />

          <button type="submit" disabled={creatingClass}>
            {creatingClass ? 'Creando...' : 'Crear clase'}
          </button>
        </form>
      </section>

      <section className="rbac-card">
        <div className="rbac-section-head">
          <h2>Mis clases</h2>
          <button type="button" onClick={loadClasses} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {error && <p className="rbac-error">{error}</p>}

        {!error && loading && <p>Cargando clases...</p>}

        {!loading && classes.length === 0 && (
          <p className="rbac-muted">No tienes clases creadas todavía.</p>
        )}

        {classes.length > 0 && (
          <div className="rbac-table-wrap">
            <table className="rbac-table">
              <thead>
                <tr>
                  <th>Clase</th>
                  <th>Estudiantes</th>
                  <th>Rutas asignadas</th>
                  <th>Creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.description && <p className="rbac-cell-note">{item.description}</p>}
                    </td>
                    <td>{Number(item.students_total || 0)}</td>
                    <td>{Number(item.assigned_paths_total || 0)}</td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleLoadAnalytics(item.id)}
                        disabled={analyticsLoading && Number(selectedClassId) === Number(item.id)}
                      >
                        {analyticsLoading && Number(selectedClassId) === Number(item.id)
                          ? 'Cargando...'
                          : 'Ver analytics'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedClass && (
        <section className="rbac-card">
          <h2>Analytics de {selectedClass.name}</h2>

          {analyticsError && <p className="rbac-error">{analyticsError}</p>}
          {analyticsLoading && <p>Cargando analytics...</p>}

          {!analyticsLoading && analytics && (
            <>
              <div className="rbac-metric-grid">
                <article>
                  <p>Estudiantes activos</p>
                  <strong>{Number(analytics.summary?.students_total || 0)}</strong>
                </article>
                <article>
                  <p>Lecciones completadas</p>
                  <strong>{Number(analytics.summary?.completed_lessons_total || 0)}</strong>
                </article>
                <article>
                  <p>Lecciones iniciadas</p>
                  <strong>{Number(analytics.summary?.lessons_started_total || 0)}</strong>
                </article>
                <article>
                  <p>Señal promedio</p>
                  <strong>{Number(analytics.summary?.progress_signal_avg || 0)}%</strong>
                </article>
              </div>

              <div className="rbac-table-wrap">
                <table className="rbac-table">
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Email</th>
                      <th>Completadas</th>
                      <th>Iniciadas</th>
                      <th>XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(analytics.students) && analytics.students.length > 0 ? (
                      analytics.students.map((student) => (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          <td>{student.email}</td>
                          <td>{Number(student.completed_lessons || 0)}</td>
                          <td>{Number(student.started_lessons || 0)}</td>
                          <td>{Number(student.earned_xp || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>No hay estudiantes activos en esta clase.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

export default InstructorDashboardPage
