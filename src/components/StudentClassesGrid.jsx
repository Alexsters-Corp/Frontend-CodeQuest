import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/useLanguage'
import { setSelectedLanguageId } from '../services/learningApi'

function formatJoinedAt(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString()
}

export default function StudentClassesGrid({ classes, loading, focusClassId = null }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [selectedClassId, setSelectedClassId] = useState(null)

  const normalizedClasses = useMemo(() => (Array.isArray(classes) ? classes : []), [classes])

  useEffect(() => {
    if (!focusClassId) return
    const exists = normalizedClasses.some((item) => Number(item.id) === Number(focusClassId))
    if (exists) {
      setSelectedClassId(Number(focusClassId))
    }
  }, [focusClassId, normalizedClasses])

  if (loading) {
    return <div className="loading-classes-placeholder">{t('common.loading')}</div>
  }

  const handlePathClick = (path) => {
    setSelectedLanguageId(path.language_id)
    navigate('/modules')
  }

  const selectedClass = normalizedClasses.find((item) => Number(item.id) === Number(selectedClassId)) || null

  return (
    <section className="dashboard-classes" id="dashboard-my-classes">
      <div className="section-header">
        <h2>{t('dashboard.sidebar.myClasses')}</h2>
      </div>
      {normalizedClasses.length === 0 ? (
        <div className="empty-state dashboard-classes-empty">
          <span className="empty-state__icon" aria-hidden="true">🏫</span>
          <h3>{t('dashboard.classes.emptyTitle')}</h3>
          <p>{t('dashboard.classes.emptyDescription')}</p>
        </div>
      ) : (
        <>
          <div className="classes-cards-row">
            {normalizedClasses.map((cls) => {
              const joinedAtLabel = formatJoinedAt(cls.joined_at)
              const isSelected = Number(cls.id) === Number(selectedClassId)
              const instructorName = cls?.instructor?.name || cls.instructor_name || t('roles.instructor')

              return (
                <div key={cls.id} className={`dashboard-lang-card class-card${isSelected ? ' class-card--selected' : ''}`}>
                  <div className="lang-open-btn">
                    <span className="lang-icon">🏫</span>
                    <span className="lang-name">{cls.name}</span>
                    <p className="class-instructor-name">
                      {t('instructor.header')}: {instructorName}
                    </p>
                    <p className="class-instructor-name">
                      {t('dashboard.classes.joinedAt')}: {joinedAtLabel || '--'}
                    </p>
                    <p className="class-instructor-name">
                      {t('dashboard.classes.status')}: {t('dashboard.classes.status.active')}
                    </p>

                    <button
                      type="button"
                      className="class-path-action-btn"
                      onClick={() => setSelectedClassId(Number(cls.id))}
                    >
                      {t('dashboard.classes.viewMyClass')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {selectedClass ? (
            <article className="dashboard-classes-detail">
              <div className="section-header">
                <h3>{t('dashboard.classes.detailTitle', { name: selectedClass.name })}</h3>
              </div>

              {selectedClass.assigned_paths?.length ? (
                <div className="class-paths-list">
                  {selectedClass.assigned_paths.map((path) => (
                    <div key={path.id} className="class-path-item">
                      <div className="class-path-info">
                        <span className="path-name">{path.name}</span>
                        <span className="path-progress-percent">{path.progress?.completion_percentage || 0}%</span>
                      </div>
                      <div className="lang-progress-bar">
                        <div
                          className="lang-progress-fill"
                          style={{ width: `${path.progress?.completion_percentage || 0}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        className="class-path-action-btn"
                        onClick={() => handlePathClick(path)}
                      >
                        {t('dashboard.continue')}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rbac-muted">{t('dashboard.classes.noAssignedPaths')}</p>
              )}
            </article>
          ) : null}
        </>
      )}
    </section>
  )
}
