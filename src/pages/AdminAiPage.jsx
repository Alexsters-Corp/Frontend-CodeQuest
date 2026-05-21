import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IoMdHelpCircleOutline } from 'react-icons/io'
import CodeViewer from '../components/CodeViewer'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { generateExercise, generateLesson, listPublishTargets, publishContent, validateContent } from '../services/aiAdminApi'
import { notifyError, notifySuccess } from '../utils/notify'

const MotionArticle = motion.article
const MotionDiv = motion.div
const AI_MODEL_LABEL = 'llama-3.3-70b-versatile'
const RECOMMENDED_MODEL = 'llama-3.3-70b-versatile'

const CONTENT_MODEL_OPTIONS = Object.freeze([
  {
    id: 'llama-3.3-70b-versatile',
    labelKey: 'admin.ai.model.llama33',
  },
  {
    id: 'llama-4-scout',
    labelKey: 'admin.ai.model.llama4Scout',
  },
  {
    id: 'qwen-qwq-32b',
    labelKey: 'admin.ai.model.qwen',
  },
])

const JUDGE0_LANGUAGE_OPTIONS = Object.freeze([
  { id: 63, labelKey: 'admin.ai.language.javascript', monaco: 'javascript', icon: '🟨' },
  { id: 71, labelKey: 'admin.ai.language.python3', monaco: 'python', icon: '🐍' },
  { id: 62, labelKey: 'admin.ai.language.java', monaco: 'java', icon: '☕' },
  { id: 54, labelKey: 'admin.ai.language.cpp', monaco: 'cpp', icon: '⚙️' },
  { id: 51, labelKey: 'admin.ai.language.csharp', monaco: 'csharp', icon: '🟦' },
  { id: 60, labelKey: 'admin.ai.language.go', monaco: 'go', icon: '🐹' },
  { id: 72, labelKey: 'admin.ai.language.ruby', monaco: 'ruby', icon: '💎' },
])

const GUIDE_TYPES = Object.freeze({
  lesson: 'lesson',
  exercise: 'exercise',
  validator: 'validator',
})

const AUTO_CREATE_TARGET = 'auto'

const APP_LEVEL_TO_PATH_LEVEL = Object.freeze({
  beginner: 'principiante',
  intermediate: 'intermedio',
  advanced: 'avanzado',
})

function formatJson(payload) {
  if (!payload) {
    return ''
  }

  return JSON.stringify(payload, null, 2)
}

function useDelayedVisible(active, delayMs = 2000) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) {
      return undefined
    }

    const resetTimer = window.setTimeout(() => setVisible(false), 0)
    const showTimer = window.setTimeout(() => setVisible(true), delayMs)

    return () => {
      window.clearTimeout(resetTimer)
      window.clearTimeout(showTimer)
    }
  }, [active, delayMs])

  return active && visible
}

function monacoFromJudge0Id(languageId) {
  return JUDGE0_LANGUAGE_OPTIONS.find((option) => option.id === Number(languageId))?.monaco || 'plaintext'
}

function getLanguageLabel(languageId, t) {
  const option = JUDGE0_LANGUAGE_OPTIONS.find((item) => item.id === Number(languageId))
  return option ? `${option.id} — ${t(option.labelKey)}` : String(languageId || '')
}

function normalizeDifficultyLevel(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'easy') {
    return 'beginner'
  }

  if (normalized === 'medium') {
    return 'intermediate'
  }

  if (normalized === 'hard') {
    return 'advanced'
  }

  return ['beginner', 'intermediate', 'advanced'].includes(normalized) ? normalized : 'beginner'
}

function normalizeScore(value) {
  const rawValue = value && typeof value === 'object'
    ? value.score ?? value.qualityScore ?? value.value
    : value
  const numeric = Number(rawValue)
  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.max(0, Math.min(100, numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric)))
}

function scoreTone(score) {
  if (score < 60) {
    return 'danger'
  }

  if (score < 80) {
    return 'warning'
  }

  return 'success'
}

