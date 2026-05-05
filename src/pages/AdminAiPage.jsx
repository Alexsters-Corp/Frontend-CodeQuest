import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useLanguage } from '../context/useLanguage'
import { generateExercise, generateLesson, validateContent } from '../services/aiAdminApi'
import { notifyError, notifySuccess } from '../utils/notify'

function formatJson(payload) {
  if (!payload) {
    return ''
  }

  return JSON.stringify(payload, null, 2)
}

function AdminAiPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [lessonForm, setLessonForm] = useState({
    topic: '',
    language: '',
    level: 'beginner',
  })
  const [lessonLoading, setLessonLoading] = useState(false)
  const [lessonError, setLessonError] = useState('')
  const [lessonResult, setLessonResult] = useState(null)

  const [exerciseForm, setExerciseForm] = useState({
    concept: '',
    difficulty: 'easy',
    languageId: '',
  })
  const [exerciseLoading, setExerciseLoading] = useState(false)
  const [exerciseError, setExerciseError] = useState('')
  const [exerciseResult, setExerciseResult] = useState(null)

  const [validationForm, setValidationForm] = useState({ content: '' })
  const [validationLoading, setValidationLoading] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [validationResult, setValidationResult] = useState(null)

  async function handleLessonSubmit(event) {
    event.preventDefault()
    setLessonLoading(true)
    setLessonError('')
    try {
      const payload = await generateLesson(lessonForm)
      setLessonResult(payload)
      notifySuccess(t('admin.ai.success.lesson'))
    } catch (error) {
      const message = error.message || t('admin.ai.error.lesson')
      setLessonError(message)
      notifyError(message)
    } finally {
      setLessonLoading(false)
    }
  }

  async function handleExerciseSubmit(event) {
    event.preventDefault()
    setExerciseLoading(true)
    setExerciseError('')
    try {
      const payload = await generateExercise({
        ...exerciseForm,
        languageId: exerciseForm.languageId,
      })
      setExerciseResult(payload)
      notifySuccess(t('admin.ai.success.exercise'))
    } catch (error) {
      const message = error.message || t('admin.ai.error.exercise')
      setExerciseError(message)
      notifyError(message)
    } finally {
      setExerciseLoading(false)
    }
  }

  async function handleValidationSubmit(event) {
    event.preventDefault()
    setValidationLoading(true)
    setValidationError('')
    try {
      const payload = await validateContent(validationForm)
      setValidationResult(payload)
      notifySuccess(t('admin.ai.success.validate'))
    } catch (error) {
      const message = error.message || t('admin.ai.error.validate')
      setValidationError(message)
      notifyError(message)
    } finally {
      setValidationLoading(false)
    }
  }

  return (
    <MotionPage className="dashboard-page" delay={0.06}>
      <Sidebar />
      <Navbar title={t('admin.ai.title')} hideActions />

      <section className="rbac-page ai-admin-page">
        <div className="rbac-header">
          <div>
            <p className="rbac-kicker">{t('route.rolePanel')}</p>
            <h1>{t('admin.ai.header')}</h1>
            <p className="rbac-subtitle">{t('admin.ai.subtitle')}</p>
          </div>
          <div className="rbac-actions-inline">
            <button type="button" onClick={() => navigate('/admin')}>
              {t('admin.ai.backAdmin')}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')}>
              {t('admin.backDashboard')}
            </button>
          </div>
        </div>

        <div className="ai-admin-grid">
          <section className="rbac-card">
            <div className="rbac-section-head">
              <h2>{t('admin.ai.lesson.title')}</h2>
            </div>
            <p className="rbac-muted">{t('admin.ai.lesson.hint')}</p>

            <form className="ai-admin-form" onSubmit={handleLessonSubmit}>
              <label htmlFor="ai-topic">{t('admin.ai.field.topic')}</label>
              <input
                id="ai-topic"
                type="text"
                value={lessonForm.topic}
                onChange={(event) => setLessonForm((previous) => ({
                  ...previous,
                  topic: event.target.value,
                }))}
                placeholder={t('admin.ai.placeholder.topic')}
              />

              <label htmlFor="ai-language">{t('admin.ai.field.language')}</label>
              <input
                id="ai-language"
                type="text"
                value={lessonForm.language}
                onChange={(event) => setLessonForm((previous) => ({
                  ...previous,
                  language: event.target.value,
                }))}
                placeholder={t('admin.ai.placeholder.language')}
              />

              <label htmlFor="ai-level">{t('admin.ai.field.level')}</label>
              <select
                id="ai-level"
                value={lessonForm.level}
                onChange={(event) => setLessonForm((previous) => ({
                  ...previous,
                  level: event.target.value,
                }))}
              >
                <option value="beginner">{t('admin.ai.level.beginner')}</option>
                <option value="intermediate">{t('admin.ai.level.intermediate')}</option>
                <option value="advanced">{t('admin.ai.level.advanced')}</option>
              </select>

              <div className="ai-admin-actions">
                <button type="submit" disabled={lessonLoading}>
                  {lessonLoading ? t('admin.ai.loading') : t('admin.ai.action.generateLesson')}
                </button>
              </div>
            </form>

            {lessonError && <p className="ai-admin-error">{lessonError}</p>}
            <pre className="ai-admin-response">{lessonResult ? formatJson(lessonResult) : t('admin.ai.empty')}</pre>
          </section>

          <section className="rbac-card">
            <div className="rbac-section-head">
              <h2>{t('admin.ai.exercise.title')}</h2>
            </div>
            <p className="rbac-muted">{t('admin.ai.exercise.hint')}</p>

            <form className="ai-admin-form" onSubmit={handleExerciseSubmit}>
              <label htmlFor="ai-concept">{t('admin.ai.field.concept')}</label>
              <input
                id="ai-concept"
                type="text"
                value={exerciseForm.concept}
                onChange={(event) => setExerciseForm((previous) => ({
                  ...previous,
                  concept: event.target.value,
                }))}
                placeholder={t('admin.ai.placeholder.concept')}
              />

              <label htmlFor="ai-difficulty">{t('admin.ai.field.difficulty')}</label>
              <select
                id="ai-difficulty"
                value={exerciseForm.difficulty}
                onChange={(event) => setExerciseForm((previous) => ({
                  ...previous,
                  difficulty: event.target.value,
                }))}
              >
                <option value="easy">{t('admin.ai.difficulty.easy')}</option>
                <option value="medium">{t('admin.ai.difficulty.medium')}</option>
                <option value="hard">{t('admin.ai.difficulty.hard')}</option>
              </select>

              <label htmlFor="ai-language-id">{t('admin.ai.field.languageId')}</label>
              <input
                id="ai-language-id"
                type="number"
                min="1"
                value={exerciseForm.languageId}
                onChange={(event) => setExerciseForm((previous) => ({
                  ...previous,
                  languageId: event.target.value,
                }))}
                placeholder={t('admin.ai.placeholder.languageId')}
              />

              <div className="ai-admin-actions">
                <button type="submit" disabled={exerciseLoading}>
                  {exerciseLoading ? t('admin.ai.loading') : t('admin.ai.action.generateExercise')}
                </button>
              </div>
            </form>

            {exerciseError && <p className="ai-admin-error">{exerciseError}</p>}
            <pre className="ai-admin-response">{exerciseResult ? formatJson(exerciseResult) : t('admin.ai.empty')}</pre>
          </section>

          <section className="rbac-card ai-admin-card--full">
            <div className="rbac-section-head">
              <h2>{t('admin.ai.validate.title')}</h2>
            </div>
            <p className="rbac-muted">{t('admin.ai.validate.hint')}</p>

            <form className="ai-admin-form" onSubmit={handleValidationSubmit}>
              <label htmlFor="ai-content">{t('admin.ai.field.content')}</label>
              <textarea
                id="ai-content"
                rows={6}
                value={validationForm.content}
                onChange={(event) => setValidationForm({ content: event.target.value })}
                placeholder={t('admin.ai.placeholder.content')}
              />

              <div className="ai-admin-actions">
                <button type="submit" disabled={validationLoading}>
                  {validationLoading ? t('admin.ai.loading') : t('admin.ai.action.validate')}
                </button>
              </div>
            </form>

            {validationError && <p className="ai-admin-error">{validationError}</p>}
            <pre className="ai-admin-response">{validationResult ? formatJson(validationResult) : t('admin.ai.empty')}</pre>
          </section>
        </div>
      </section>
    </MotionPage>
  )
}

export default AdminAiPage
