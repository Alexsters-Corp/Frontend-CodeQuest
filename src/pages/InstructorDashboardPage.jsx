import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IoMdHelpCircleOutline } from 'react-icons/io'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import CodeViewer from '../components/CodeViewer'
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
} from '../services/rbacApi'
import { generateExercise, generateLesson, validateContent } from '../services/aiAdminApi'
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

function normalizeMonacoLanguage(language) {
  const normalized = String(language || '').trim().toLowerCase()
  const byName = {
    javascript: 'javascript',
    js: 'javascript',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    'c++': 'cpp',
    csharp: 'csharp',
    'c#': 'csharp',
  }
  return byName[normalized] || 'plaintext'
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

  const [selectedClassId, setSelectedClassId] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')

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

  const [lessonLoading, setLessonLoading] = useState(false)
  const [exerciseLoading, setExerciseLoading] = useState(false)
  const [validationLoading, setValidationLoading] = useState(false)

  const [lessonError, setLessonError] = useState('')
  const [exerciseError, setExerciseError] = useState('')
  const [validationError, setValidationError] = useState('')

  const [lessonResult, setLessonResult] = useState(null)
  const [exerciseResult, setExerciseResult] = useState(null)
  const [validationResult, setValidationResult] = useState(null)

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

  useEffect(() => {
    loadData()
  }, [loadData])

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
    if (!window.confirm(t('instructor.confirmRevoke'))) return
    setRevokingInvite(true)
    try {
      await revokeClassInvite(inviteId)
      notifySuccess(t('instructor.revokeSuccess'))
      await loadData()
    } catch (requestError) {
      notifyError(requestError.message || t('instructor.revokeError'))
    } finally {
      setRevokingInvite(false)
    }
  }

  async function handleRotateCode(classId) {
    if (!window.confirm(t('instructor.confirmRotate'))) return
    setRotatingCode(true)
    try {
      const result = await rotateClassCode(classId)
      notifySuccess(t('instructor.rotateSuccess', { code: result.invite.code }))
      await loadData()
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
    if (!window.confirm(t('instructor.confirmDeleteClass') || '¿Estás seguro de que deseas eliminar esta clase?')) return
    try {
      await deleteInstructorClass(classId)
      notifySuccess(t('instructor.deleteSuccess') || 'Clase eliminada con éxito')
      if (Number(selectedClassId) === Number(classId)) {
        setSelectedClassId(null)
        setAnalytics(null)
      }
      await loadData()
    } catch (error) {
      notifyError(error.message || 'Error al eliminar la clase')
    }
  }

  async function handleKickStudent(studentId) {
    if (!window.confirm(t('instructor.confirmKickStudent') || '¿Estás seguro de que deseas expulsar a este alumno?')) return
    try {
      await kickStudentFromClass({ classId: selectedClassId, studentId })
      notifySuccess(t('instructor.kickSuccess') || 'Alumno expulsado con éxito')
      // Recargar analytics para actualizar la lista de alumnos
      const payload = await getClassAnalytics(selectedClassId)
      setAnalytics(payload)
    } catch (error) {
      notifyError(error.message || 'Error al expulsar al alumno')
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

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar title={t('instructor.title')} hideActions />

      <section className="rbac-page instructor-v3">
        <div className="rbac-header" style={{ marginBottom: '2rem' }}>
          <div>
            <p className="rbac-kicker">Panel de Control</p>
            <h1>Gestión Académica e IA</h1>
            <p className="rbac-subtitle">Administra tus grupos, supervisa el progreso de tus alumnos y genera contenido con inteligencia artificial.</p>
          </div>
        </div>

        <div className="instructor-3-blocks-grid">
          {/* Bloque 1: Mis Clases */}
          <section ref={classesRef} className="rbac-card block-classes">
            <div className="rbac-section-head">
              <h2>📚 {t('instructor.myClasses')}</h2>
              <button className="rbac-btn-refresh" type="button" onClick={loadData} disabled={loading}>↻</button>
            </div>
            <p className="rbac-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Crea grupos para organizar a tus estudiantes y generar códigos de acceso únicos.</p>

            <form className="rbac-form-compact" onSubmit={handleCreateClass}>
              <input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder={t('instructor.classNamePlaceholder')}
                disabled={creatingClass}
              />
              <button type="submit" disabled={creatingClass || !newClassName.trim()} title={t('instructor.createClass')}>
                {creatingClass ? '...' : '+'}
              </button>
            </form>

            <div className="class-list-container">
              {loading && !classes.length ? (
                <p className="rbac-loading-text">{t('common.loading')}</p>
              ) : classes.length === 0 ? (
                <div className="rbac-empty-state-centered" style={{ padding: '2rem 1rem' }}>
                  <div className="empty-icon" style={{ fontSize: '2rem' }}>🎓</div>
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
                      <span>{Number(item.students_total || 0)} {t('instructor.students')}</span>
                    </div>
                    <div className="class-row-actions">
                      <button 
                        type="button" 
                        className="rbac-icon-btn" 
                        onClick={(e) => { e.stopPropagation(); handleGenerateInvite(item.id) }} 
                        disabled={generatingInvite} 
                        title={t('instructor.generateCode')}
                      >
                        🔑
                      </button>
                      <button 
                        type="button" 
                        className={`rbac-icon-btn ${Number(selectedClassId) === Number(item.id) ? 'active' : ''}`} 
                        onClick={(e) => { e.stopPropagation(); handleLoadAnalytics(item.id) }} 
                        title={t('instructor.classSettings') || 'Configuración de clase'}
                      >
                        ⚙️
                      </button>
                      <button 
                        type="button" 
                        className="rbac-icon-btn rbac-btn-danger" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteClass(item.id) }} 
                        title={t('instructor.deleteClass') || 'Eliminar clase'}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Bloque 2: Estudiantes */}
          <section ref={studentsRef} className="rbac-card block-students">
            <div className="rbac-section-head">
              <h2>👤 {selectedClass ? t('instructor.analyticsOf', { name: selectedClass.name }) : t('instructor.students')}</h2>
              {selectedClass && (
                <div className="rbac-actions-inline" style={{ margin: 0 }}>
                  <button 
                    type="button" 
                    className="rbac-icon-btn" 
                    onClick={() => startEditing(selectedClass)} 
                    title={t('instructor.editClass')}
                  >
                    ✏️
                  </button>
                  <button 
                    type="button" 
                    className="rbac-icon-btn" 
                    onClick={() => handleRotateCode(selectedClassId)} 
                    disabled={rotatingCode} 
                    title={t('instructor.rotateCode')}
                  >
                    🔄
                  </button>
                  <button 
                    type="button" 
                    className="rbac-icon-btn rbac-btn-danger" 
                    onClick={() => handleDeleteClass(selectedClassId)} 
                    title={t('instructor.deleteClass')}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
            <p className="rbac-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Visualiza el rendimiento detallado, XP acumulada y progreso de cada integrante de tu clase.</p>

            {editingClassId && selectedClass && (
              <div className="rbac-edit-overlay-inline">
                <form className="inline-edit-form" onSubmit={handleUpdateClass} style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--cq-border)' }}>
                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <input 
                      value={editClassName} 
                      onChange={(e) => setEditClassName(e.target.value)} 
                      placeholder={t('instructor.classNamePlaceholder')}
                      autoFocus 
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button type="submit" disabled={updatingClass} className="rbac-btn-success" style={{ padding: '0 15px', marginTop: 0 }}>
                      {updatingClass ? '...' : t('common.save') || 'Guardar'}
                    </button>
                    <button type="button" onClick={() => setEditingClassId(null)} className="rbac-btn-secondary" style={{ padding: '0 15px', marginTop: 0 }}>
                      {t('common.cancel') || 'Cancelar'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            {!selectedClass ? (
              <div className="rbac-empty-state-centered">
                <div className="empty-icon">👥</div>
                <p>{t('instructor.noClassSelected')}</p>
                <small style={{ marginTop: '8px', opacity: 0.7 }}>Selecciona una clase a la izquierda para ver el progreso</small>
              </div>
            ) : analyticsLoading ? (
              <div className="rbac-loading-text" style={{ padding: '4rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p>{t('instructor.loadingAnalytics')}</p>
              </div>
            ) : analytics ? (
              <div className="students-detail-view">
                <div className="rbac-mini-metrics-row">
                  <article className="mini-metric-pill"><small>{t('instructor.metric.activeStudents')}</small><strong>{Number(analytics.summary?.students_total || 0)}</strong></article>
                  <article className="mini-metric-pill"><small>{t('instructor.metric.avgSignal')}</small><strong>{Number(analytics.summary?.progress_signal_avg || 0)}%</strong></article>
                </div>
                <div className="rbac-table-wrap">
                  <table className="rbac-table compact">
                    <thead><tr><th>{t('instructor.table.student')}</th><th className="rbac-center">{t('instructor.table.xp')}</th><th className="rbac-center">{t('common.actions') || 'Acciones'}</th></tr></thead>
                    <tbody>
                      {analytics.students?.length > 0 ? analytics.students.map((s) => (
                        <tr key={s.id}>
                          <td><div className="student-compact-cell"><div className="student-initial">{(s.name || 'U')[0]}</div><div className="student-name-email"><strong>{s.name}</strong><small>{s.email}</small></div></div></td>
                          <td className="rbac-center"><span className="xp-badge">✨ {Number(s.earned_xp || 0)}</span></td>
                          <td className="rbac-center">
                            <button 
                              type="button" 
                              className="rbac-revoke-btn" 
                              onClick={() => handleKickStudent(s.id)} 
                              title={t('instructor.kickStudent') || 'Expulsar alumno'}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan={3} className="rbac-center rbac-muted" style={{ padding: '3rem' }}>{t('instructor.noActiveStudents')}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <p className="rbac-error">{analyticsError}</p>}
          </section>

          <section ref={invitesRef} className="rbac-card block-invites">
            <h2>🎟️ {t('instructor.invitations')}</h2>
            <p className="rbac-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Gestiona los códigos activos, revoca accesos o consulta cuántas veces ha sido usado cada enlace.</p>
            <div className="invites-compact-list">
              {loading && !invites.length ? (
                <p className="rbac-loading-text">{t('common.loading')}</p>
              ) : invites.length === 0 ? (
                <div className="rbac-empty-state-centered" style={{ padding: '1.5rem 1rem' }}>
                  <p style={{ fontSize: '0.85rem' }}>{t('instructor.noInvitations')}</p>
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
                        <button 
                          type="button" 
                          className="rbac-revoke-btn" 
                          onClick={() => handleRevokeInvite(inv.id)} 
                          disabled={revokingInvite} 
                          title={t('instructor.revokeCode')}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Bloque 4: IA */}
          <section ref={aiRef} className="rbac-card block-ai-tools">
            <div className="instructor-ai-header">
              <div>
                <h2>🤖 {t('instructor.aiTools')}</h2>
                <p className="rbac-muted" style={{ margin: 0 }}>{t('instructor.aiToolsHint')}</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="instructor-ai-tabs" role="tablist" aria-label={t('instructor.aiTools')}>
                  <button type="button" className={aiActiveTab === 'lesson' ? 'active' : ''} onClick={() => setAiActiveTab('lesson')}>
                    {t('admin.ai.lesson.title')}
                  </button>
                  <button type="button" className={aiActiveTab === 'exercise' ? 'active' : ''} onClick={() => setAiActiveTab('exercise')}>
                    {t('admin.ai.exercise.title')}
                  </button>
                </div>
                <GuideButton type={aiActiveTab === 'lesson' ? GUIDE_TYPES.lesson : GUIDE_TYPES.exercise} onOpen={setActiveGuide} t={t} />
              </div>
            </div>

            <div className="instructor-ai-main-layout">
              <div className="instructor-ai-controls">
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
                      onChange={(event) => setLessonForm((previous) => ({ ...previous, languageId: event.target.value }))}
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
                      onChange={(event) => setLessonForm((previous) => ({ ...previous, level: event.target.value }))}
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
                      onChange={(event) => setExerciseForm((previous) => ({ ...previous, difficulty: event.target.value }))}
                    >
                      <option value="easy">{t('admin.ai.difficulty.easy')}</option>
                      <option value="medium">{t('admin.ai.difficulty.medium')}</option>
                      <option value="hard">{t('admin.ai.difficulty.hard')}</option>
                    </select>

                    <label htmlFor="instructor-ai-language-id">{t('admin.ai.field.languageId')}</label>
                    <select
                      id="instructor-ai-language-id"
                      value={exerciseForm.languageId}
                      onChange={(event) => setExerciseForm((previous) => ({ ...previous, languageId: event.target.value }))}
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


              </div>

              <div className="instructor-ai-preview-panel">
                <h3>� Vista previa del contenido</h3>
                <div className="instructor-ai-output-container" style={{ flex: 1, minHeight: 0 }}>
                  {aiActiveTab === 'lesson' && (
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
                  {aiActiveTab === 'exercise' && (
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

                </div>
              </div>
            </div>
          </section>

          {/* Bloque 5: Validador */}
          <section ref={validatorRef} className="rbac-card ai-admin-card--full">
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
                <button type="submit" disabled={validationLoading}>
                  {validationLoading ? t('admin.ai.loading') : t('admin.ai.action.validate')}
                </button>
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
                    <strong>85%</strong>
                  </div>
                  <div className="ai-progress-track">
                    <span className="ai-progress-fill ai-progress-fill--success" style={{ width: '85%' }} />
                  </div>
                </div>
                <div className="ai-validation-state is-approved">
                  {t('admin.ai.validation.approved')}
                </div>
              </MotionArticle>
            ) : (
              <p className="ai-admin-empty">{t('admin.ai.empty')}</p>
            )}
          </section>
        </div>
      </section>
      <GuideModal type={activeGuide} onClose={() => setActiveGuide(null)} t={t} />
      </MotionPage>
    </SidebarLayout>
  )
}

export default InstructorDashboardPage
