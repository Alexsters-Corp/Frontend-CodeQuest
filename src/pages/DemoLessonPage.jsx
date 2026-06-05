import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IoMdArrowRoundBack } from 'react-icons/io'
import { CiSaveDown1 } from 'react-icons/ci'
import EditorLoadingSkeleton from '../components/EditorLoadingSkeleton'
import MotionPage from '../components/MotionPage'
import { getDemoLessonContent, submitDemoExercise, executeDemoCode } from '../services/demoApi'
import { buildExecutionSource, normalizeCodeExerciseAnswer } from '../utils/lessonAnswers'
import { detectLanguageMismatch, getLanguageConfig, getLanguageLabelFromLesson, getMonacoLanguageFromLesson } from '../utils/languages'
import TheoryContent from '../components/TheoryContent'
import CodeViewer from '../components/CodeViewer'
import { notifyError, notifyInfo, notifyPending } from '../utils/notify'
import { useLanguage } from '../context/useLanguage'
import { normalizeExecutionFeedback } from '../utils/executionErrors'

const MonacoEditor = lazy(() => import('../components/MonacoEditor'))

const AUTOSAVE_KEY = 'cq:demo:state:v1'
const AUTOSAVE_DEBOUNCE_MS = 500
const AUTOSAVE_MAX_AGE_MS = 60 * 60 * 1000 // 1 hora

