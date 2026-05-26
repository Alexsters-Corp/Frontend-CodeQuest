import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IoMdHelpCircleOutline } from 'react-icons/io'
import { createPortal } from 'react-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import CodeViewer from '../components/CodeViewer'
import Button from '../components/ui/Button'
import { useLanguage } from '../context/useLanguage'
import {
  createInstructorClass,
  updateInstructorClass,
  getClassAnalytics,
  listInstructorClasses,
  listInstructorInvites,
  generateClassInvite,
  revokeClassInvite,
  rotateClassCode,
  deleteInstructorClass,
  kickStudentFromClass,
  assignPathToClass,
} from '../services/rbacApi'
import { listAvailableLearningPaths } from '../services/learningApi'
import { generateExercise, generateLesson, validateContent, publishContent } from '../services/aiAdminApi'
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify'

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

const MotionDiv = motion.div
const MotionArticle = motion.article

function formatJson(payload) {
  if (!payload) return ''
  return JSON.stringify(payload, null, 2)
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
  if (normalized === 'easy') return 'beginner'
  if (normalized === 'medium') return 'intermediate'
  if (normalized === 'hard') return 'advanced'
  return ['beginner', 'intermediate', 'advanced'].includes(normalized) ? normalized : 'beginner'
}

function normalizeValidationScore(value) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric)) return 0
  return Math.round((numeric <= 1 ? numeric * 100 : numeric))
}

function getValidationProgressClass(score) {
  if (score < 60) return 'ai-progress-fill--danger'
  if (score < 80) return 'ai-progress-fill--warning'
  return 'ai-progress-fill--success'
}

function GuideButton({ type, onOpen, t }) {
  return (
    <Button
      type="button"
      variant="purple"
      size="sm"
      className="instructor-guide-btn"
      icon={<IoMdHelpCircleOutline aria-hidden="true" />}
      onClick={() => onOpen(type)}
    >
      {t('admin.ai.guide.button')}
    </Button>
  )
}

function IconTooltipButton({ tooltip, buttonClassName = '', children, onClick, disabled, type = 'button', ariaLabel, stopPropagation = false }) {
  const [tooltipState, setTooltipState] = useState(null)

  const showTooltip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const placeAbove = rect.top > 76
    setTooltipState({
      left: rect.left + rect.width / 2,
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      placement: placeAbove ? 'above' : 'below',
    })
  }

  const hideTooltip = () => setTooltipState(null)

  const handleClick = (event) => {
    if (stopPropagation) event.stopPropagation()
    if (onClick) onClick(event)
  }

  return (
    <span className="icon-tooltip-wrap">
      <button
        type={type}
        className={buttonClassName}
        onClick={handleClick}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        disabled={disabled}
        aria-label={ariaLabel || tooltip}
      >
        {children}
      </button>
      {tooltipState && createPortal(
        <div
          className={`icon-tooltip-floating ${tooltipState.placement}`}
          style={{ left: `${tooltipState.left}px`, top: `${tooltipState.top}px` }}
        >
          {tooltip}
        </div>,
        document.body,
      )}
    </span>
  )
}

function GuideModal({ type, onClose, t }) {
  useEffect(() => {
    if (!type) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [type, onClose])

  if (!type) return null

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
          {t('admin.ai.generatedBy')} · {result.modelUsed || result.ai_model_used || model || 'llama-3.3-70b-versatile'}
        </span>
        <h2>{title}</h2>
        <span className={`ai-level-badge ai-level-badge--${normalizedDifficulty}`}>
          {t(`admin.ai.level.${normalizedDifficulty}`)}
        </span>
        {languageLabel && <span className="ai-language-badge">{languageLabel}</span>}
      </header>

      {result.judge0Validated === false && (
        <p className="ai-validation-warning">{t('admin.ai.output.judge0Warning')}</p>
      )}

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
        <Button type="button" variant="blue" onClick={() => onSendToValidator(result)}>
          {t('admin.ai.action.sendToValidator')}
        </Button>
        <Button type="button" variant="slate" onClick={onDiscard}>
          {t('admin.ai.action.discard')}
        </Button>
      </div>
    </MotionArticle>
  )
}

function formatDate(dateString, t) {
  if (!dateString) return t('instructor.noDate')
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return t('instructor.noDate')
  }
}

