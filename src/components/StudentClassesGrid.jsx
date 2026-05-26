import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './ui/Button'
import { useLanguage } from '../context/useLanguage'
import { listStudentClassLessons } from '../services/learningApi'

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
  const [classLessons, setClassLessons] = useState([])
  const [classLessonsLoading, setClassLessonsLoading] = useState(false)
  const [classLessonsError, setClassLessonsError] = useState('')
  const [openClassMenuId, setOpenClassMenuId] = useState(null)
  const [activePathId, setActivePathId] = useState(null)

  useEffect(() => {
    setActivePathId(null)
  }, [selectedClassId])

  useEffect(() => {
    if (!openClassMenuId) return
    const close = () => setOpenClassMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openClassMenuId])

  const normalizedClasses = useMemo(() => (Array.isArray(classes) ? classes : []), [classes])

  useEffect(() => {
    if (!focusClassId) return
    const exists = normalizedClasses.some((item) => Number(item.id) === Number(focusClassId))
    if (exists) {
      setSelectedClassId(Number(focusClassId))
    }
  }, [focusClassId, normalizedClasses])

  useEffect(() => {
    if (!selectedClassId) {
      setClassLessons([])
      setClassLessonsError('')
      return
    }

    let isCancelled = false

    async function loadClassLessons() {
      setClassLessonsLoading(true)
      setClassLessonsError('')

      try {
        const payload = await listStudentClassLessons(selectedClassId)
        if (!isCancelled) {
          setClassLessons(Array.isArray(payload?.lessons) ? payload.lessons : [])
        }
      } catch (error) {
        if (!isCancelled) {
          setClassLessons([])
          setClassLessonsError(error.message || t('dashboard.classes.lessonsLoadError'))
        }
      } finally {
        if (!isCancelled) {
          setClassLessonsLoading(false)
        }
      }
    }

    loadClassLessons()

    return () => {
      isCancelled = true
    }
  }, [selectedClassId, t])

  const handleOpenLesson = (lessonId, classId) => {
    const normalizedLessonId = Number(lessonId)
    if (!Number.isInteger(normalizedLessonId) || normalizedLessonId <= 0) {
      return
    }

    const normalizedClassId = Number(classId)
    navigate(`/lesson/${normalizedLessonId}`, {
      state: {
        classId: Number.isInteger(normalizedClassId) && normalizedClassId > 0 ? normalizedClassId : null,
        source: 'dashboard-classes',
      },
    })
  }

  const selectedClass = normalizedClasses.find((item) => Number(item.id) === Number(selectedClassId)) || null

  if (loading) {
    return <div className="loading-classes-placeholder">{t('common.loading')}</div>
  }

  return (
    <section className="dashboard-classes" id="dashboard-my-classes">
      {normalizedClasses.length === 0 ? (
        <div className="empty-state dashboard-classes-empty">
          <span className="empty-state__icon" aria-hidden="true">🏫</span>
          <h3>{t('dashboard.classes.emptyTitle')}</h3>
          <p>{t('dashboard.classes.emptyDescription')}</p>
        </div>
      ) : (
        <>
          <div className="language-cards-row">
            {normalizedClasses.map((cls) => {
              const joinedAtLabel = formatJoinedAt(cls.joined_at)
              const isSelected = Number(cls.id) === Number(selectedClassId)
              const instructorName = cls?.instructor?.name || cls.instructor_name || t('roles.instructor')
              const classProgress = Number(cls?.progress?.completion_percentage || 0)
              const avgProgress = Math.max(0, Math.min(100, Math.round(classProgress)))

              return (
                <div 
                  key={cls.id} 
                  className={`dashboard-lang-card ${isSelected ? 'active' : ''}`}
                  style={isSelected ? { borderColor: 'var(--cq-primary)', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)' } : {}}
                >
                  <button
                    type="button"
                    className="lang-menu-trigger"
                    onClick={(e) => { e.stopPropagation(); setOpenClassMenuId(openClassMenuId === cls.id ? null : cls.id) }}
                    aria-label="Opciones"
                  >
                    ⋯
                  </button>
                  {openClassMenuId === cls.id && (
                    <div className="lang-card-menu" role="menu">
                      <button 
                        type="button" 
                        className="lang-card-menu__item" 
                        onClick={(e) => { e.stopPropagation(); setSelectedClassId(Number(cls.id)) }}
                      >
                        📊 {t('dashboard.classes.viewMyClass')}
                      </button>
                    </div>
                  )}

                  <button
                    className="lang-open-btn"
                    onClick={() => setSelectedClassId(Number(cls.id))}
                    type="button"
                  >
                    <span className="lang-icon" style={{ fontSize: '2rem' }}>🏫</span>
                    <strong className="lang-name" style={{ fontSize: '0.9rem', marginBottom: '4px' }}>{cls.name}</strong>
                    
                    <p className="rbac-muted" style={{ fontSize: '0.7rem', margin: '0 0 2px' }}>
                      {t('instructor.header')}: {instructorName}
                    </p>
                    <p className="rbac-muted" style={{ fontSize: '0.65rem', margin: '0' }}>
                      {t('dashboard.classes.joinedAt')}: {joinedAtLabel || '--'}
                    </p>

                    <div style={{ width: '100%', marginTop: 'auto', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="lang-progress-text" style={{ fontSize: '0.7rem', fontWeight: '600' }}>{avgProgress}%</span>
                      </div>
                      <div className="lang-progress-bar" style={{ height: '4px' }}>
                        <div
                          className="lang-progress-fill"
                          style={{ width: `${avgProgress}%` }}
                        />
                      </div>
                    </div>
                  </button>
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
                  {selectedClass.assigned_paths.map((path) => {
                    const isPathActive = Number(activePathId) === Number(path.id)
                    return (
                      <div 
                        key={path.id} 
                        className={`class-path-item ${isPathActive ? 'active' : ''}`}
                        onClick={() => setActivePathId(isPathActive ? null : path.id)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      >
                        <div className="class-path-info">
                          <span className="path-name" style={isPathActive ? { fontWeight: 'bold', color: 'var(--cq-primary)' } : {}}>{path.name}</span>
                          <span className="path-progress-percent">{path.progress?.completion_percentage || 0}%</span>
                        </div>
                        <div className="lang-progress-bar">
                          <div
                            className="lang-progress-fill"
                            style={{ width: `${path.progress?.completion_percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="rbac-muted">{t('dashboard.classes.noAssignedPaths')}</p>
              )}

              <div className="dashboard-class-lessons">
                <div className="section-header section-header--compact">
                  <h3>{t('dashboard.classes.publishedContentTitle')}</h3>
                  {activePathId && (
                    <Button
                      variant="slate"
                      size="sm"
                      compact
                      onClick={() => setActivePathId(null)}
                    >
                      {t('common.showAll') || 'Ver todo'}
                    </Button>
                  )}
                </div>

                {classLessonsLoading ? (
                  <p className="rbac-muted">{t('common.loading')}</p>
                ) : classLessonsError ? (
                  <p className="rbac-error">{classLessonsError}</p>
                ) : (classLessons.filter((lesson) => {
                  const lessonPathId = Number(lesson?.learning_path?.id || lesson?.learning_path_id || 0)
                  return !activePathId || lessonPathId === Number(activePathId)
                })).length === 0 ? (
                  <p className="rbac-muted">{t('dashboard.classes.noPublishedContent')}</p>
                ) : (
                  <div className="class-lessons-list">
                    {classLessons
                      .filter((lesson) => {
                        const lessonPathId = Number(lesson?.learning_path?.id || lesson?.learning_path_id || 0)
                        return !activePathId || lessonPathId === Number(activePathId)
                      })
                      .map((lesson) => (
                        <div key={lesson.id} className="class-lesson-item">
                          <div className="class-lesson-item__info">
                            <p className="class-lesson-item__title">{lesson.title}</p>
                            <p className="class-lesson-item__meta">
                              {lesson.learning_path?.name || t('modules.title')}
                              {lesson.is_ai_assisted ? ` · ${t('modules.aiAssisted')}` : ''}
                            </p>
                          </div>
                          <Button
                            variant="blue"
                            size="sm"
                            onClick={() => handleOpenLesson(lesson.id, selectedClass?.id)}
                          >
                            {t('favorites.openLesson')}
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </article>
          ) : null}
        </>
      )}
    </section>
  )
}