function loadAutosaveState() {
  try {
    const raw = sessionStorage.getItem(AUTOSAVE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > AUTOSAVE_MAX_AGE_MS) {
      sessionStorage.removeItem(AUTOSAVE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function clearAutosaveState() {
  try {
    sessionStorage.removeItem(AUTOSAVE_KEY)
  } catch {
    /* ignore */
  }
}

// Progreso real = ya habia empezado ejercicios, avanzado, o escrito codigo
function hasRealProgress(saved) {
  if (!saved) return false
  if (saved.currentStep === 'exercise') return true
  if (saved.currentExerciseIdx > 0) return true
  return Object.values(saved.codeAnswerByExercise || {}).some(
    (v) => typeof v === 'string' && v.trim().length > 0
  )
}

function DemoLessonPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, language } = useLanguage()
  const [lesson, setLesson] = useState(null)
  const [exercises, setExercises] = useState([])
  const [lessonId, setLessonId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState('theory') // theory | exercise
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [codeAnswerByExercise, setCodeAnswerByExercise] = useState({})
  const [consoleOutput, setConsoleOutput] = useState([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // const [restoredFromAutosave, setRestoredFromAutosave] = useState(false)

  const autosaveTimeoutRef = useRef(null)
  const initialAutosaveRef = useRef(null)
  const selectedLanguageSlug = searchParams.get('language') || 'python'

  // Cargar estado autosave antes de montar (una sola vez)
  useEffect(() => {
    initialAutosaveRef.current = loadAutosaveState()
  }, [])

  const lessonLanguageId = lesson?.lenguaje_id

  const editorLanguage = useMemo(
    () => getMonacoLanguageFromLesson(lessonLanguageId),
    [lessonLanguageId]
  )

  const editorLanguageLabel = useMemo(
    () => getLanguageLabelFromLesson(lessonLanguageId),
    [lessonLanguageId]
  )

  const monacoOptions = useMemo(() => ({
    minimap: { enabled: false },
    fontSize: 14,
    automaticLayout: true,
    scrollBeyondLastLine: false,
  }), [])

  // Carga inicial de la leccion demo
  useEffect(() => {
    let active = true

    async function loadDemo() {
      setLoading(true)
      try {
        const data = await getDemoLessonContent({
          languageSlug: selectedLanguageSlug,
          locale: language,
        })
        if (!active) {
          return
        }

        setLesson(data.lesson)
        setExercises(data.exercises || [])
        setLessonId(Number(data.lessonId || data.lesson?.id || 0))

        // Restaurar estado guardado si pertenece a la misma leccion
        const saved = initialAutosaveRef.current
        if (saved && Number(saved.lessonId) === Number(data.lessonId)) {
          setCodeAnswerByExercise(saved.codeAnswerByExercise || {})
          setCurrentExerciseIdx(saved.currentExerciseIdx || 0)
          setCurrentStep(saved.currentStep || 'theory')
          // Si ya estaba en ejercicios, va directo sin pasar por el boton: mostrar toast aqui
          if (saved.currentStep === 'exercise' && hasRealProgress(saved)) {
            notifyPending(t('demo.toast.resume'), { icon: <CiSaveDown1 size={22} style={{ display: 'block', flexShrink: 0 }} /> })
          }
        }
      } catch (error) {
        if (!active) {
          return
        }

        notifyError(error?.message || t('demo.toast.loadError'))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDemo()

    return () => {
      active = false
    }
  }, [language, selectedLanguageSlug, t])

  // Autosave con debounce a sessionStorage
  useEffect(() => {
    if (loading || !lessonId) {
      return undefined
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(
          AUTOSAVE_KEY,
          JSON.stringify({
            lessonId,
            currentStep,
            currentExerciseIdx,
            codeAnswerByExercise,
            savedAt: Date.now(),
          })
        )
      } catch {
        /* sessionStorage lleno o deshabilitado, ignoramos */
      }
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [lessonId, currentStep, currentExerciseIdx, codeAnswerByExercise, loading])

  const currentExercise = exercises[currentExerciseIdx]
  const currentCodeAnswer = currentExercise
    ? (codeAnswerByExercise[currentExercise.id] ?? currentExercise.codigo_base ?? '')
    : ''

  const setCurrentCodeAnswer = useCallback(
    (next) => {
      if (!currentExercise) {
        return
      }

      setCodeAnswerByExercise((prev) => ({
        ...prev,
        [currentExercise.id]: typeof next === 'function' ? next(prev[currentExercise.id] || '') : next,
      }))
    },
    [currentExercise]
  )

  const handleStartExercises = () => {
    if (exercises.length === 0) {
      handleFinishDemo()
      return
    }
    if (hasRealProgress(initialAutosaveRef.current)) {
      notifyPending(t('demo.toast.resume'), { icon: <CiSaveDown1 size={22} style={{ display: 'block', flexShrink: 0 }} /> })
    }
    setCurrentStep('exercise')
  }

  const handleRunCode = useCallback(async (editorValue) => {
    if (!currentExercise) {
      return
    }

    const answerForExecution = typeof editorValue === 'string' ? editorValue : currentCodeAnswer
    const executionSource = buildExecutionSource(currentExercise, answerForExecution)
    if (!executionSource.trim()) {
      notifyInfo(t('demo.toast.writeCode'), { id: 'demo-no-code-to-run', rateLimitKey: 'demo-no-code-to-run' })
      return
    }

    if (!lessonLanguageId) {
      notifyError(t('demo.toast.invalidLanguage'), { id: 'demo-invalid-language', rateLimitKey: 'demo-invalid-language' })
      return
    }

    const { slug: expectedSlug, label: expectedLabel } = getLanguageConfig(lessonLanguageId)
    const detectedLabel = detectLanguageMismatch(executionSource, expectedSlug)
    if (detectedLabel) {
      setConsoleOutput([
        t('demo.lesson.languageMismatchLine1', { expected: expectedLabel, detected: detectedLabel }),
        t('demo.lesson.languageMismatchLine2', { expected: expectedLabel }),
      ])
      return
    }

    setIsExecuting(true)
    try {
      const result = await executeDemoCode(executionSource, lessonLanguageId)
      const nextOutput = [...(result.output || [])]
      if (Array.isArray(result.errors) && result.errors.length > 0) {
        const feedback = normalizeExecutionFeedback({ errors: result.errors, t })
        nextOutput.push(...feedback.consoleLines)
        notifyError(feedback.toastMessage, { id: 'demo-code-error', rateLimitKey: 'demo-code-error', rateLimitMs: 2200 })
      }
      setConsoleOutput(nextOutput)
    } catch (error) {
      notifyError(error?.message || t('demo.toast.runError'), { id: 'demo-run-error', rateLimitKey: 'demo-run-error', rateLimitMs: 2200 })
    } finally {
      setIsExecuting(false)
    }
  }, [currentExercise, currentCodeAnswer, lessonLanguageId, t])

  const handleSubmitExercise = async () => {
    if (!currentExercise || !lessonId) {
      return
    }

    const answer =
      currentExercise.tipo === 'completar_codigo'
        ? normalizeCodeExerciseAnswer(currentExercise, currentCodeAnswer)
        : selectedAnswer

    if (!String(answer || '').trim()) {
      notifyInfo(t('demo.toast.answerRequired'))
      return
    }

    setSubmitting(true)
    try {
      const data = await submitDemoExercise({
        lessonId,
        exerciseId: currentExercise.id,
        answer,
        locale: language,
      })

      setFeedback(data)
    } catch (error) {
      notifyError(error?.message || t('demo.toast.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleFinishDemo() {
    clearAutosaveState()
    navigate(`/demo/complete?language=${encodeURIComponent(selectedLanguageSlug)}`)
  }

  const handleNextExercise = () => {
    const isLast = currentExerciseIdx >= exercises.length - 1
    if (isLast) {
      handleFinishDemo()
      return
    }

    setCurrentExerciseIdx((prev) => prev + 1)
    setSelectedAnswer(null)
    setConsoleOutput([])
    setFeedback(null)
  }

  if (loading) {
    return (
      <MotionPage className="lesson-page" delay={0.05}>
        <div className="lesson-loading">
          <div className="spinner" />
          <p>{t('demo.lesson.loading')}</p>
        </div>
      </MotionPage>
    )
  }

  if (!lesson) {
    return (
      <MotionPage className="lesson-page" delay={0.05}>
        <div className="lesson-loading">
          <p>{t('demo.lesson.loadError')}</p>
          <button type="button" onClick={() => navigate('/demo')}><IoMdArrowRoundBack /> {t('common.back')}</button>
        </div>
      </MotionPage>
    )
  }

  const options = currentExercise?.opciones || []

  return (
    <>
      <img
        src="/codey-ensenando.png"
        alt=""
        aria-hidden="true"
        className="demo__teacher-mascot"
      />

      <MotionPage className="lesson-page" delay={0.06}>

      {/* <div className="demo-banner" role="note" aria-live="polite">
        <strong>Modo demo</strong> · tu progreso no se guarda
        {restoredFromAutosave && <span className="demo-banner__chip">sesion restaurada</span>}
        <button
          type="button"
          className="demo-banner__cta"
          onClick={() => navigate('/registro')}
        >
          Crear cuenta
        </button>
      </div> */}

      <div className="lesson-container">
        {currentStep === 'theory' && (
          <>
            <div className="lesson-header">
              <button className="lesson-back-link" type="button" onClick={() => navigate('/demo')}>
                <IoMdArrowRoundBack /> {t('common.back')}
              </button>
              <span className="lesson-modulo">{lesson.modulo_nombre}</span>
            </div>

            <h1 className="lesson-title">{lesson.titulo}</h1>

            {lesson.contenido_teoria ? (
              <TheoryContent html={lesson.contenido_teoria} language={editorLanguage} />
            ) : (
              <div className="lesson-theory">
                <p>{lesson.descripcion}</p>
              </div>
            )}

            <div className="lesson-actions">
              <button className="lesson-start-btn ui-jitter" onClick={handleStartExercises} type="button">
                {t('demo.lesson.startExercises')}
              </button>
            </div>
          </>
        )}

        {currentStep === 'exercise' && currentExercise && (
          <>
            <div className="exercise-header">
              <span className="exercise-progress">
                {t('demo.lesson.exerciseProgress', { current: currentExerciseIdx + 1, total: exercises.length })}
              </span>
              <div className="exercise-progress-bar">
                <div
                  className="exercise-progress-fill"
                  style={{ width: `${((currentExerciseIdx + 1) / exercises.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="exercise-content">
              <h2 className="exercise-question">{currentExercise.enunciado}</h2>

              {currentExercise.codigo_base && currentExercise.tipo !== 'completar_codigo' && (
                <CodeViewer code={currentExercise.codigo_base} language={editorLanguage} />
              )}

              {(currentExercise.tipo === 'opcion_multiple' || currentExercise.tipo === 'verdadero_falso') && (
                <div className="exercise-options">
                  {options.map((opt, idx) => (
                    <button
                      key={idx}
                      className={`exercise-option ${selectedAnswer === opt ? 'selected' : ''} ${
                        feedback
                          ? opt === selectedAnswer
                            ? feedback.isCorrect
                              ? 'correct'
                              : 'incorrect'
                            : ''
                          : ''
                      }`}
                      onClick={() => !feedback && setSelectedAnswer(opt)}
                      type="button"
                      disabled={!!feedback}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentExercise.tipo === 'completar_codigo' && (
                <div className="exercise-code-input">
                  <Suspense fallback={<EditorLoadingSkeleton />}>
                    <MonacoEditor
                      value={currentCodeAnswer}
                      onChange={setCurrentCodeAnswer}
                      language={editorLanguage}
                      languageLabel={editorLanguageLabel}
                      theme="vs-dark"
                      height="clamp(180px, 28vh, 380px)"
                      readOnly={!!feedback}
                      options={monacoOptions}
                      onRun={handleRunCode}
                      isExecuting={isExecuting}
                      consoleOutput={consoleOutput}
                      runLabel={t('demo.lesson.runCode')}
                      runningLabel={t('demo.lesson.runningCode')}
                      outputLabel={t('demo.lesson.output')}
                      outputEmptyLabel={t('demo.lesson.outputEmpty')}
                      shortcutHint="Ctrl/Cmd + Enter"
                      ariaLabel={t('demo.lesson.editorAria')}
                      loadingLabel={t('demo.lesson.editorLoading')}
                      editorErrorLabel={t('demo.lesson.editorError')}
                      placeholder={t('demo.lesson.editorPlaceholder')}
                    />
                  </Suspense>
                </div>
              )}
            </div>

            {feedback && (
              <div className={`exercise-feedback ${feedback.isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
                <strong>{feedback.isCorrect ? t('demo.lesson.correct') : t('demo.lesson.incorrect')}</strong>
                {!feedback.isCorrect && feedback.hint && <p className="feedback-hint">💡 {feedback.hint}</p>}
              </div>
            )}

            <div className="exercise-actions">
              {!feedback ? (
                <button
                  className="exercise-submit-btn"
                  onClick={handleSubmitExercise}
                  disabled={
                    submitting ||
                    (currentExercise.tipo === 'completar_codigo'
                      ? !currentCodeAnswer.trim()
                      : selectedAnswer === null)
                  }
                  type="button"
                >
                  {submitting ? t('demo.lesson.validating') : t('demo.lesson.check')}
                </button>
              ) : (
                <button className="exercise-next-btn" onClick={handleNextExercise} type="button">
                  {currentExerciseIdx < exercises.length - 1 ? t('common.next') : t('demo.lesson.finishDemo')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </MotionPage>
    </>
  )
}

export default DemoLessonPage
