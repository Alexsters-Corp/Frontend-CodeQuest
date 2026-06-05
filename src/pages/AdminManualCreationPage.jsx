import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IoMdHelpCircleOutline } from 'react-icons/io'
import CodeViewer from '../components/CodeViewer'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { listPublishTargets, publishContent, validateContent } from '../services/aiAdminApi'
import { JUDGE0_LANGUAGE_OPTIONS, getAiLanguageLabel, getJudge0LanguageOption, getMonacoFromJudge0Id, sortPublishTargetPaths } from '../utils/aiToolOptions'
import { notifyError, notifySuccess } from '../utils/notify'

const MotionArticle = motion.article
const MotionDiv = motion.div
const AI_MODEL_LABEL = 'manual-admin'

const GUIDE_TYPES = Object.freeze({
  lessonManual: 'lessonManual',
  exerciseManual: 'exerciseManual',
  validator: 'validator',
})


function formatJson(payload) {
  if (!payload) return ''
  return JSON.stringify(payload, null, 2)
}

function normalizeDifficultyLevel(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'easy') return 'beginner'
  if (normalized === 'medium') return 'intermediate'
  if (normalized === 'hard') return 'advanced'
  return ['beginner', 'intermediate', 'advanced'].includes(normalized) ? normalized : 'beginner'
}

function normalizeScore(value) {
  const rawValue = value && typeof value === 'object' ? value.score ?? value.qualityScore ?? value.value : value
  const numeric = Number(rawValue)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric)))
}

function scoreTone(score) {
  if (score < 60) return 'danger'
  if (score < 80) return 'warning'
  return 'success'
}

function getTargetPathsForLanguage(targets, languageId) {
  const target = targets.find((item) => Number(item.judge0LanguageId) === Number(languageId))
  return sortPublishTargetPaths(target?.paths || [])
}