function InstructorDashboardPage() {
  const { t } = useLanguage()
  const classesRef = useRef(null)
  const studentsRef = useRef(null)
  const invitesRef = useRef(null)
  const aiRef = useRef(null)
  const validatorRef = useRef(null)
  const validationInputRef = useRef(null)
  const [activeGuide, setActiveGuide] = useState(null)

  const [classes, setClasses] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  const [newClassName, setNewClassName] = useState('')
  const [newClassDescription, setNewClassDescription] = useState('')
  const [creatingClass, setCreatingClass] = useState(false)
  const [isCreatingClass, setIsCreatingClass] = useState(false)

  const [selectedClassId, setSelectedClassId] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [classDeleteTarget, setClassDeleteTarget] = useState(null)
  const [revokeInviteTarget, setRevokeInviteTarget] = useState(null)
  const [rotateCodeTarget, setRotateCodeTarget] = useState(null)
  const [kickStudentTarget, setKickStudentTarget] = useState(null)

  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [revokingInvite, setRevokingInvite] = useState(false)
  const [rotatingCode, setRotatingCode] = useState(false)

  const [editingClassId, setEditingClassId] = useState(null)
  const [editClassName, setEditClassName] = useState('')
  const [editClassDescription, setEditClassDescription] = useState('')
  const [updatingClass, setUpdatingClass] = useState(false)

  const [aiActiveTab, setAiActiveTab] = useState('lesson')
  const [lessonForm, setLessonForm] = useState({
    topic: '',
    languageId: '63',
    level: 'beginner',
    model: RECOMMENDED_MODEL,
  })
  const [exerciseForm, setExerciseForm] = useState({
    concept: '',
    difficulty: 'medium',
    languageId: '63',
    model: RECOMMENDED_MODEL,
  })
  const [validationForm, setValidationForm] = useState({ content: '' })
  const [validationSource, setValidationSource] = useState('manual')

  const [creationMode, setCreationMode] = useState('ai')
  const [manualLessonForm, setManualLessonForm] = useState({
    title: '',
    theory: '',
    codeExample: '',
    languageId: '63',
    level: 'beginner',
    exercisePrompt: '',
    exerciseStarterCode: '',
    exerciseSolutionCode: '',
    testCases: [{ input: '', expectedOutput: '' }],
  })
  const [manualExerciseForm, setManualExerciseForm] = useState({
    concept: '',
    difficulty: 'medium',
    languageId: '63',
    prompt: '',
    starterCode: '',
    solutionCode: '',
    testCases: [{ input: '', expectedOutput: '' }],
  })

  const [lessonLoading, setLessonLoading] = useState(false)
  const [exerciseLoading, setExerciseLoading] = useState(false)
  const [validationLoading, setValidationLoading] = useState(false)

  const [lessonError, setLessonError] = useState('')
  const [exerciseError, setExerciseError] = useState('')
  const [validationError, setValidationError] = useState('')

  const [lessonResult, setLessonResult] = useState(null)
  const [exerciseResult, setExerciseResult] = useState(null)
  const [validationResult, setValidationResult] = useState(null)

  const [publishingContent, setPublishingContent] = useState(false)
  const [publishTargetPathId, setPublishTargetPathId] = useState('')

  const [availablePaths, setAvailablePaths] = useState([])
  const [showPathModal, setShowPathModal] = useState(false)
  const [assigningPath, setAssigningPath] = useState(false)
  const [pathForm, setPathForm] = useState({
    pathId: '',
    isRequired: true,
  })

  const selectedClass = useMemo(
    () => classes.find((item) => Number(item.id) === Number(selectedClassId)) || null,
    [classes, selectedClassId]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [classesPayload, invitesPayload] = await Promise.all([
        listInstructorClasses(),
        listInstructorInvites(),
      ])
      setClasses(classesPayload)
      setInvites(invitesPayload)
    } catch (requestError) {
      notifyError(requestError.message || t('instructor.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const loadAssignablePaths = useCallback(async () => {
    try {
      const data = await listAvailableLearningPaths()
      setAvailablePaths(data || [])
    } catch (e) {
      console.error('Error loading learning paths:', e)
    }
  }, [])

  useEffect(() => {
    loadData()
    loadAssignablePaths()
  }, [loadData, loadAssignablePaths])

  async function handleAssignPath(event) {
    event.preventDefault()
    if (!pathForm.pathId) {
      notifyInfo(t('instructor.selectPath') || 'Selecciona una ruta.')
      return
    }

    setAssigningPath(true)
    try {
      await assignPathToClass({
        classId: selectedClassId,
        learningPathId: pathForm.pathId,
        isRequired: pathForm.isRequired,
      })
      notifySuccess(t('instructor.assignSuccess') || 'Ruta asignada con éxito.')
      setShowPathModal(false)
      // Recargar analytics para ver la nueva ruta
      const payload = await getClassAnalytics(selectedClassId)
      setAnalytics(payload)
    } catch (e) {
      notifyError(e.message || t('instructor.assignError'))
    } finally {
      setAssigningPath(false)
    }
  }

  async function handleCreateClass(event) {
    event.preventDefault()
    const trimmedName = String(newClassName || '').trim()
    if (trimmedName.length < 3) {
      notifyInfo(t('instructor.nameMin'))
      return
    }

    setCreatingClass(true)
    try {
      await createInstructorClass({
        name: trimmedName,
        description: newClassDescription,
      })
      setNewClassName('')
      setNewClassDescription('')
      await loadData()
      notifySuccess(t('instructor.createSuccess'))
    } catch (requestError) {
      notifyError(requestError.message || t('instructor.createError'))
    } finally {
      setCreatingClass(false)
    }
  }

  async function handleLoadAnalytics(classId) {
    if (selectedClassId === classId && analytics) return
    setSelectedClassId(classId)
    setAnalytics(null)
    setAnalyticsError('')
    setAnalyticsLoading(true)
    try {
      const payload = await getClassAnalytics(classId)
      setAnalytics(payload)

      // Context Intelligence: Pre-select language and target path from the class
      if (payload.assigned_paths && payload.assigned_paths.length > 0) {
        const firstPath = payload.assigned_paths[0]
        const langId = String(firstPath.language_id)
        setLessonForm(prev => ({ ...prev, languageId: langId }))
        setExerciseForm(prev => ({ ...prev, languageId: langId }))
        setPublishTargetPathId(String(firstPath.learning_path_id))
      }
    } catch (requestError) {
      setAnalyticsError(requestError.message || t('instructor.analyticsError'))
    } finally {
      setAnalyticsLoading(false)
    }
  }

  async function handleGenerateInvite(classId) {
    setGeneratingInvite(true)
    try {
      const result = await generateClassInvite({ classId })
      notifySuccess(t('instructor.inviteCreated', { code: result.invite.code }))
      await loadData()
    } catch (requestError) {
      notifyError(requestError.message || t('instructor.inviteError'))
    } finally {
      setGeneratingInvite(false)
    }
  }

  async function handleRevokeInvite(inviteId) {
    setRevokeInviteTarget(inviteId)
  }

  async function confirmRevokeInvite() {
    if (!revokeInviteTarget) return
    setRevokingInvite(true)
    try {
      await revokeClassInvite(revokeInviteTarget)
      notifySuccess(t('instructor.revokeSuccess'))
      await loadData()
      setRevokeInviteTarget(null)
    } catch (requestError) {
      notifyError(requestError.message || t('instructor.revokeError'))
    } finally {
      setRevokingInvite(false)
    }
  }

  async function handleRotateCode(classId) {
    setRotateCodeTarget(classId)
  }

  async function confirmRotateCode() {
    if (!rotateCodeTarget) return
    setRotatingCode(true)
    try {
      const result = await rotateClassCode(rotateCodeTarget)
      notifySuccess(t('instructor.rotateSuccess', { code: result.invite.code }))
      await loadData()
      setRotateCodeTarget(null)
    } catch (requestError) {
      notifyError(requestError.message || t('instructor.rotateError'))
    } finally {
      setRotatingCode(false)
    }
  }

  function startEditing(item) {
    setEditingClassId(item.id)
    setEditClassName(item.name)
    setEditClassDescription(item.description || '')
  }

  async function handleUpdateClass(event) {
    event.preventDefault()
    setUpdatingClass(true)
    try {
      await updateInstructorClass({ id: editingClassId, name: editClassName, description: editClassDescription })
      setEditingClassId(null)
      await loadData()
      notifySuccess(t('instructor.updateSuccess'))
    } catch (e) {
      notifyError(e.message || t('instructor.updateError'))
    } finally {
      setUpdatingClass(false)
    }
  }

  async function handleDeleteClass(classId) {
    setClassDeleteTarget(classId)
  }

  async function confirmDeleteClass() {
    if (!classDeleteTarget) return
    try {
      const classId = classDeleteTarget
      await deleteInstructorClass(classId)
      notifySuccess(t('instructor.deleteSuccess') || 'Clase eliminada correctamente.')
      if (Number(selectedClassId) === Number(classId)) {
        setSelectedClassId(null)
        setAnalytics(null)
      }
      await loadData()
      setClassDeleteTarget(null)
    } catch (error) {
      notifyError(error.message || 'Error al eliminar la clase')
    }
  }

  async function handleKickStudent(student) {
    setKickStudentTarget(student)
  }

  async function confirmKickStudent() {
    if (!kickStudentTarget) return
    try {
      await kickStudentFromClass({ classId: selectedClassId, studentId: kickStudentTarget.id })
      notifySuccess(t('instructor.kickSuccess') || 'Alumno expulsado con éxito')
      // Recargar analytics para actualizar la lista de alumnos
      const payload = await getClassAnalytics(selectedClassId)
      setAnalytics(payload)
      setKickStudentTarget(null)
    } catch (error) {
      notifyError(error.message || 'Error al expulsar al alumno')
    }
  }

  const addManualLessonTestCase = () => {
    setManualLessonForm((prev) => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '' }],
    }))
  }

  const removeManualLessonTestCase = (index) => {
    setManualLessonForm((prev) => {
      const copy = [...prev.testCases]
      copy.splice(index, 1)
      return { ...prev, testCases: copy }
    })
  }

  const handleManualLessonTestCaseChange = (index, field, value) => {
    setManualLessonForm((prev) => {
      const copy = [...prev.testCases]
      copy[index] = { ...copy[index], [field]: value }
      return { ...prev, testCases: copy }
    })
  }

  const addManualExerciseTestCase = () => {
    setManualExerciseForm((prev) => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '' }],
    }))
  }

  const removeManualExerciseTestCase = (index) => {
    setManualExerciseForm((prev) => {
      const copy = [...prev.testCases]
      copy.splice(index, 1)
      return { ...prev, testCases: copy }
    })
  }

  const handleManualExerciseTestCaseChange = (index, field, value) => {
    setManualExerciseForm((prev) => {
      const copy = [...prev.testCases]
      copy[index] = { ...copy[index], [field]: value }
      return { ...prev, testCases: copy }
    })
  }

  async function handleManualSubmit(event) {
    event.preventDefault()
    const isLesson = aiActiveTab === 'lesson'

    if (isLesson) {
      if (!manualLessonForm.title.trim()) {
        notifyError('El título es requerido.')
        return
      }
      if (!manualLessonForm.theory.trim()) {
        notifyError('La teoría es requerida.')
        return
      }
      if (!manualLessonForm.exercisePrompt.trim()) {
        notifyError('La descripción del ejercicio es requerida.')
        return
      }

      const lessonJson = {
        title: manualLessonForm.title.trim(),
        theory: manualLessonForm.theory.trim(),
        codeExample: manualLessonForm.codeExample.trim(),
        exercise: {
          prompt: manualLessonForm.exercisePrompt.trim(),
          starterCode: manualLessonForm.exerciseStarterCode.trim(),
          solutionCode: manualLessonForm.exerciseSolutionCode.trim(),
          testCases: manualLessonForm.testCases
            .map((tc) => ({
              input: tc.input.trim(),
              expectedOutput: tc.expectedOutput.trim(),
            }))
            .filter((tc) => tc.expectedOutput !== ''),
        },
      }

      setLessonResult(lessonJson)
      setValidationResult(null)

      setValidationLoading(true)
      setValidationError('')
      const stringified = JSON.stringify(lessonJson, null, 2)
      setValidationForm({ content: stringified })
      setValidationSource('manual')

      try {
        const payload = await validateContent({ content: stringified })
        setValidationResult(payload)
        notifySuccess(t('admin.ai.success.validate') || 'Contenido validado con éxito.')
        window.setTimeout(() => {
          validatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      } catch (error) {
        setValidationError(error.message || 'Error al validar el contenido.')
        notifyError(error.message || 'Error al validar el contenido.')
      } finally {
        setValidationLoading(false)
      }
    } else {
      if (!manualExerciseForm.concept.trim()) {
        notifyError('El concepto es requerido.')
        return
      }
      if (!manualExerciseForm.prompt.trim()) {
        notifyError('La descripción del ejercicio es requerida.')
        return
      }

      const exerciseJson = {
        prompt: manualExerciseForm.prompt.trim(),
        starterCode: manualExerciseForm.starterCode.trim(),
        solutionCode: manualExerciseForm.solutionCode.trim(),
        testCases: manualExerciseForm.testCases
          .map((tc) => ({
            input: tc.input.trim(),
            expectedOutput: tc.expectedOutput.trim(),
          }))
          .filter((tc) => tc.expectedOutput !== ''),
      }

      setExerciseResult(exerciseJson)
      setValidationResult(null)

      setValidationLoading(true)
      setValidationError('')
      const stringified = JSON.stringify(exerciseJson, null, 2)
      setValidationForm({ content: stringified })
      setValidationSource('manual')

      try {
        const payload = await validateContent({ content: stringified })
        setValidationResult(payload)
        notifySuccess(t('admin.ai.success.validate') || 'Contenido validado con éxito.')
        window.setTimeout(() => {
          validatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      } catch (error) {
        setValidationError(error.message || 'Error al validar el contenido.')
        notifyError(error.message || 'Error al validar el contenido.')
      } finally {
        setValidationLoading(false)
      }
    }
  }

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
    
    setLessonLoading(true)
    setLessonError('')
    setLessonResult(null)
    try {
      const generatedLesson = await generateLesson(lessonForm)
      setLessonResult(generatedLesson)
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
    
    setExerciseLoading(true)
    setExerciseError('')
    setExerciseResult(null)
    try {
      const payload = await generateExercise(exerciseForm)
      setExerciseResult(payload)
      setValidationResult(null)
      notifySuccess(t('admin.ai.success.exercise'))
    } catch (error) {
      const message = error.message || t('admin.ai.error.exercise')
      setExerciseError(message)
      notifyError(message)
    } finally {
      setExerciseLoading(false)
    }
  }

  function sendLessonToValidator(payload) {
    setValidationForm({ content: formatJson(payload) })
    setValidationSource('generated')
    setValidationError('')
    setValidationResult(null)
    notifySuccess(t('admin.ai.sentToValidator'), { duration: 2000 })
    window.setTimeout(() => {
      validatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function sendExerciseToValidator(payload) {
    setValidationForm({ content: formatJson(payload) })
    setValidationSource('generated')
    setValidationError('')
    setValidationResult(null)
    notifySuccess(t('admin.ai.sentToValidator'), { duration: 2000 })
    window.setTimeout(() => {
      validatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function handleValidationContentChange(event) {
    setValidationForm({ content: event.target.value })
    setValidationSource('manual')
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
    if (!validationResult) return
    if (!selectedClassId) {
      notifyInfo(t('instructor.noClassSelected'))
      return
    }

    setPublishingContent(true)

    try {
      const isLesson = aiActiveTab === 'lesson'
      const sourceForm = isLesson ? lessonForm : exerciseForm
      
      await publishContent({
        content: validationForm.content,
        languageId: sourceForm.languageId,
        level: isLesson ? sourceForm.level : sourceForm.difficulty,
        validation: validationResult,
        learningPathId: publishTargetPathId || null,
        classId: selectedClassId,
      })

      notifySuccess(t('admin.ai.publish.success'))
      
      // Limpiar estados
      setValidationResult(null)
      setValidationForm({ content: '' })
      if (isLesson) setLessonResult(null)
      else setExerciseResult(null)
      
      // Recargar analytics si la clase seleccionada usa ese path
      if (selectedClassId) {
        const analyticsPayload = await getClassAnalytics(selectedClassId)
        setAnalytics(analyticsPayload)
      }
    } catch (error) {
      notifyError(error.message)
    } finally {
      setPublishingContent(false)
    }
  }

  const validationScore = normalizeValidationScore(validationResult?.qualityScore)

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar title={t('instructor.title')} hideActions />

      <section className="instructor-v3">
        <div className="instructor-3-blocks-grid">
          {/* Bloque 1: Mis Clases */}
          <section ref={classesRef} className="surface-main block-classes">
            <div className="rbac-section-head">
              <h2>📚 {t('instructor.myClasses')}</h2>
              <div className="instructor-section-actions">
                <IconTooltipButton
                  tooltip={t('instructor.createClass')}
                  buttonClassName="rbac-btn-refresh"
                  onClick={() => setIsCreatingClass(!isCreatingClass)}
                >
                  {isCreatingClass ? '✕' : '+'}
                </IconTooltipButton>
                <IconTooltipButton
                  tooltip={t('instructor.refreshClasses') || 'Actualizar clases'}
                  buttonClassName="rbac-btn-refresh"
                  onClick={loadData}
                  disabled={loading}
                >
                  ↻
                </IconTooltipButton>
              </div>
            </div>
            <p className="rbac-muted instructor-panel-intro">Crea grupos para organizar a tus estudiantes y generar códigos de acceso únicos.</p>

            {isCreatingClass && (
              <form className="ai-admin-form instructor-inline-shell" onSubmit={handleCreateClass}>
                <label>{t('instructor.className')}</label>
                <input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder={t('instructor.classNamePlaceholder')}
                  disabled={creatingClass}
                  required
                />
                <label>{t('instructor.classDescription')}</label>
                <textarea
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                  placeholder={t('instructor.classDescriptionPlaceholder')}
                  disabled={creatingClass}
                  rows={2}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="ai-admin-actions__btn"
                  disabled={creatingClass || !newClassName.trim()}
                >
                  {creatingClass ? t('instructor.creating') : t('instructor.createClass')}
                </Button>
              </form>
            )}

            <div className="class-list-container">
              {loading && !classes.length ? (
                <p className="rbac-loading-text">{t('common.loading')}</p>
              ) : classes.length === 0 ? (
                <div className="rbac-empty-state-centered instructor-empty-state-compact">
                  <div className="empty-icon instructor-empty-state-compact__icon">🎓</div>
                  <p>{t('instructor.noClasses')}</p>
                </div>
              ) : (
                classes.map((item) => (
                  <div 
                    key={item.id} 
                    className={`class-row-item ${Number(selectedClassId) === Number(item.id) ? 'active' : ''}`}
                    onClick={() => handleLoadAnalytics(item.id)}
                  >
                    <div className="class-row-info">
                      <strong>{item.name}</strong>
                      <p className="rbac-muted class-row-description">{item.description || t('instructor.noDescription')}</p>
                      <span>{Number(item.students_total || 0)} {t('instructor.students')}</span>
                    </div>
                    <div className="class-row-actions">
                      <IconTooltipButton
                        tooltip={t('instructor.generateCode')}
                        buttonClassName="rbac-icon-btn"
                        onClick={() => handleGenerateInvite(item.id)}
                        disabled={generatingInvite}
                        stopPropagation
                      >
                        🔑
                      </IconTooltipButton>
                      <IconTooltipButton
                        tooltip={t('instructor.classSettings') || 'Configuración de clase'}
                        buttonClassName={`rbac-icon-btn ${Number(selectedClassId) === Number(item.id) ? 'active' : ''}`}
                        onClick={() => handleLoadAnalytics(item.id)}
                        stopPropagation
                      >
                        ⚙️
                      </IconTooltipButton>
                      <IconTooltipButton
                        tooltip={t('instructor.deleteClass') || 'Eliminar clase'}
                        buttonClassName="rbac-icon-btn rbac-icon-btn--danger"
                        onClick={() => handleDeleteClass(item.id)}
                        stopPropagation
                      >
                        🗑️
                      </IconTooltipButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Bloque 2: Estudiantes */}
          <section ref={studentsRef} className="surface-main block-students">
            <div className="rbac-section-head instructor-students-head">
              <h2>👤 {selectedClass ? t('instructor.analyticsOf', { name: selectedClass.name }) : t('instructor.students')}</h2>
              {selectedClass && (
                <div className="rbac-actions-inline instructor-section-actions instructor-section-actions--tight">
                  <IconTooltipButton
                    tooltip={t('instructor.editClass')}
                    buttonClassName="rbac-icon-btn"
                    onClick={() => startEditing(selectedClass)}
                  >
                    ✏️
                  </IconTooltipButton>
                  <IconTooltipButton
                    tooltip={t('instructor.rotateCode')}
                    buttonClassName="rbac-icon-btn"
                    onClick={() => handleRotateCode(selectedClassId)}
                    disabled={rotatingCode}
                  >
                    🔄
                  </IconTooltipButton>
                  <IconTooltipButton
                    tooltip={t('instructor.deleteClass')}
                    buttonClassName="rbac-icon-btn rbac-icon-btn--danger"
                    onClick={() => handleDeleteClass(selectedClassId)}
                  >
                    🗑️
                  </IconTooltipButton>
                </div>
              )}
            </div>
            <p className="rbac-muted instructor-panel-intro">Visualiza el rendimiento detallado, XP acumulada y progreso de cada integrante de tu clase.</p>

            {editingClassId && selectedClass && (
              <div className="rbac-edit-overlay-inline">
                <form className="inline-edit-form instructor-inline-shell" onSubmit={handleUpdateClass}>
                  <div className="instructor-inline-shell__row">
                    <input 
                      value={editClassName} 
                      onChange={(e) => setEditClassName(e.target.value)} 
                      placeholder={t('instructor.classNamePlaceholder')}
                      autoFocus 
                      className="instructor-inline-shell__input"
                    />
                    <Button type="submit" variant="primary" size="sm" disabled={updatingClass}>
                      {updatingClass ? '...' : t('common.save') || 'Guardar'}
                    </Button>
                    <Button type="button" variant="slate" size="sm" onClick={() => setEditingClassId(null)}>
                      {t('common.cancel') || 'Cancelar'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
            {!selectedClass ? (
              <div className="rbac-empty-state-centered">
                <div className="empty-icon">👥</div>
                <p>{t('instructor.noClassSelected')}</p>
              </div>
            ) : analyticsLoading ? (
              <div className="rbac-loading-text instructor-loading-state">
                <div className="spinner instructor-loading-state__spinner" />
                <p>{t('instructor.loadingAnalytics')}</p>
              </div>
            ) : analytics ? (
              <div className="students-detail-view">
                <div className="rbac-mini-metrics-row">
                  <article className="mini-metric-pill"><small>{t('instructor.metric.activeStudents')}</small><strong>{Number(analytics.summary?.students_total || 0)}</strong></article>
                  <article className="mini-metric-pill"><small>{t('instructor.metric.avgSignal')}</small><strong>{Number(analytics.summary?.progress_signal_avg || 0)}%</strong></article>
                  <article className="mini-metric-pill action-pill" onClick={() => setShowPathModal(true)}>
                    <small>{t('instructor.action.assignPath') || 'Asignar Ruta'}</small>
                    <strong>+</strong>
                  </article>
                </div>

                <div className="rbac-assigned-paths-section instructor-assigned-paths">
                  <h3 className="instructor-assigned-paths__title">🚩 {t('instructor.assignedPaths') || 'Rutas Asignadas'}</h3>
                  <div className="assigned-paths-tags instructor-assigned-paths__tags">
                    {analytics.assigned_paths?.length > 0 ? analytics.assigned_paths.map(path => (
                      <span key={path.id} className="rbac-code-badge instructor-assigned-paths__badge">
                        {path.name} {path.is_required && <small title={t('instructor.pathRequired')} className="instructor-assigned-paths__required">⭐</small>}
                      </span>
                    )) : <p className="rbac-muted instructor-assigned-paths__empty">{t('instructor.noPathsAssigned') || 'No hay rutas asignadas a esta clase.'}</p>}
                  </div>
                </div>

                <div className="rbac-table-wrap">
                  <table className="rbac-table compact">
                    <thead>
                      <tr>
                        <th>{t('instructor.table.student')}</th>
                        <th className="rbac-center">{t('instructor.table.progress')}</th>
                        <th className="rbac-center">{t('instructor.table.xp')}</th>
                        <th className="rbac-center">{t('instructor.table.lastActivity')}</th>
                        <th className="rbac-center">{t('instructor.table.actions') || 'Acciones'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.students?.length > 0 ? analytics.students.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div className="student-compact-cell">
                              <div className="student-initial">{(s.name || 'U')[0]}</div>
                              <div className="student-name-email">
                                <strong>{s.name}</strong>
                                <small>{s.email}</small>
                              </div>
                            </div>
                          </td>
                          <td className="rbac-center">
                            <div className="rbac-progress-mini-wrap">
                              <div className="rbac-progress-mini-bar">
                                <div 
                                  className="rbac-progress-mini-fill" 
                                  style={{ width: `${Math.min(100, Math.round(((s.completed_lessons || 0) / (analytics.summary?.lessons_total || 1)) * 100))}%` }} 
                                />
                              </div>
                              <small>{Math.min(100, Math.round(((s.completed_lessons || 0) / (analytics.summary?.lessons_total || 1)) * 100))}%</small>
                            </div>
                          </td>
                          <td className="rbac-center"><span className="xp-badge">✨ {Number(s.earned_xp || 0)}</span></td>
                          <td className="rbac-center"><small>{formatDate(s.last_activity_at, t)}</small></td>
                          <td className="rbac-center">
                            <IconTooltipButton
                              tooltip={t('instructor.kickStudent') || 'Expulsar alumno'}
                              buttonClassName="rbac-revoke-btn"
                              onClick={() => handleKickStudent(s)}
                            >
                              ✕
                            </IconTooltipButton>
                          </td>
                        </tr>
                      )) : <tr><td colSpan={5} className="rbac-center rbac-muted" style={{ padding: '3rem' }}>{t('instructor.noActiveStudents')}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <p className="rbac-error">{analyticsError}</p>}
          </section>

          <section ref={invitesRef} className="surface-main block-invites">
            <div className="rbac-section-head instructor-section-head">
              <h2>🎟️ {t('instructor.invitations')}</h2>
            </div>
            <p className="rbac-muted instructor-panel-intro">Gestiona los códigos activos, revoca accesos o consulta cuántas veces ha sido usado cada enlace.</p>
            <div className="invites-compact-list">
              {loading && !invites.length ? (
                <p className="rbac-loading-text">{t('common.loading')}</p>
              ) : invites.length === 0 ? (
                <div className="rbac-empty-state-centered instructor-empty-state-compact">
                  <p className="instructor-empty-state-compact__text">{t('instructor.noInvitations')}</p>
                </div>
              ) : (
                invites.map((inv) => (
                  <div key={inv.id} className={`invite-compact-row ${!inv.is_active ? 'row-inactive' : ''}`}>
                    <div className="invite-main-info">
                      <code className={`rbac-code-badge ${!inv.is_active ? 'inactive' : ''}`}>{inv.code}</code>
                      <span className="invite-class-tag" title={inv.class_name}>{inv.class_name}</span>
                    </div>
                    <div className="invite-meta-actions">
                      <span className="invite-uses-count">👤 {inv.used_count}{inv.max_uses ? `/${inv.max_uses}` : ''}</span>
                      {inv.is_active && (
                        <IconTooltipButton
                          tooltip={t('instructor.revokeCode')}
                          buttonClassName="rbac-revoke-btn"
                          onClick={() => handleRevokeInvite(inv.id)}
                          disabled={revokingInvite}
                        >
                          ✕
                        </IconTooltipButton>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {classDeleteTarget && (
            <MotionDiv
              className="instructor-confirm-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="instructor-delete-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={() => setClassDeleteTarget(null)}
            >
              <MotionDiv
                className="instructor-confirm-modal"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="instructor-confirm-icon" aria-hidden="true">🗑️</div>
                <h3 id="instructor-delete-title">{t('instructor.confirmDeleteClassTitle') || 'Eliminar clase'}</h3>
                <p>{t('instructor.confirmDeleteClass') || '¿Eliminar esta clase? Esta acción no se puede deshacer.'}</p>
                <small>{t('instructor.confirmDeleteClassHint') || 'Se borrará la clase y sus datos asociados.'}</small>

                <div className="instructor-confirm-actions">
                  <Button type="button" variant="slate" onClick={() => setClassDeleteTarget(null)}>
                    {t('common.cancel') || 'Cancelar'}
                  </Button>
                  <Button type="button" variant="red" onClick={confirmDeleteClass}>
                    {t('instructor.confirmDeleteClassAction') || 'Eliminar'}
                  </Button>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}

          {revokeInviteTarget && (
            <MotionDiv
              className="instructor-confirm-overlay"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onMouseDown={() => setRevokeInviteTarget(null)}
            >
              <MotionDiv
                className="instructor-confirm-modal"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="instructor-confirm-icon">🎫</div>
                <h3>{t('instructor.revokeCode') || 'Revocar invitación'}</h3>
                <p>{t('instructor.confirmRevoke') || '¿Estás seguro de revocar este código? Ya no podrá ser usado para inscribirse.'}</p>
                <div className="instructor-confirm-actions">
                  <Button type="button" variant="slate" onClick={() => setRevokeInviteTarget(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="button" variant="red" onClick={confirmRevokeInvite} disabled={revokingInvite}>
                    {revokingInvite ? '...' : t('common.confirm') || 'Confirmar'}
                  </Button>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}

          {rotateCodeTarget && (
            <MotionDiv
              className="instructor-confirm-overlay"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onMouseDown={() => setRotateCodeTarget(null)}
            >
              <MotionDiv
                className="instructor-confirm-modal"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="instructor-confirm-icon">🔄</div>
                <h3>{t('instructor.rotateCode') || 'Rotar código'}</h3>
                <p>{t('instructor.confirmRotate') || '¿Estás seguro de rotar el código? El código actual será revocado y se generará uno nuevo.'}</p>
                <div className="instructor-confirm-actions">
                  <Button type="button" variant="slate" onClick={() => setRotateCodeTarget(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="button" variant="blue" onClick={confirmRotateCode} disabled={rotatingCode}>
                    {rotatingCode ? '...' : t('common.confirm') || 'Confirmar'}
                  </Button>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}

          {kickStudentTarget && (
            <MotionDiv
              className="instructor-confirm-overlay"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onMouseDown={() => setKickStudentTarget(null)}
            >
              <MotionDiv
                className="instructor-confirm-modal"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="instructor-confirm-icon">👤</div>
                <h3>{t('instructor.kickStudent') || 'Expulsar alumno'}</h3>
                <p>{t('instructor.confirmKickStudent') || '¿Estás seguro de que deseas expulsar a este alumno?'}</p>
                <p><strong>{kickStudentTarget.name}</strong> ({kickStudentTarget.email})</p>
                <div className="instructor-confirm-actions">
                  <Button type="button" variant="slate" onClick={() => setKickStudentTarget(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="button" variant="red" onClick={confirmKickStudent}>
                    {t('common.confirm') || 'Confirmar'}
                  </Button>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}

          {/* Bloque 4: IA */}
          <section ref={aiRef} className="surface-main block-ai-tools">
            <div className="instructor-ai-header">
              <div>
                <h2>🤖 {t('instructor.aiTools')}</h2>
                <p className="rbac-muted" style={{ margin: 0 }}>{t('instructor.aiToolsHint')}</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="instructor-ai-tabs" role="tablist" aria-label={t('instructor.aiTools')}>
                  <Button
                    type="button"
                    variant={aiActiveTab === 'lesson' ? 'blue' : 'slate'}
                    size="sm"
                    className="instructor-ai-tab-btn"
                    onClick={() => setAiActiveTab('lesson')}
                  >
                    {t('admin.ai.lesson.title')}
                  </Button>
                  <Button
                    type="button"
                    variant={aiActiveTab === 'exercise' ? 'blue' : 'slate'}
                    size="sm"
                    className="instructor-ai-tab-btn"
                    onClick={() => setAiActiveTab('exercise')}
                  >
                    {t('admin.ai.exercise.title')}
                  </Button>
                </div>
                <GuideButton type={aiActiveTab === 'lesson' ? GUIDE_TYPES.lesson : GUIDE_TYPES.exercise} onOpen={setActiveGuide} t={t} />
              </div>
            </div>

            <div className="instructor-ai-main-layout">
              <div className="instructor-ai-controls">
                <div className="instructor-ai-tabs" role="tablist" aria-label={t('admin.ai.mode.label')}>
                  <Button
                    type="button"
                    variant={creationMode === 'ai' ? 'blue' : 'slate'}
                    size="sm"
                    className="instructor-ai-tab-btn"
                    onClick={() => setCreationMode('ai')}
                  >
                    {t('admin.ai.mode.assisted')}
                  </Button>
                  <Button
                    type="button"
                    variant={creationMode === 'manual' ? 'blue' : 'slate'}
                    size="sm"
                    className="instructor-ai-tab-btn"
                    onClick={() => setCreationMode('manual')}
                  >
                    {t('admin.ai.mode.manual')}
                  </Button>
                </div>

                {creationMode === 'ai' ? (
                  <>
                    {aiActiveTab === 'lesson' && (
                      <form className="ai-admin-form" onSubmit={handleLessonSubmit}>
                        <label htmlFor="instructor-ai-topic">{t('admin.ai.field.topic')}</label>
                        <input
                          id="instructor-ai-topic"
                          type="text"
                          value={lessonForm.topic}
                          onChange={(event) => setLessonForm((previous) => ({ ...previous, topic: event.target.value }))}
                          placeholder={t('admin.ai.placeholder.topic')}
                        />

                        <label htmlFor="instructor-ai-language">{t('admin.ai.field.language')}</label>
                        <select
                          id="instructor-ai-language"
                          value={lessonForm.languageId}
                          onChange={(event) => setLessonForm((previous) => ({
                            ...previous,
                            languageId: event.target.value,
                          }))}
                        >
                          {JUDGE0_LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.icon} {t(option.labelKey)}
                            </option>
                          ))}
                        </select>

                        <label htmlFor="instructor-ai-level">{t('admin.ai.field.level')}</label>
                        <select
                          id="instructor-ai-level"
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

                        <label htmlFor="instructor-ai-lesson-model">{t('admin.ai.field.model')}</label>
                        <select
                          id="instructor-ai-lesson-model"
                          value={lessonForm.model}
                          onChange={(event) => setLessonForm((previous) => ({ ...previous, model: event.target.value }))}
                        >
                          {CONTENT_MODEL_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{t(option.labelKey)}</option>
                          ))}
                        </select>

                        <div className="ai-admin-actions" style={{ marginTop: '1rem' }}>
                          <button type="submit" disabled={lessonLoading} style={{ width: '100%' }}>
                            {lessonLoading ? t('admin.ai.loading') : t('admin.ai.action.generateLesson')}
                          </button>
                        </div>

                        {lessonError && <p className="ai-admin-error">{lessonError}</p>}
                      </form>
                    )}

                    {aiActiveTab === 'exercise' && (
                      <form className="ai-admin-form" onSubmit={handleExerciseSubmit}>
                        <label htmlFor="instructor-ai-concept">{t('admin.ai.field.concept')}</label>
                        <input
                          id="instructor-ai-concept"
                          type="text"
                          value={exerciseForm.concept}
                          onChange={(event) => setExerciseForm((previous) => ({ ...previous, concept: event.target.value }))}
                          placeholder={t('admin.ai.placeholder.concept')}
                        />

                        <label htmlFor="instructor-ai-difficulty">{t('admin.ai.field.difficulty')}</label>
                        <select
                          id="instructor-ai-difficulty"
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

                        <label htmlFor="instructor-ai-language-id">{t('admin.ai.field.languageId')}</label>
                        <select
                          id="instructor-ai-language-id"
                          value={exerciseForm.languageId}
                          onChange={(event) => setExerciseForm((previous) => ({
                            ...previous,
                            languageId: event.target.value,
                          }))}
                        >
                          {JUDGE0_LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.icon} {t(option.labelKey)}
                            </option>
                          ))}
                        </select>

                        <label htmlFor="instructor-ai-exercise-model">{t('admin.ai.field.model')}</label>
                        <select
                          id="instructor-ai-exercise-model"
                          value={exerciseForm.model}
                          onChange={(event) => setExerciseForm((previous) => ({ ...previous, model: event.target.value }))}
                        >
                          {CONTENT_MODEL_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{t(option.labelKey)}</option>
                          ))}
                        </select>

                        <div className="ai-admin-actions" style={{ marginTop: '1rem' }}>
                          <button type="submit" disabled={exerciseLoading} style={{ width: '100%' }}>
                            {exerciseLoading ? t('admin.ai.loading') : t('admin.ai.action.generateExercise')}
                          </button>
                        </div>

                        {exerciseError && <p className="ai-admin-error">{exerciseError}</p>}
                      </form>
                    )}
                  </>
                ) : (
                  <>
                    {aiActiveTab === 'lesson' && (
                      <form className="ai-admin-form" onSubmit={handleManualSubmit}>
                        <label>Título de la lección</label>
                        <input
                          type="text"
                          value={manualLessonForm.title}
                          onChange={(e) => setManualLessonForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Ej. Introducción a Arrays"
                          required
                        />

                        <label>Teoría / Explicación</label>
                        <textarea
                          value={manualLessonForm.theory}
                          onChange={(e) => setManualLessonForm(prev => ({ ...prev, theory: e.target.value }))}
                          placeholder="Describe los conceptos clave de la lección..."
                          rows={6}
                          required
                        />

                        <label>Ejemplo de código (opcional)</label>
                        <textarea
                          value={manualLessonForm.codeExample}
                          onChange={(e) => setManualLessonForm(prev => ({ ...prev, codeExample: e.target.value }))}
                          placeholder="Ej. const arr = [1, 2, 3];"
                          rows={3}
                          style={{ fontFamily: 'monospace' }}
                        />

                        <label>Lenguaje de programación</label>
                        <select
                          value={manualLessonForm.languageId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualLessonForm(prev => ({ ...prev, languageId: val }));
                            setManualExerciseForm(prev => ({ ...prev, languageId: val }));
                            setExerciseForm(prev => ({ ...prev, languageId: val }));
                            setLessonForm(prev => ({ ...prev, languageId: val }));
                          }}
                        >
                          {JUDGE0_LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.icon} {t(option.labelKey)}
                            </option>
                          ))}
                        </select>

                        <label>Nivel de dificultad</label>
                        <select
                          value={manualLessonForm.level}
                          onChange={(e) => setManualLessonForm(prev => ({ ...prev, level: e.target.value }))}
                        >
                          <option value="beginner">{t('admin.ai.level.beginner')}</option>
                          <option value="intermediate">{t('admin.ai.level.intermediate')}</option>
                          <option value="advanced">{t('admin.ai.level.advanced')}</option>
                        </select>

                        <h4 style={{ margin: '1.5rem 0 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', fontSize: '0.9rem', color: '#10b981' }}>📝 Ejercicio de la Lección</h4>

                        <label>Consigna del ejercicio</label>
                        <textarea
                          value={manualLessonForm.exercisePrompt}
                          onChange={(e) => setManualLessonForm(prev => ({ ...prev, exercisePrompt: e.target.value }))}
                          placeholder="Instrucciones del ejercicio para el alumno..."
                          rows={4}
                          required
                        />

                        <label>Código inicial (base)</label>
                        <textarea
                          value={manualLessonForm.exerciseStarterCode}
                          onChange={(e) => setManualLessonForm(prev => ({ ...prev, exerciseStarterCode: e.target.value }))}
                          placeholder="Ej. function solucionar() {\n  \n}"
                          rows={3}
                          style={{ fontFamily: 'monospace' }}
                        />

                        <label>Código solución</label>
                        <textarea
                          value={manualLessonForm.exerciseSolutionCode}
                          onChange={(e) => setManualLessonForm(prev => ({ ...prev, exerciseSolutionCode: e.target.value }))}
                          placeholder="Ej. return total;"
                          rows={3}
                          style={{ fontFamily: 'monospace' }}
                        />

                        <h4 style={{ margin: '1.5rem 0 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', fontSize: '0.9rem', color: '#10b981' }}>🧪 Casos de Prueba</h4>
                        
                        {manualLessonForm.testCases.map((tc, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Caso #{idx + 1}</span>
                              {manualLessonForm.testCases.length > 1 && (
                                <button
                                  type="button"
                                  className="rbac-revoke-btn"
                                  style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                                  onClick={() => removeManualLessonTestCase(idx)}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <label style={{ fontSize: '0.75rem', marginTop: 0 }}>Entrada (input)</label>
                            <input
                              type="text"
                              value={tc.input}
                              onChange={(e) => handleManualLessonTestCaseChange(idx, 'input', e.target.value)}
                              placeholder='Ej. "hola" o vacío'
                              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', marginBottom: '0.5rem' }}
                            />
                            <label style={{ fontSize: '0.75rem', marginTop: 0 }}>Salida esperada</label>
                            <input
                              type="text"
                              value={tc.expectedOutput}
                              onChange={(e) => handleManualLessonTestCaseChange(idx, 'expectedOutput', e.target.value)}
                              placeholder="Ej. 123 o true"
                              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', marginBottom: 0 }}
                              required
                            />
                          </div>
                        ))}

                        <button
                          type="button"
                          className="rbac-btn-secondary"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', marginBottom: '1.5rem', border: '1px dashed rgba(255,255,255,0.15)' }}
                          onClick={addManualLessonTestCase}
                        >
                          + Agregar caso de prueba
                        </button>

                        <div className="ai-admin-actions" style={{ marginTop: '1rem' }}>
                          <button type="submit" disabled={validationLoading} style={{ width: '100%' }}>
                            {validationLoading ? 'Validando...' : 'Previsualizar y Validar'}
                          </button>
                        </div>
                      </form>
                    )}

                    {aiActiveTab === 'exercise' && (
                      <form className="ai-admin-form" onSubmit={handleManualSubmit}>
                        <label>Nombre del ejercicio</label>
                        <input
                          type="text"
                          value={manualExerciseForm.concept}
                          onChange={(e) => setManualExerciseForm(prev => ({ ...prev, concept: e.target.value }))}
                          placeholder="Ej. Suma de Elementos"
                          required
                        />

                        <label>Descripción del ejercicio</label>
                        <textarea
                          value={manualExerciseForm.prompt}
                          onChange={(e) => setManualExerciseForm(prev => ({ ...prev, prompt: e.target.value }))}
                          placeholder="Describe el reto a solucionar..."
                          rows={6}
                          required
                        />

                        <label>Código inicial (base)</label>
                        <textarea
                          value={manualExerciseForm.starterCode}
                          onChange={(e) => setManualExerciseForm(prev => ({ ...prev, starterCode: e.target.value }))}
                          placeholder="Ej. function solucionar() {\n  \n}"
                          rows={3}
                          style={{ fontFamily: 'monospace' }}
                        />

                        <label>Código solución</label>
                        <textarea
                          value={manualExerciseForm.solutionCode}
                          onChange={(e) => setManualExerciseForm(prev => ({ ...prev, solutionCode: e.target.value }))}
                          placeholder="Ej. return total;"
                          rows={3}
                          style={{ fontFamily: 'monospace' }}
                        />

                        <label>Lenguaje de programación</label>
                        <select
                          value={manualExerciseForm.languageId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualExerciseForm(prev => ({ ...prev, languageId: val }));
                            setManualLessonForm(prev => ({ ...prev, languageId: val }));
                            setExerciseForm(prev => ({ ...prev, languageId: val }));
                            setLessonForm(prev => ({ ...prev, languageId: val }));
                          }}
                        >
                          {JUDGE0_LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.icon} {t(option.labelKey)}
                            </option>
                          ))}
                        </select>

                        <label>Nivel de dificultad</label>
                        <select
                          value={manualExerciseForm.difficulty}
                          onChange={(e) => setManualExerciseForm(prev => ({ ...prev, difficulty: e.target.value }))}
                        >
                          <option value="easy">{t('admin.ai.difficulty.easy')}</option>
                          <option value="medium">{t('admin.ai.difficulty.medium')}</option>
                          <option value="hard">{t('admin.ai.difficulty.hard')}</option>
                        </select>

                        <h4 style={{ margin: '1.5rem 0 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', fontSize: '0.9rem', color: '#10b981' }}>🧪 Casos de Prueba</h4>

                        {manualExerciseForm.testCases.map((tc, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Caso #{idx + 1}</span>
                              {manualExerciseForm.testCases.length > 1 && (
                                <button
                                  type="button"
                                  className="rbac-revoke-btn"
                                  style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                                  onClick={() => removeManualExerciseTestCase(idx)}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <label style={{ fontSize: '0.75rem', marginTop: 0 }}>Entrada (input)</label>
                            <input
                              type="text"
                              value={tc.input}
                              onChange={(e) => handleManualExerciseTestCaseChange(idx, 'input', e.target.value)}
                              placeholder='Ej. "hola" o vacío'
                              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', marginBottom: '0.5rem' }}
                            />
                            <label style={{ fontSize: '0.75rem', marginTop: 0 }}>Salida esperada</label>
                            <input
                              type="text"
                              value={tc.expectedOutput}
                              onChange={(e) => handleManualExerciseTestCaseChange(idx, 'expectedOutput', e.target.value)}
                              placeholder="Ej. 123 o true"
                              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', marginBottom: 0 }}
                              required
                            />
                          </div>
                        ))}

                        <button
                          type="button"
                          className="rbac-btn-secondary"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', marginBottom: '1.5rem', border: '1px dashed rgba(255,255,255,0.15)' }}
                          onClick={addManualExerciseTestCase}
                        >
                          + Agregar caso de prueba
                        </button>

                        <div className="ai-admin-actions" style={{ marginTop: '1rem' }}>
                          <button type="submit" disabled={validationLoading} style={{ width: '100%' }}>
                            {validationLoading ? 'Validando...' : 'Previsualizar y Validar'}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>

              <div className="instructor-ai-preview-panel">
                <h3>� Vista previa del contenido</h3>
                <div className="instructor-ai-output-container" style={{ flex: 1, minHeight: 0 }}>
                  {aiActiveTab === 'lesson' && (
                    <GeneratedContentCard
                      type="lesson"
                      result={lessonResult}
                      title={lessonResult?.title || t('admin.ai.lesson.untitled')}
                      difficulty={creationMode === 'ai' ? lessonForm.level : manualLessonForm.level}
                      languageLabel={getLanguageLabel(creationMode === 'ai' ? lessonForm.languageId : manualLessonForm.languageId, t)}
                      monacoLanguage={monacoFromJudge0Id(creationMode === 'ai' ? lessonForm.languageId : manualLessonForm.languageId)}
                      model={creationMode === 'ai' ? lessonForm.model : 'manual'}
                      onSendToValidator={sendLessonToValidator}
                      onDiscard={() => setLessonResult(null)}
                      t={t}
                    />
                  )}
                  {aiActiveTab === 'exercise' && (
                    <GeneratedContentCard
                      type="exercise"
                      result={exerciseResult}
                      title={t('admin.ai.exercise.generatedTitle', { concept: (creationMode === 'ai' ? exerciseForm.concept : manualExerciseForm.concept) || t('admin.ai.exercise.title') })}
                      difficulty={creationMode === 'ai' ? exerciseForm.difficulty : manualExerciseForm.difficulty}
                      languageLabel={getLanguageLabel(creationMode === 'ai' ? exerciseForm.languageId : manualExerciseForm.languageId, t)}
                      monacoLanguage={monacoFromJudge0Id(creationMode === 'ai' ? exerciseForm.languageId : manualExerciseForm.languageId)}
                      model={creationMode === 'ai' ? exerciseForm.model : 'manual'}
                      onSendToValidator={sendExerciseToValidator}
                      onDiscard={() => setExerciseResult(null)}
                      t={t}
                    />
                  )}

                </div>
              </div>
            </div>
          </section>

          {/* Bloque 5: Validador */}
          <section ref={validatorRef} className="surface-main ai-admin-card--full">
            <div className="rbac-section-head">
              <h2>{t('admin.ai.validate.title')}</h2>
              <GuideButton type={GUIDE_TYPES.validator} onOpen={setActiveGuide} t={t} />
            </div>
            <p className="rbac-muted">{t('admin.ai.validate.hint')}</p>
            {validationSource === 'generated' && (
              <p className="ai-prefill-indicator">{t('admin.ai.validation.prefilled')}</p>
            )}

            <form className="ai-admin-form" onSubmit={handleValidationSubmit}>
              <label htmlFor="instructor-ai-content-validator">{t('admin.ai.field.content')}</label>
              <textarea
                ref={validationInputRef}
                id="instructor-ai-content-validator"
                rows={6}
                value={validationForm.content}
                onChange={handleValidationContentChange}
                placeholder={t('admin.ai.placeholder.content')}
              />

              <div className="ai-admin-actions">
                <Button type="submit" variant="blue" disabled={validationLoading}>
                  {validationLoading ? t('admin.ai.loading') : t('admin.ai.action.validate')}
                </Button>
              </div>
            </form>

            {validationError && <p className="ai-admin-error">{validationError}</p>}
            {validationResult ? (
              <MotionArticle
                className="ai-validation-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
              >
                <div className="ai-validation-score">
                  <div>
                    <span>{t('admin.ai.validation.score')}</span>
                    <strong>{validationScore}%</strong>
                  </div>
                  <div className="ai-progress-track">
                    <span
                      className={`ai-progress-fill ${getValidationProgressClass(validationScore)}`}
                      style={{ width: `${validationScore}%` }}
                    />
                  </div>
                </div>
                <div className={`ai-validation-state ${validationResult.approved ? 'is-approved' : 'is-rejected'}`}>
                  {validationResult.approved ? t('admin.ai.validation.approved') : t('admin.ai.validation.rejected')}
                </div>
                <section className="ai-validation-section">
                  <h3>{t('admin.ai.validation.observations')}</h3>
                  {Array.isArray(validationResult.issues) && validationResult.issues.length > 0 ? (
                    <ul>
                      {validationResult.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t('admin.ai.validation.noIssues')}</p>
                  )}
                </section>

                <div className="ai-validation-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
                  <div className="ai-admin-form" style={{ background: 'transparent', padding: 0 }}>
                    <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                      {t('instructor.myClasses') || 'Mis clases'}
                    </label>
                    <select
                      value={selectedClassId ? String(selectedClassId) : ''}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        if (Number.isInteger(value) && value > 0) {
                          handleLoadAnalytics(value)
                          return
                        }
                        setSelectedClassId(null)
                        setAnalytics(null)
                      }}
                      style={{ marginBottom: '0.75rem' }}
                    >
                      <option value="">{t('common.select') || 'Seleccionar clase...'}</option>
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                      {t('admin.ai.publish.selectTarget') || 'Publicar en ruta:'} ({t('common.optional') || 'opcional'})
                    </label>
                    <select
                      value={publishTargetPathId}
                      onChange={(e) => setPublishTargetPathId(e.target.value)}
                      style={{ marginBottom: 0 }}
                    >
                      <option value="">{t('common.select') || 'Sin ruta (auto)'}</option>
                      {analytics?.assigned_paths?.map(path => (
                        <option key={path.id} value={path.learning_path_id}>{path.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t('admin.ai.validation.validatedBy')} {validationResult.model || RECOMMENDED_MODEL}</span>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handlePublishValidatedContent}
                      disabled={publishingContent || !validationResult.approved || !selectedClassId}
                    >
                      {publishingContent ? '...' : t('admin.ai.action.publish') || 'Publicar a mi clase'}
                    </Button>
                  </div>
                </div>
              </MotionArticle>
            ) : (
              <p className="ai-admin-empty">{t('admin.ai.empty')}</p>
            )}
          </section>
        </div>
      </section>
      <GuideModal type={activeGuide} onClose={() => setActiveGuide(null)} t={t} />

      {showPathModal && (
        <MotionDiv
          className="instructor-confirm-overlay"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onMouseDown={() => setShowPathModal(false)}
        >
          <MotionDiv
            className="instructor-confirm-modal"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="instructor-confirm-icon">🚩</div>
            <h3>{t('instructor.action.assignPath') || 'Asignar Ruta'}</h3>
            <p>{t('instructor.assignPathHint') || 'Selecciona una ruta para asignar a esta clase.'}</p>

            <form onSubmit={handleAssignPath} style={{ width: '100%', marginTop: '1rem' }}>
              <div className="ai-admin-form" style={{ background: 'transparent', padding: 0 }}>
                <label>{t('admin.ai.publish.selectTarget') || 'Selecciona la ruta destino'}</label>
                <select
                  value={pathForm.pathId}
                  onChange={(e) => setPathForm(prev => ({ ...prev, pathId: e.target.value }))}
                  required
                >
                  <option value="">{t('common.select') || 'Seleccionar...'}</option>
                  {availablePaths.map((path) => (
                    <option key={path.id} value={path.id}>
                      {path.name} ({path.language_name} - {path.difficulty_level})
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem' }}>
                  <input
                    type="checkbox"
                    id="path-required-chk"
                    checked={pathForm.isRequired}
                    onChange={(e) => setPathForm(prev => ({ ...prev, isRequired: e.target.checked }))}
                    style={{ width: 'auto', marginBottom: 0 }}
                  />
                  <label htmlFor="path-required-chk" style={{ marginBottom: 0, cursor: 'pointer' }}>
                    {t('instructor.field.isRequired') || 'Es obligatorio'}
                  </label>
                </div>
              </div>

              <div className="instructor-confirm-actions" style={{ marginTop: '2rem' }}>
                <Button type="button" variant="slate" onClick={() => setShowPathModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={assigningPath}>
                  {assigningPath ? '...' : t('common.save')}
                </Button>
              </div>
            </form>
          </MotionDiv>
        </MotionDiv>
      )}
      </MotionPage>
    </SidebarLayout>
  )
}

export default InstructorDashboardPage

