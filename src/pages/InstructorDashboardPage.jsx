import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { useRole } from '../hooks/useRole'
import {
  createInstructorClass,
  getClassAnalytics,
  listInstructorClasses,
} from '../services/rbacApi'
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify'

function InstructorDashboardPage() {
  const navigate = useNavigate()
  const { role } = useRole()
  const { formatDate, t } = useLanguage()

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

  const selectedClass = useMemo(
    () => classes.find((item) => Number(item.id) === Number(selectedClassId)) || null,
    [classes, selectedClassId]
  )

  const loadClasses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await listInstructorClasses()
      setClasses(payload)
    } catch (requestError) {
      const message = requestError.message || t('instructor.loadError')
      setError(message)
      notifyError(message)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  async function handleCreateClass(event) {
    event.preventDefault()

    const trimmedName = String(newClassName || '').trim()
    if (trimmedName.length < 3) {
      const message = t('instructor.nameMin')
      setError(message)
      notifyInfo(message)
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
      notifySuccess(t('instructor.createSuccess'))
    } catch (requestError) {
      const message = requestError.message || t('instructor.createError')
      setError(message)
      notifyError(message)
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
      const message = requestError.message || t('instructor.analyticsError')
      setAnalyticsError(message)
      notifyError(message)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar title={t('instructor.title')} hideActions />

      <section className="rbac-page">
        <div className="rbac-header">
        <div>
          <p className="rbac-kicker">{t('route.rolePanel')}</p>
          <h1>{t('instructor.header')}</h1>
          <p className="rbac-subtitle">
            {t('instructor.subtitle')}
          </p>
        </div>
        <div className="rbac-actions-inline">
          <span className="rbac-role-chip">{t('instructor.currentRole', { role })}</span>
          <button type="button" onClick={() => navigate('/dashboard')}>
            {t('instructor.backDashboard')}
          </button>
        </div>
      </div>

      <section className="rbac-card">
        <h2>{t('instructor.createClass')}</h2>
        <form className="rbac-form" onSubmit={handleCreateClass}>
          <label htmlFor="class-name">{t('instructor.className')}</label>
          <input
            id="class-name"
            value={newClassName}
            onChange={(event) => setNewClassName(event.target.value)}
            placeholder={t('instructor.classNamePlaceholder')}
            disabled={creatingClass}
          />

          <label htmlFor="class-description">{t('instructor.classDescription')}</label>
          <input
            id="class-description"
            value={newClassDescription}
            onChange={(event) => setNewClassDescription(event.target.value)}
            placeholder={t('instructor.classDescriptionPlaceholder')}
            disabled={creatingClass}
          />

          <button type="submit" disabled={creatingClass}>
            {creatingClass ? t('instructor.creating') : t('instructor.createClass')}
          </button>
        </form>
      </section>

      <section className="rbac-card">
        <div className="rbac-section-head">
          <h2>{t('instructor.myClasses')}</h2>
          <button type="button" onClick={loadClasses} disabled={loading}>
            {loading ? t('instructor.refreshing') : t('common.update')}
          </button>
        </div>

        {error && <p className="rbac-error">{error}</p>}

        {!error && loading && <p>{t('common.loading')}</p>}

        {!loading && classes.length === 0 && (
          <p className="rbac-muted">{t('instructor.noClasses')}</p>
        )}

        {classes.length > 0 && (
          <div className="rbac-table-wrap">
            <table className="rbac-table">
              <thead>
                <tr>
                  <th>{t('instructor.table.class')}</th>
                  <th>{t('instructor.table.students')}</th>
                  <th>{t('instructor.table.paths')}</th>
                  <th>{t('instructor.table.created')}</th>
                  <th>{t('instructor.table.actions')}</th>
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
                    <td>{formatDate(item.created_at, { dateStyle: 'medium', timeStyle: 'short' }) || t('instructor.noDate')}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleLoadAnalytics(item.id)}
                        disabled={analyticsLoading && Number(selectedClassId) === Number(item.id)}
                      >
                        {analyticsLoading && Number(selectedClassId) === Number(item.id)
                          ? t('common.loading')
                          : t('instructor.viewAnalytics')}
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
          <h2>{t('instructor.analyticsOf', { name: selectedClass.name })}</h2>

          {analyticsError && <p className="rbac-error">{analyticsError}</p>}
          {analyticsLoading && <p>{t('instructor.loadingAnalytics')}</p>}

          {!analyticsLoading && analytics && (
            <>
              <div className="rbac-metric-grid">
                <article>
                  <p>{t('instructor.metric.activeStudents')}</p>
                  <strong>{Number(analytics.summary?.students_total || 0)}</strong>
                </article>
                <article>
                  <p>{t('instructor.metric.completedLessons')}</p>
                  <strong>{Number(analytics.summary?.completed_lessons_total || 0)}</strong>
                </article>
                <article>
                  <p>{t('instructor.metric.startedLessons')}</p>
                  <strong>{Number(analytics.summary?.lessons_started_total || 0)}</strong>
                </article>
                <article>
                  <p>{t('instructor.metric.avgSignal')}</p>
                  <strong>{Number(analytics.summary?.progress_signal_avg || 0)}%</strong>
                </article>
              </div>

              <div className="rbac-table-wrap">
                <table className="rbac-table">
                  <thead>
                    <tr>
                      <th>{t('instructor.table.student')}</th>
                      <th>{t('instructor.table.email')}</th>
                      <th>{t('instructor.table.completed')}</th>
                      <th>{t('instructor.table.started')}</th>
                      <th>{t('instructor.table.xp')}</th>
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
                        <td colSpan={5}>{t('instructor.noActiveStudents')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
      </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default InstructorDashboardPage