function getTargetPathsForLanguage(targets, languageId) {
  const target = targets.find((item) => Number(item.judge0LanguageId) === Number(languageId))
  return target?.paths || []
}

function normalizePublishTargetId(value) {
  if (value === AUTO_CREATE_TARGET) return null
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

function getPathLevelForLesson(level) {
  return APP_LEVEL_TO_PATH_LEVEL[normalizeDifficultyLevel(level)] || 'principiante'
}

function GeneratedContentCard({
  type,
  result,
  title,
  difficulty,
  languageLabel,
  monacoLanguage,
  model,
  onSendToValidator,
  onDiscard,
  t,
}) {
  if (!result) {
    return <p className="ai-admin-empty">{t('admin.ai.empty')}</p>
  }

  const isLesson = type === 'lesson'
  const normalizedDifficulty = normalizeDifficultyLevel(difficulty)
  const exercise = isLesson ? (result.exercise || {}) : result
  const theoryParagraphs = String(result.theory || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const testCases = Array.isArray(exercise.testCases) ? exercise.testCases : []

  return (
    <MotionArticle
      className="ai-result-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <header className="ai-result-card__header">
        <span className="ai-model-badge">
          {t('admin.ai.generatedBy')} · {result.modelUsed || result.ai_model_used || model || AI_MODEL_LABEL}
        </span>
        <h2>{title}</h2>
        <span className={`ai-level-badge ai-level-badge--${normalizedDifficulty}`}>
          {t(`admin.ai.level.${normalizedDifficulty}`)}
        </span>
        {languageLabel && <span className="ai-language-badge">{languageLabel}</span>}
      </header>

      {isLesson && (
        <>
          <section className="ai-result-section">
            <h3>{t('admin.ai.output.theory')}</h3>
            {theoryParagraphs.length > 0 ? (
              theoryParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            ) : (
              <p>{t('admin.ai.output.noTheory')}</p>
            )}
          </section>

          <section className="ai-result-section">
            <h3>{t('admin.ai.output.codeExample')}</h3>
            <CodeViewer code={result.codeExample || ''} language={monacoLanguage} />
          </section>
        </>
      )}

      <section className="ai-result-section">
        <h3>{isLesson ? t('admin.ai.output.exercise') : t('admin.ai.output.description')}</h3>
        <p>{exercise.prompt || t('admin.ai.output.noExercise')}</p>
      </section>

      <section className="ai-result-section">
        <h3>{t('admin.ai.output.starterCode')}</h3>
        <CodeViewer code={exercise.starterCode || ''} language={monacoLanguage} />
      </section>

      {!isLesson && (
        <section className="ai-result-section">
          <h3>{t('admin.ai.output.testCases')}</h3>
          {testCases.length > 0 ? (
            <ul className="ai-testcase-list">
              {testCases.map((testCase, index) => (
                <li key={`${index}-${formatJson(testCase)}`}>
                  <span>{t('admin.ai.output.input')}</span>
                  <code>{formatJson(testCase.input)}</code>
                  <span>{t('admin.ai.output.expectedOutput')}</span>
                  <code>{formatJson(testCase.expectedOutput)}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t('admin.ai.output.noTestCases')}</p>
          )}
        </section>
      )}

      <div className="ai-result-actions">
        <button type="button" onClick={() => onSendToValidator(result)}>
          {t('admin.ai.action.sendToValidator')}
        </button>
        <button type="button" className="ai-secondary-btn" onClick={onDiscard}>
          {t('admin.ai.action.discard')}
        </button>
      </div>
    </MotionArticle>
  )
}

function LessonResultSkeleton({ t }) {
  return (
    <div className="ai-result-card ai-result-card--skeleton" aria-label={t('admin.ai.output.loadingPreview')}>
      <div className="ai-skeleton-line ai-skeleton-line--badge" />
      <div className="ai-skeleton-line ai-skeleton-line--title" />
      <div className="ai-skeleton-line ai-skeleton-line--short" />
      <div className="ai-skeleton-block" />
      <div className="ai-skeleton-code" />
      <div className="ai-skeleton-block" />
    </div>
  )
}

function ModelSelect({ id, value, onChange, t }) {
  return (
    <select id={id} value={value} onChange={onChange} className="ai-rich-select">
      {CONTENT_MODEL_OPTIONS.map((option) => (
        <option key={option.id} value={option.id}>
          {t(option.labelKey)} — {option.id}
        </option>
      ))}
    </select>
  )
}

function GuideButton({ type, onOpen, t }) {
  return (
    <button type="button" className="ai-guide-btn" onClick={() => onOpen(type)}>
      <IoMdHelpCircleOutline aria-hidden="true" />
      {t('admin.ai.guide.button')}
    </button>
  )
}

function GuideModal({ type, onClose, t }) {
  useEffect(() => {
    if (!type) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [type, onClose])

  if (!type) {
    return null
  }

  const items = t(`admin.ai.guide.${type}.items`)

  return (
    <MotionDiv
      className="ai-guide-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-guide-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onMouseDown={onClose}
    >
      <MotionDiv
        className="ai-guide-modal__panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="ai-guide-title">{t(`admin.ai.guide.${type}.title`)}</h2>
          <button type="button" className="ai-guide-modal__close" onClick={onClose}>
            {t('admin.ai.guide.close')}
          </button>
        </header>
        <ol>
          {(Array.isArray(items) ? items : []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </MotionDiv>
    </MotionDiv>
  )
}

function ValidationResultCard({
  result,
  onEdit,
  onPublish,
  publishing,
  publishBlockedReason,
  publishStatus,
  t,
}) {
  if (!result) {
    return <p className="ai-admin-empty">{t('admin.ai.empty')}</p>
  }

  const score = normalizeScore(result.qualityScore)
  const tone = scoreTone(score)
  const issues = Array.isArray(result.issues) ? result.issues : []
  const dimensions = result.dimensions && typeof result.dimensions === 'object'
    ? Object.entries(result.dimensions)
    : []

  return (
    <MotionArticle
      className="ai-validation-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="ai-validation-score">
        <div>
          <span>{t('admin.ai.validation.score')}</span>
          <strong>{score}%</strong>
        </div>
        <div className="ai-progress-track">
          <span className={`ai-progress-fill ai-progress-fill--${tone}`} style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className={`ai-validation-state ${result.approved ? 'is-approved' : 'is-rejected'}`}>
        {result.approved ? t('admin.ai.validation.approved') : t('admin.ai.validation.rejected')}
      </div>

      {dimensions.length > 0 && (
        <section className="ai-validation-section">
          <h3>{t('admin.ai.validation.dimensions')}</h3>
          <ul className="ai-validation-dimensions">
            {dimensions.map(([name, value]) => {
              const dimensionScore = normalizeScore(value)
              return (
                <li key={name}>
                  <span>{dimensionScore >= 80 ? '✅' : dimensionScore >= 60 ? '⚠️' : '❌'} {name}</span>
                  <strong>{dimensionScore}%</strong>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="ai-validation-section">
        <h3>{t('admin.ai.validation.observations')}</h3>
        {issues.length > 0 ? (
          <ul>
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        ) : (
          <p>{t('admin.ai.validation.noIssues')}</p>
        )}
      </section>

      <footer className="ai-validation-footer">
        <span>{t('admin.ai.validation.validatedBy')} · {result.modelUsed || result.ai_model_used || AI_MODEL_LABEL}</span>
        <div className="ai-result-actions">
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            className={publishBlockedReason ? 'ai-publish-btn--blocked' : ''}
            title={publishBlockedReason || ''}
          >
            {publishing ? t('admin.ai.publish.publishing') : t('admin.ai.action.publish')}
          </button>
          <button type="button" className="ai-secondary-btn" onClick={onEdit}>
            {t('admin.ai.action.edit')}
          </button>
        </div>
      </footer>
      {publishBlockedReason && (
        <p className="ai-publish-blocked-reason">{publishBlockedReason}</p>
      )}
      {publishStatus && (
        <p className={`ai-publish-status ai-publish-status--${publishStatus.type}`}>
          {publishStatus.message}
        </p>
      )}
    </MotionArticle>
  )
}

function AdminAiPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const validatorRef = useRef(null)
  const validationInputRef = useRef(null)
  const [activeGuide, setActiveGuide] = useState(null)

  const [lessonForm, setLessonForm] = useState({
    topic: '',
    languageId: '63',
    level: 'beginner',
    model: RECOMMENDED_MODEL,
    publishTargetPathId: '',
  })
  const [lessonLoading, setLessonLoading] = useState(false)
  const [lessonError, setLessonError] = useState('')
  const [lessonResult, setLessonResult] = useState(null)
  const showLessonSkeleton = useDelayedVisible(lessonLoading)

  const [exerciseForm, setExerciseForm] = useState({
    concept: '',
    difficulty: 'medium',
    languageId: '63',
    model: RECOMMENDED_MODEL,
    publishTargetPathId: '',
  })
  const [exerciseLoading, setExerciseLoading] = useState(false)
  const [exerciseError, setExerciseError] = useState('')
  const [exerciseResult, setExerciseResult] = useState(null)
  const showExerciseSkeleton = useDelayedVisible(exerciseLoading)

  const [validationForm, setValidationForm] = useState({ content: '' })
  const [validationSource, setValidationSource] = useState('manual')
  const [validationContext, setValidationContext] = useState(null)
  const [publishTargets, setPublishTargets] = useState([])
  const [publishTargetsLoading, setPublishTargetsLoading] = useState(false)
  const [validationLoading, setValidationLoading] = useState(false)
  const [publishingContent, setPublishingContent] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [publishStatus, setPublishStatus] = useState(null)
  const [validationResult, setValidationResult] = useState(null)

  const lessonTargetPaths = useMemo(
    () => getTargetPathsForLanguage(publishTargets, lessonForm.languageId),
    [lessonForm.languageId, publishTargets]
  )

  const exerciseTargetPaths = useMemo(
    () => getTargetPathsForLanguage(publishTargets, exerciseForm.languageId),
    [exerciseForm.languageId, publishTargets]
  )

  const loadPublishTargets = useCallback(async () => {
    setPublishTargetsLoading(true)
    try {
      const payload = await listPublishTargets()
      setPublishTargets(Array.isArray(payload.languages) ? payload.languages : [])
    } catch (error) {
      notifyError(error.message || t('admin.ai.publish.targetsError'))
    } finally {
      setPublishTargetsLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadPublishTargets()
  }, [loadPublishTargets])

  async function handleLessonSubmit(event) {
    event.preventDefault()
    
    // Validación
    if (!lessonForm.topic.trim()) {
      notifyError(t('admin.ai.error.topicRequired'))
      return
    }
    if (!lessonForm.languageId) {
      notifyError(t('admin.ai.error.languageRequired'))
      return
    }
    if (!lessonForm.level) {
      notifyError(t('admin.ai.error.levelRequired'))
      return
    }
    if (!lessonForm.publishTargetPathId) {
      notifyError(t('admin.ai.publish.targetRequired'))
      return
    }
    
    setLessonLoading(true)
    setLessonError('')
    setLessonResult(null)
    try {
      const payload = await generateLesson(lessonForm)
      setLessonResult(payload)
      setValidationResult(null)
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
    
    // Validación
    if (!exerciseForm.concept.trim()) {
      notifyError(t('admin.ai.error.conceptRequired'))
      return
    }
    if (!exerciseForm.languageId) {
      notifyError(t('admin.ai.error.languageRequired'))
      return
    }
    if (!exerciseForm.difficulty) {
      notifyError(t('admin.ai.error.difficultyRequired'))
      return
    }
    if (!exerciseForm.publishTargetPathId) {
      notifyError(t('admin.ai.publish.targetRequired'))
      return
    }
    
    setExerciseLoading(true)
    setExerciseError('')
    setExerciseResult(null)
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
    
    // Validación
    if (!validationForm.content.trim()) {
      notifyError(t('admin.ai.error.contentRequired'))
      return
    }
    
    setValidationLoading(true)
    setValidationError('')
    setValidationResult(null)
    setPublishStatus(null)
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

  async function handlePublishValidatedContent() {
    if (publishBlockedReason) {
      setPublishStatus({ type: 'error', message: publishBlockedReason })
      notifyError(publishBlockedReason)
      return
    }

    setPublishingContent(true)
    setPublishStatus({ type: 'info', message: t('admin.ai.publish.inProgress') })
    try {
      const payload = await publishContent({
        content: validationForm.content,
        languageId: validationContext.languageId,
        level: validationContext.level,
        validation: validationResult,
        learningPathId: validationContext.learningPathId,
      })

      setPublishStatus({
        type: 'success',
        message: t('admin.ai.publish.inlineSuccess', {
          id: payload.lesson?.id || payload.lessonId || '',
          path: payload.learningPathName || '',
          position: payload.orderPosition || '',
        }),
      })
      notifySuccess(t('admin.ai.publish.success'))
      setValidationResult(null)
      setValidationForm({ content: '' })
      setValidationSource('manual')
      setValidationContext(null)
      setLessonResult(null)
      setExerciseResult(null)
      await loadPublishTargets()
    } catch (error) {
      const message = error.message || t('admin.ai.publish.error')
      setPublishStatus({ type: 'error', message })
      notifyError(message)
    } finally {
      setPublishingContent(false)
    }
  }

  const validationScore = normalizeScore(validationResult?.qualityScore)
  const publishBlockedReason = useMemo(() => {
    if (!validationResult) return ''
    if (!validationContext || !['lesson', 'exercise'].includes(validationContext.type)) return t('admin.ai.publish.generatedOnly')
    if (!validationContext.learningPathId && validationContext.publishTargetMode !== AUTO_CREATE_TARGET) {
      return t('admin.ai.publish.targetRequired')
    }
    if (!validationResult.approved || validationScore < 80) return t('admin.ai.validation.publishDisabled')
    return ''
  }, [t, validationContext, validationResult, validationScore])

  function sendLessonToValidator(payload) {
    setValidationForm({ content: formatJson(payload) })
    setValidationSource('generated')
    setValidationContext({
      type: 'lesson',
      languageId: lessonForm.languageId,
      level: lessonForm.level,
      learningPathId: normalizePublishTargetId(lessonForm.publishTargetPathId),
      publishTargetMode: lessonForm.publishTargetPathId,
    })
    setValidationError('')
    setValidationResult(null)
    setPublishStatus(null)
    notifySuccess(t('admin.ai.sentToValidator'), { duration: 2000 })
    window.setTimeout(() => {
      validatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function sendExerciseToValidator(payload) {
    setValidationForm({ content: formatJson(payload) })
    setValidationSource('generated')
    setValidationContext({
      type: 'exercise',
      languageId: exerciseForm.languageId,
      level: normalizeDifficultyLevel(exerciseForm.difficulty),
      learningPathId: normalizePublishTargetId(exerciseForm.publishTargetPathId),
      publishTargetMode: exerciseForm.publishTargetPathId,
    })
    setValidationError('')
    setValidationResult(null)
    setPublishStatus(null)
    notifySuccess(t('admin.ai.sentToValidator'), { duration: 2000 })
    window.setTimeout(() => {
      validatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function handleValidationContentChange(event) {
    setValidationForm({ content: event.target.value })
    setValidationSource('manual')
    setValidationContext(null)
    setPublishStatus(null)
  }

  function focusValidationEditor() {
    validationInputRef.current?.focus()
  }

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
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
          </div>
        </div>

        <div className="ai-admin-grid">
          <section className="rbac-card">
            <div className="rbac-section-head">
              <h2>{t('admin.ai.lesson.title')}</h2>
              <GuideButton type={GUIDE_TYPES.lesson} onOpen={setActiveGuide} t={t} />
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
              <select
                id="ai-language"
                value={lessonForm.languageId}
                onChange={(event) => setLessonForm((previous) => ({
                  ...previous,
                  languageId: event.target.value,
                  publishTargetPathId: '',
                }))}
              >
                {JUDGE0_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.icon} {t(option.labelKey)}
                  </option>
                ))}
              </select>

              <label htmlFor="ai-level">{t('admin.ai.field.level')}</label>
              <select
                id="ai-level"
                value={lessonForm.level}
                onChange={(event) => setLessonForm((previous) => ({
                  ...previous,
                  level: event.target.value,
                  publishTargetPathId: '',
                }))}
              >
                <option value="beginner">{t('admin.ai.level.beginner')}</option>
                <option value="intermediate">{t('admin.ai.level.intermediate')}</option>
                <option value="advanced">{t('admin.ai.level.advanced')}</option>
              </select>

              <label htmlFor="ai-lesson-target">{t('admin.ai.field.publishTarget')}</label>
              <select
                id="ai-lesson-target"
                value={lessonForm.publishTargetPathId}
                onChange={(event) => setLessonForm((previous) => ({
                  ...previous,
                  publishTargetPathId: event.target.value,
                }))}
                disabled={publishTargetsLoading}
              >
                <option value="">{publishTargetsLoading ? t('admin.ai.publish.loadingTargets') : t('admin.ai.publish.selectTarget')}</option>
                {lessonTargetPaths.map((path) => (
                  <option key={path.id} value={path.id}>
                    {path.name} - {path.difficultyLevel}
                  </option>
                ))}
                <option value={AUTO_CREATE_TARGET}>
                  {t('admin.ai.publish.autoTarget', { level: getPathLevelForLesson(lessonForm.level) })}
                </option>
              </select>

              <label htmlFor="ai-lesson-model">{t('admin.ai.field.model')}</label>
              <ModelSelect
                id="ai-lesson-model"
                value={lessonForm.model}
                onChange={(event) => setLessonForm((previous) => ({
                  ...previous,
                  model: event.target.value,
                }))}
                t={t}
              />

              <div className="ai-admin-actions">
                <button type="submit" disabled={lessonLoading}>
                  {lessonLoading ? t('admin.ai.loading') : t('admin.ai.action.generateLesson')}
                </button>
              </div>
            </form>

            {lessonError && <p className="ai-admin-error">{lessonError}</p>}
            {showLessonSkeleton ? (
              <LessonResultSkeleton t={t} />
            ) : (
              <GeneratedContentCard
                type="lesson"
                result={lessonResult}
                title={lessonResult?.title || t('admin.ai.lesson.untitled')}
                difficulty={lessonForm.level}
                languageLabel={getLanguageLabel(lessonForm.languageId, t)}
                monacoLanguage={monacoFromJudge0Id(lessonForm.languageId)}
                model={lessonForm.model}
                onSendToValidator={sendLessonToValidator}
                onDiscard={() => setLessonResult(null)}
                t={t}
              />
            )}
          </section>

          <section className="rbac-card">
            <div className="rbac-section-head">
              <h2>{t('admin.ai.exercise.title')}</h2>
              <GuideButton type={GUIDE_TYPES.exercise} onOpen={setActiveGuide} t={t} />
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
                  publishTargetPathId: '',
                }))}
              >
                <option value="easy">{t('admin.ai.difficulty.easy')}</option>
                <option value="medium">{t('admin.ai.difficulty.medium')}</option>
                <option value="hard">{t('admin.ai.difficulty.hard')}</option>
              </select>

              <label htmlFor="ai-language-id">{t('admin.ai.field.languageId')}</label>
              <select
                id="ai-language-id"
                value={exerciseForm.languageId}
                onChange={(event) => setExerciseForm((previous) => ({
                  ...previous,
                  languageId: event.target.value,
                  publishTargetPathId: '',
                }))}
              >
                {JUDGE0_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.icon} {t(option.labelKey)}
                  </option>
                ))}
              </select>

              <label htmlFor="ai-exercise-target">{t('admin.ai.field.publishTarget')}</label>
              <select
                id="ai-exercise-target"
                value={exerciseForm.publishTargetPathId}
                onChange={(event) => setExerciseForm((previous) => ({
                  ...previous,
                  publishTargetPathId: event.target.value,
                }))}
                disabled={publishTargetsLoading}
              >
                <option value="">{publishTargetsLoading ? t('admin.ai.publish.loadingTargets') : t('admin.ai.publish.selectTarget')}</option>
                {exerciseTargetPaths.map((path) => (
                  <option key={path.id} value={path.id}>
                    {path.name} - {path.difficultyLevel}
                  </option>
                ))}
                <option value={AUTO_CREATE_TARGET}>
                  {t('admin.ai.publish.autoTarget', {
                    level: getPathLevelForLesson(normalizeDifficultyLevel(exerciseForm.difficulty)),
                  })}
                </option>
              </select>

              <label htmlFor="ai-exercise-model">{t('admin.ai.field.model')}</label>
              <ModelSelect
                id="ai-exercise-model"
                value={exerciseForm.model}
                onChange={(event) => setExerciseForm((previous) => ({
                  ...previous,
                  model: event.target.value,
                }))}
                t={t}
              />

              <div className="ai-admin-actions">
                <button type="submit" disabled={exerciseLoading}>
                  {exerciseLoading ? t('admin.ai.loading') : t('admin.ai.action.generateExercise')}
                </button>
              </div>
            </form>

            {exerciseError && <p className="ai-admin-error">{exerciseError}</p>}
            {showExerciseSkeleton ? (
              <LessonResultSkeleton t={t} />
            ) : (
              <GeneratedContentCard
                type="exercise"
                result={exerciseResult}
                title={t('admin.ai.exercise.generatedTitle', { concept: exerciseForm.concept || t('admin.ai.exercise.title') })}
                difficulty={exerciseForm.difficulty}
                languageLabel={getLanguageLabel(exerciseForm.languageId, t)}
                monacoLanguage={monacoFromJudge0Id(exerciseForm.languageId)}
                model={exerciseForm.model}
                onSendToValidator={sendExerciseToValidator}
                onDiscard={() => setExerciseResult(null)}
                t={t}
              />
            )}
          </section>

          <section className="rbac-card ai-admin-card--full" ref={validatorRef}>
            <div className="rbac-section-head">
              <h2>{t('admin.ai.validate.title')}</h2>
              <GuideButton type={GUIDE_TYPES.validator} onOpen={setActiveGuide} t={t} />
            </div>
            <p className="rbac-muted">{t('admin.ai.validate.hint')}</p>
            {validationSource === 'generated' && (
              <p className="ai-prefill-indicator">{t('admin.ai.validation.prefilled')}</p>
            )}

            <form className="ai-admin-form" onSubmit={handleValidationSubmit}>
              <label htmlFor="ai-content">{t('admin.ai.field.content')}</label>
              <textarea
                ref={validationInputRef}
                id="ai-content"
                rows={6}
                value={validationForm.content}
                onChange={handleValidationContentChange}
                placeholder={t('admin.ai.placeholder.content')}
              />

              <div className="ai-admin-actions">
                <button type="submit" disabled={validationLoading}>
                  {validationLoading ? t('admin.ai.loading') : t('admin.ai.action.validate')}
                </button>
              </div>
            </form>

            {validationError && <p className="ai-admin-error">{validationError}</p>}
            <ValidationResultCard
              result={validationResult}
              onEdit={focusValidationEditor}
              onPublish={handlePublishValidatedContent}
              publishing={publishingContent}
              publishBlockedReason={publishBlockedReason}
              publishStatus={publishStatus}
              t={t}
            />
            {!validationResult && publishStatus && (
              <p className={`ai-publish-status ai-publish-status--${publishStatus.type}`}>
                {publishStatus.message}
              </p>
            )}
          </section>
        </div>
      </section>
      <GuideModal type={activeGuide} onClose={() => setActiveGuide(null)} t={t} />
      </MotionPage>
    </SidebarLayout>
  )
}

export default AdminAiPage
