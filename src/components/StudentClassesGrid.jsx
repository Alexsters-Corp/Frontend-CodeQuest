import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/useLanguage'
import { setSelectedLanguageId } from '../services/learningApi'

export default function StudentClassesGrid({ classes, loading }) {
  const { t } = useLanguage()
  const navigate = useNavigate()

  if (loading) {
    return <div className="loading-classes-placeholder">{t('common.loading')}</div>
  }

  if (!classes || classes.length === 0) {
    return null
  }

  const handlePathClick = (path) => {
    setSelectedLanguageId(path.language_id)
    navigate('/modules')
  }

  return (
    <section className="dashboard-languages" id="dashboard-my-classes">
      <div className="section-header">
        <h2>{t('dashboard.sidebar.myClasses')}</h2>
      </div>
      <div className="language-cards-row">
        {classes.map((cls) => (
          <div key={cls.id} className="dashboard-lang-card class-card">
            <div className="lang-open-btn">
              <span className="lang-icon">🏫</span>
              <span className="lang-name">{cls.name}</span>
              <p className="class-instructor-name">
                {t('instructor.header')}: {cls.instructor_name || t('roles.instructor')}
              </p>

              <div className="class-paths-list">
                {cls.assigned_paths?.map((path) => (
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
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