function normalizePublishTargetId(value) {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

// Reusable Components
function LanguageSelect({ value, onChange, t }) {
  const selected = getJudge0LanguageOption(value)

  return (
    <div className="ai-language-select">
      <span className="ai-language-select__logo" aria-hidden="true">
        <img src={selected.logo} alt="" loading="lazy" />
      </span>
      <select value={value} onChange={onChange}>
        {JUDGE0_LANGUAGE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.id} - {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  )
}

function GeneratedContentCard({ type, result, title, difficulty, languageLabel, monacoLanguage, onSendToValidator, onDiscard, t }) {
  if (!result) return null
  const isLesson = type === 'lesson'
  const normalizedDifficulty = normalizeDifficultyLevel(difficulty)
  const exercise = isLesson ? (result.exercise || {}) : result
  const theoryParagraphs = String(result.theory || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  return (
    <MotionArticle className="ai-result-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <header className="ai-result-card__header">
        <span className="ai-model-badge">{t('admin.ai.generatedBy')} · Manual</span>
        <h2>{title}</h2>
        <span className={`ai-level-badge ai-level-badge--${normalizedDifficulty}`}>{t(`admin.ai.level.${normalizedDifficulty}`)}</span>
        {languageLabel && <span className="ai-language-badge">{languageLabel}</span>}
      </header>
      {isLesson && (
        <>
          <section className="ai-result-section">
            <h3>{t('admin.ai.output.theory')}</h3>
            {theoryParagraphs.length > 0 ? theoryParagraphs.map(p => <p key={p}>{p}</p>) : <p>{t('admin.ai.output.noTheory')}</p>}
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
      <div className="ai-result-actions">
        <button type="button" onClick={() => onSendToValidator(result)}>{t('admin.ai.action.sendToValidator')}</button>
        <button type="button" className="ai-secondary-btn" onClick={onDiscard}>{t('admin.ai.action.discard')}</button>
      </div>
    </MotionArticle>
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
  if (!type) return null
  const items = t(`admin.ai.guide.${type}.items`)
  return (
    <MotionDiv className="ai-guide-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onMouseDown={onClose}>
      <MotionDiv className="ai-guide-modal__panel" onMouseDown={e => e.stopPropagation()}>
        <header>
          <h2>{t(`admin.ai.guide.${type}.title`)}</h2>
          <button type="button" className="ai-guide-modal__close" onClick={onClose}>{t('admin.ai.guide.close')}</button>
        </header>
        <ol>{(Array.isArray(items) ? items : []).map(item => <li key={item}>{item}</li>)}</ol>
      </MotionDiv>
    </MotionDiv>
  )
}

function ValidationResultCard({ result, onEdit, onPublish, publishing, publishBlockedReason, publishStatus, t }) {
  if (!result) return null
  const score = normalizeScore(result.qualityScore)
  const tone = scoreTone(score)
  const issues = Array.isArray(result.issues) ? result.issues : []

  return (
    <MotionArticle className="ai-validation-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="ai-validation-score">
        <div><span>{t('admin.ai.validation.score')}</span><strong>{score}%</strong></div>
        <div className="ai-progress-track"><span className={`ai-progress-fill ai-progress-fill--${tone}`} style={{ width: `${score}%` }} /></div>
      </div>
      <div className={`ai-validation-state ${result.approved ? 'is-approved' : 'is-rejected'}`}>
        {result.approved ? t('admin.ai.validation.approved') : t('admin.ai.validation.rejected')}
      </div>
      <section className="ai-validation-section">
        <h3>{t('admin.ai.validation.observations')}</h3>
        {issues.length > 0 ? <ul>{issues.map(i => <li key={i}>{i}</li>)}</ul> : <p>{t('admin.ai.validation.noIssues')}</p>}
      </section>
      <footer className="ai-validation-footer">
        <span>{t('admin.ai.validation.validatedBy')} · {result.modelUsed || AI_MODEL_LABEL}</span>
        <div className="ai-result-actions">
          <button type="button" onClick={onPublish} disabled={publishing} className={publishBlockedReason ? 'ai-publish-btn--blocked' : ''} title={publishBlockedReason || ''}>x</button>
          <button type="button" className="ai-secondary-btn" onClick={onEdit}>{t('admin.ai.action.edit')}</button>
        </div>
      </footer>
      {publishStatus && (
        <p className={`ai-publish-status ai-publish-status--${publishStatus.type}`}>
          {publishStatus.message}
        </p>
      )}
    </MotionArticle>
  )
}

function AdminManualCreationPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const validatorRef = useRef(null)
  const validationInputRef = useRef(null)

  const [activeGuide, setActiveGuide] = useState(null)
  const [publishTargets, setPublishTargets] = useState([])
  const [publishTargetsLoading, setPublishTargetsLoading] = useState(false)

  // Form states
  const [manualLessonForm, setManualLessonForm] = useState({
    title: '', theory: '', codeExample: '', languageId: '63', level: 'beginner',
    exercisePrompt: '', exerciseStarterCode: '', exerciseSolutionCode: '',
    publishTargetPathId: '',
    testCases: [{ input: '', expectedOutput: '' }]
  })

  const [manualExerciseForm, setManualExerciseForm] = useState({
    concept: '', difficulty: 'medium', languageId: '63', prompt: '',
    starterCode: '', solutionCode: '', publishTargetPathId: '',
    testCases: [{ input: '', expectedOutput: '' }]
  })

  // Validation & Result states
  const [lessonResult, setLessonResult] = useState(null)
  const [exerciseResult, setExerciseResult] = useState(null)
  const [validationForm, setValidationForm] = useState({ content: '' })
  const [validationSource, setValidationSource] = useState('manual')
  const [validationContext, setValidationContext] = useState(null)
  const [validationLoading, setValidationLoading] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [publishingContent, setPublishingContent] = useState(false)
  const [publishStatus, setPublishStatus] = useState(null)

  const lessonTargetPaths = useMemo(() => getTargetPathsForLanguage(publishTargets, manualLessonForm.languageId), [manualLessonForm.languageId, publishTargets])
  const exerciseTargetPaths = useMemo(() => getTargetPathsForLanguage(publishTargets, manualExerciseForm.languageId), [manualExerciseForm.languageId, publishTargets])

  useEffect(() => {
    async function loadTargets() {
      setPublishTargetsLoading(true)
      try {
        const payload = await listPublishTargets()
        setPublishTargets(Array.isArray(payload.languages) ? payload.languages : [])
      } catch (error) {
        notifyError(error.message || t('admin.ai.publish.targetsError'))
      } finally {
        setPublishTargetsLoading(false)
      }
    }
    loadTargets()
  }, [t])

  // Handlers para casos de prueba manuales
  function handleManualLessonTestCaseChange(index, field, value) {
    setManualLessonForm(prev => {
      const newCases = [...prev.testCases]
      newCases[index] = { ...newCases[index], [field]: value }
      return { ...prev, testCases: newCases }
    })
  }

  function addManualLessonTestCase() {
    setManualLessonForm(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '' }]
    }))
  }

  function removeManualLessonTestCase(index) {
    setManualLessonForm(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index)
    }))
  }

  function handleManualExerciseTestCaseChange(index, field, value) {
    setManualExerciseForm(prev => {
      const newCases = [...prev.testCases]
      newCases[index] = { ...newCases[index], [field]: value }
      return { ...prev, testCases: newCases }
    })
  }

  function addManualExerciseTestCase() {
    setManualExerciseForm(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '' }]
    }))
  }

  function removeManualExerciseTestCase(index) {
    setManualExerciseForm(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index)
    }))
  }

  const handleManualLessonSubmit = (e) => {
    e.preventDefault()
    if (!manualLessonForm.publishTargetPathId) return notifyError(t('admin.ai.publish.targetRequired'))
    const payload = {
      title: manualLessonForm.title,
      theory: manualLessonForm.theory,
      codeExample: manualLessonForm.codeExample,
      exercise: {
        prompt: manualLessonForm.exercisePrompt,
        starterCode: manualLessonForm.exerciseStarterCode,
        solutionCode: manualLessonForm.exerciseSolutionCode,
        testCases: manualLessonForm.testCases,
      }
    }
    setLessonResult(payload)
    sendToValidator(payload, 'lesson')
  }

  const handleManualExerciseSubmit = (e) => {
    e.preventDefault()
    if (!manualExerciseForm.publishTargetPathId) return notifyError(t('admin.ai.publish.targetRequired'))
    const payload = {
      prompt: manualExerciseForm.prompt,
      starterCode: manualExerciseForm.starterCode,
      solutionCode: manualExerciseForm.solutionCode,
      testCases: manualExerciseForm.testCases,
    }
    setExerciseResult(payload)
    sendToValidator(payload, 'exercise')
  }

  const sendToValidator = (payload, type) => {
    setValidationForm({ content: formatJson(payload) })
    setValidationSource('generated')
    setValidationContext({
      type,
      languageId: type === 'lesson' ? manualLessonForm.languageId : manualExerciseForm.languageId,
      level: type === 'lesson' ? manualLessonForm.level : normalizeDifficultyLevel(manualExerciseForm.difficulty),
      learningPathId: normalizePublishTargetId(type === 'lesson' ? manualLessonForm.publishTargetPathId : manualExerciseForm.publishTargetPathId),
      publishTargetMode: type === 'lesson' ? manualLessonForm.publishTargetPathId : manualExerciseForm.publishTargetPathId,
    })
    setValidationResult(null)
    setPublishStatus(null)
    notifySuccess(t('admin.ai.sentToValidator'))
    window.setTimeout(() => validatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleValidationSubmit = async (e) => {
    e.preventDefault()
    if (!validationForm.content.trim()) return notifyError(t('admin.ai.error.contentRequired'))
    setValidationLoading(true)
    try {
      const payload = await validateContent(validationForm)
      setValidationResult(payload)
      notifySuccess(t('admin.ai.success.validate'))
    } catch (error) {
      notifyError(error.message || t('admin.ai.error.validate'))
    } finally {
      setValidationLoading(false)
    }
  }

  const handlePublish = async () => {
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
      setPublishStatus({ type: 'success', message: t('admin.ai.publish.inlineSuccess', { id: payload.lessonId || '', path: payload.learningPathName || '', position: payload.orderPosition || '' }) })
      notifySuccess(t('admin.ai.publish.success'))
      setValidationResult(null)
      setValidationForm({ content: '' })
      setLessonResult(null)
      setExerciseResult(null)
    } catch (error) {
      setPublishStatus({ type: 'error', message: error.message || t('admin.ai.publish.error') })
      notifyError(error.message || t('admin.ai.publish.error'))
    } finally {
      setPublishingContent(false)
    }
  }

  const validationScore = normalizeScore(validationResult?.qualityScore)
  const publishBlockedReason = useMemo(() => {
    if (!validationResult) return ''
    if (!validationContext) return t('admin.ai.publish.generatedOnly')
    if (!validationContext.learningPathId) return t('admin.ai.publish.targetRequired')
    if (!validationResult.approved || validationScore < 80) return t('admin.ai.validation.publishDisabled')
    return ''
  }, [t, validationContext, validationResult, validationScore])

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
                <GuideButton type={GUIDE_TYPES.lessonManual} onOpen={setActiveGuide} t={t} />
              </div>
              <p className="rbac-muted">{t('admin.ai.lesson.hint')}</p>

              <form className="ai-admin-form" style={{ marginTop: '1.5rem' }} onSubmit={handleManualLessonSubmit}>
                <label>{t('admin.ai.manual.lessonTitle')}</label>
                <input type="text" value={manualLessonForm.title} onChange={e => setManualLessonForm(p => ({ ...p, title: e.target.value }))} placeholder={t('admin.ai.manual.lessonTitlePlaceholder')} required />

                <label>{t('admin.ai.manual.theory')}</label>
                <textarea value={manualLessonForm.theory} onChange={e => setManualLessonForm(p => ({ ...p, theory: e.target.value }))} placeholder={t('admin.ai.manual.theoryPlaceholder')} rows={8} required />

                <label>{t('admin.ai.manual.codeExample')}</label>
                <textarea value={manualLessonForm.codeExample} onChange={e => setManualLessonForm(p => ({ ...p, codeExample: e.target.value }))} placeholder="Ej. if (x > 0) { ... }" rows={4} style={{ fontFamily: 'monospace' }} />

                <label>Lenguaje</label>
                <LanguageSelect value={manualLessonForm.languageId} onChange={e => setManualLessonForm(p => ({ ...p, languageId: e.target.value, publishTargetPathId: '' }))} t={t} />

                <label>{t('admin.ai.field.difficulty')}</label>
                <select value={manualLessonForm.level} onChange={e => setManualLessonForm(p => ({ ...p, level: e.target.value, publishTargetPathId: '' }))}>
                  <option value="beginner">{t('admin.ai.level.beginner')}</option>
                  <option value="intermediate">{t('admin.ai.level.intermediate')}</option>
                  <option value="advanced">{t('admin.ai.level.advanced')}</option>
                </select>

                <label>{t('admin.ai.field.publishTarget')}</label>
                <select value={manualLessonForm.publishTargetPathId} onChange={e => setManualLessonForm(p => ({ ...p, publishTargetPathId: e.target.value }))} disabled={publishTargetsLoading}>
                  <option value="" disabled hidden>{publishTargetsLoading ? t('admin.ai.publish.loadingTargets') : t('admin.ai.publish.selectTarget')}</option>
                  {lessonTargetPaths.map(path => <option key={path.id} value={path.id}>{path.name} - {path.difficultyLevel}</option>)}
                </select>

                <h4 style={{ margin: '1.5rem 0 0.5rem', color: '#10b981' }}>{t('admin.ai.manual.exerciseSection')}</h4>
                <label>{t('admin.ai.manual.exercisePrompt')}</label>
                <textarea value={manualLessonForm.exercisePrompt} onChange={e => setManualLessonForm(p => ({ ...p, exercisePrompt: e.target.value }))} placeholder={t('admin.ai.manual.exercisePromptPlaceholder')} rows={3} required />

                <label>{t('admin.ai.manual.baseCode')}</label>
                <textarea value={manualLessonForm.exerciseStarterCode} onChange={e => setManualLessonForm(p => ({ ...p, exerciseStarterCode: e.target.value }))} placeholder="Ej. function solution() { ... }" rows={3} style={{ fontFamily: 'monospace' }} />

                <label>{t('admin.ai.manual.solutionCode')}</label>
                <textarea value={manualLessonForm.exerciseSolutionCode} onChange={e => setManualLessonForm(p => ({ ...p, exerciseSolutionCode: e.target.value }))} placeholder={t('admin.ai.manual.solutionPlaceholder')} rows={3} style={{ fontFamily: 'monospace' }} />

                <h4 style={{ margin: '1.5rem 0 0.5rem', color: '#10b981' }}>{t('admin.ai.manual.testCases')}</h4>
                {manualLessonForm.testCases.map((tc, idx) => (
                  <div key={idx} className="manual-test-case">
                    <div className="manual-test-case__header">
                      <span>Caso #{idx + 1}</span>
                      <button type="button" className="rbac-revoke-btn" onClick={() => removeManualLessonTestCase(idx)}>x</button>
                    </div>
                    <div className="manual-test-case__grid">
                      <label>
                        <span>Input</span>
                        <input type="text" value={tc.input} onChange={e => handleManualLessonTestCaseChange(idx, 'input', e.target.value)} placeholder='Ej. "hola" o vacio' />
                      </label>
                      <label>
                        <span>Expected Output</span>
                        <input type="text" value={tc.expectedOutput} onChange={e => handleManualLessonTestCaseChange(idx, 'expectedOutput', e.target.value)} placeholder="Salida esperada" required />
                      </label>
                    </div>
                  </div>
                ))}

                <button type="button" className="rbac-btn-secondary" style={{ width: '100%', marginBottom: '1.5rem', border: '1px dashed rgba(255,255,255,0.15)' }} onClick={addManualLessonTestCase}>{t('admin.ai.manual.addTestCase')}</button>

                <div className="ai-admin-actions">
                  <button type="submit" style={{ width: '100%' }}>{t('admin.ai.manual.previewValidate')}</button>
                </div>
              </form>

              <GeneratedContentCard
                type="lesson"
                result={lessonResult}
                title={lessonResult?.title || t('admin.ai.lesson.untitled')}
                difficulty={manualLessonForm.level}
                languageLabel={getAiLanguageLabel(manualLessonForm.languageId, t)}
                monacoLanguage={getMonacoFromJudge0Id(manualLessonForm.languageId)}
                onSendToValidator={() => sendToValidator(lessonResult, 'lesson')}
                onDiscard={() => setLessonResult(null)}
                t={t}
              />
            </section>

            <section className="rbac-card">
              <div className="rbac-section-head">
                <h2>{t('admin.ai.exercise.title')}</h2>
                <GuideButton type={GUIDE_TYPES.exerciseManual} onOpen={setActiveGuide} t={t} />
              </div>
              <p className="rbac-muted">{t('admin.ai.exercise.hint')}</p>

              <form className="ai-admin-form" style={{ marginTop: '1.5rem' }} onSubmit={handleManualExerciseSubmit}>
                <label>{t('admin.ai.manual.challenge')}</label>
                <input type="text" value={manualExerciseForm.concept} onChange={e => setManualExerciseForm(p => ({ ...p, concept: e.target.value }))} placeholder={t('admin.ai.manual.challengePlaceholder')} required />

                <label>{t('admin.ai.manual.detailedDescription')}</label>
                <textarea value={manualExerciseForm.prompt} onChange={e => setManualExerciseForm(p => ({ ...p, prompt: e.target.value }))} placeholder={t('admin.ai.manual.problemPlaceholder')} rows={6} required />

                <label>{t('admin.ai.manual.baseCode')}</label>
                <textarea value={manualExerciseForm.starterCode} onChange={e => setManualExerciseForm(p => ({ ...p, starterCode: e.target.value }))} placeholder="Ej. function reverse(s) { ... }" rows={4} style={{ fontFamily: 'monospace' }} />

                <label>{t('admin.ai.manual.solutionCode')}</label>
                <textarea value={manualExerciseForm.solutionCode} onChange={e => setManualExerciseForm(p => ({ ...p, solutionCode: e.target.value }))} placeholder={t('admin.ai.manual.solutionPlaceholder')} rows={4} style={{ fontFamily: 'monospace' }} />

                <label>Lenguaje</label>
                <LanguageSelect value={manualExerciseForm.languageId} onChange={e => setManualExerciseForm(p => ({ ...p, languageId: e.target.value, publishTargetPathId: '' }))} t={t} />

                <label>{t('admin.ai.field.difficulty')}</label>
                <select value={manualExerciseForm.difficulty} onChange={e => setManualExerciseForm(p => ({ ...p, difficulty: e.target.value, publishTargetPathId: '' }))}>
                  <option value="easy">{t('admin.ai.difficulty.easy')}</option>
                  <option value="medium">{t('admin.ai.difficulty.medium')}</option>
                  <option value="hard">{t('admin.ai.difficulty.hard')}</option>
                </select>

                <label>{t('admin.ai.field.publishTarget')}</label>
                <select value={manualExerciseForm.publishTargetPathId} onChange={e => setManualExerciseForm(p => ({ ...p, publishTargetPathId: e.target.value }))} disabled={publishTargetsLoading}>
                  <option value="" disabled hidden>{publishTargetsLoading ? t('admin.ai.publish.loadingTargets') : t('admin.ai.publish.selectTarget')}</option>
                  {exerciseTargetPaths.map(path => <option key={path.id} value={path.id}>{path.name} - {path.difficultyLevel}</option>)}
                </select>

                <h4 style={{ margin: '1.5rem 0 0.5rem', color: '#10b981' }}>{t('admin.ai.manual.testCases')}</h4>
                {manualExerciseForm.testCases.map((tc, idx) => (
                  <div key={idx} className="manual-test-case">
                    <div className="manual-test-case__header">
                      <span>Caso #{idx + 1}</span>
                      <button type="button" className="rbac-revoke-btn" onClick={() => removeManualExerciseTestCase(idx)}>x</button>
                    </div>
                    <div className="manual-test-case__grid">
                      <label>
                        <span>Input</span>
                        <input type="text" value={tc.input} onChange={e => handleManualExerciseTestCaseChange(idx, 'input', e.target.value)} placeholder='Ej. "hola" o vacio' />
                      </label>
                      <label>
                        <span>Expected Output</span>
                        <input type="text" value={tc.expectedOutput} onChange={e => handleManualExerciseTestCaseChange(idx, 'expectedOutput', e.target.value)} placeholder="Salida esperada" required />
                      </label>
                    </div>
                  </div>
                ))}

                <button type="button" className="rbac-btn-secondary" style={{ width: '100%', marginBottom: '1.5rem', border: '1px dashed rgba(255,255,255,0.15)' }} onClick={addManualExerciseTestCase}>{t('admin.ai.manual.addTestCase')}</button>

                <div className="ai-admin-actions">
                  <button type="submit" style={{ width: '100%' }}>{t('admin.ai.manual.previewValidate')}</button>
                </div>
              </form>

              <GeneratedContentCard
                type="exercise"
                result={exerciseResult}
                title={t('admin.ai.exercise.generatedTitle', { concept: manualExerciseForm.concept || t('admin.ai.exercise.title') })}
                difficulty={manualExerciseForm.difficulty}
                languageLabel={getAiLanguageLabel(manualExerciseForm.languageId, t)}
                monacoLanguage={getMonacoFromJudge0Id(manualExerciseForm.languageId)}
                onSendToValidator={() => sendToValidator(exerciseResult, 'exercise')}
                onDiscard={() => setExerciseResult(null)}
                t={t}
              />
            </section>
          </div>

          <section ref={validatorRef} className="rbac-card ai-admin-card--full" style={{ marginTop: '2rem', overflow: 'visible' }}>
            <div className="rbac-section-head">
              <h2>{t('admin.ai.validate.title')}</h2>
              <GuideButton type={GUIDE_TYPES.validator} onOpen={setActiveGuide} t={t} />
            </div>
            <p className="rbac-muted">{t('admin.ai.validate.hint')}</p>
            {validationSource === 'generated' && (
              <p className="ai-prefill-indicator">{t('admin.ai.validation.prefilled')}</p>
            )}
            <form className="ai-admin-form" style={{ marginTop: '1.5rem' }} onSubmit={handleValidationSubmit}>
              <label>{t('admin.ai.field.content')}</label>
              <textarea
                ref={validationInputRef}
                rows={6}
                value={validationForm.content}
                onChange={(e) => {
                  setValidationForm({ content: e.target.value })
                  setValidationSource('manual')
                  setValidationContext(null)
                  setPublishStatus(null)
                }}
              />
              <div className="ai-admin-actions">
                <button type="submit" disabled={validationLoading}>x</button>
              </div>
            </form>
            <ValidationResultCard result={validationResult} onEdit={() => validationInputRef.current?.focus()} onPublish={handlePublish} publishing={publishingContent} publishBlockedReason={publishBlockedReason} publishStatus={publishStatus} t={t} />
          </section>
        </section>
        <GuideModal type={activeGuide} onClose={() => setActiveGuide(null)} t={t} />
      </MotionPage>
    </SidebarLayout>
  )
}

export default AdminManualCreationPage
