import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoMdArrowRoundBack } from 'react-icons/io'
import { CiSaveDown1 } from 'react-icons/ci'
import EditorLoadingSkeleton from '../components/EditorLoadingSkeleton'
import MotionPage from '../components/MotionPage'
import { getDemoLessonContent, submitDemoExercise, executeDemoCode } from '../services/demoApi'
import { buildExecutionSource, normalizeCodeExerciseAnswer } from '../utils/lessonAnswers'
import { detectLanguageMismatch, getLanguageConfig, getLanguageLabelFromLesson, getMonacoLanguageFromLesson } from '../utils/languages'
import TheoryContent from '../components/TheoryContent'
import CodeViewer from '../components/CodeViewer'
import { notifyError, notifyInfo, notifyPending, notifySuccess } from '../utils/notify'

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
        const data = await getDemoLessonContent()
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
            notifyPending('Continuamos donde lo dejaste.', { icon: <CiSaveDown1 size={22} style={{ display: 'block', flexShrink: 0 }} /> })
          }
        }
      } catch (error) {
        if (!active) {
          return
        }

        notifyError(error?.message || 'No fue posible cargar la leccion demo.')
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
  }, [])

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
      notifyPending('Continuamos donde lo dejaste.', { icon: <CiSaveDown1 size={22} style={{ display: 'block', flexShrink: 0 }} /> })
    }
    setCurrentStep('exercise')
  }

  const handleRunCode = useCallback(async () => {
    if (!currentExercise) {
      return
    }

    const executionSource = buildExecutionSource(currentExercise, currentCodeAnswer)
    if (!executionSource.trim()) {
      notifyInfo('Escribe codigo antes de ejecutar.')
      return
    }

    if (!lessonLanguageId) {
      notifyError('No se encontro un lenguaje valido.')
      return
    }

    const { slug: expectedSlug, label: expectedLabel } = getLanguageConfig(lessonLanguageId)
    const detectedLabel = detectLanguageMismatch(executionSource, expectedSlug)
    if (detectedLabel) {
      setConsoleOutput([
        `Esta leccion usa ${expectedLabel}. El codigo que escribiste parece ser ${detectedLabel}.`,
        `Asegurate de escribir en ${expectedLabel} para poder ejecutar.`,
      ])
      return
    }

    setIsExecuting(true)
    try {
      const result = await executeDemoCode(executionSource, lessonLanguageId)
      const nextOutput = [...(result.output || [])]
      if (Array.isArray(result.errors) && result.errors.length > 0) {
        nextOutput.push(...result.errors.map((line) => `[error] ${line}`))
        notifyError(result.errors[0])
      } else {
        notifySuccess('Codigo ejecutado.')
      }
      setConsoleOutput(nextOutput)
    } catch (error) {
      notifyError(error?.message || 'No fue posible ejecutar el codigo.')
    } finally {
      setIsExecuting(false)
    }
  }, [currentExercise, currentCodeAnswer, lessonLanguageId])

  const handleSubmitExercise = async () => {
    if (!currentExercise || !lessonId) {
      return
    }

    const answer =
      currentExercise.tipo === 'completar_codigo'
        ? normalizeCodeExerciseAnswer(currentExercise, currentCodeAnswer)
        : selectedAnswer

    if (!String(answer || '').trim()) {
      notifyInfo('Selecciona o escribe una respuesta.')
      return
    }

    setSubmitting(true)
    try {
      const data = await submitDemoExercise({
        lessonId,
        exerciseId: currentExercise.id,
        answer,
      })

      setFeedback(data)
      if (data.isCorrect) {
        notifySuccess('¡Correcto!')
      } else {
        notifyInfo('Intentalo de nuevo.')
      }
    } catch (error) {
      notifyError(error?.message || 'No fue posible validar la respuesta.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleFinishDemo() {
    clearAutosaveState()
    navigate('/demo/complete')
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
          <p>Cargando leccion demo...</p>
        </div>
      </MotionPage>
    )
  }

  if (!lesson) {
    return (
      <MotionPage className="lesson-page" delay={0.05}>
        <div className="lesson-loading">
          <p>No fue posible cargar la leccion demo.</p>
          <button type="button" onClick={() => navigate('/demo')}><IoMdArrowRoundBack /> Volver</button>
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
                <IoMdArrowRoundBack /> Volver
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
                Empezar ejercicios
              </button>
            </div>
          </>
        )}

        {currentStep === 'exercise' && currentExercise && (
          <>
            <div className="exercise-header">
              <span className="exercise-progress">
                Ejercicio {currentExerciseIdx + 1} de {exercises.length}
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
                      runLabel="Ejecutar codigo"
                      runningLabel="Ejecutando..."
                      outputLabel="Salida"
                      outputEmptyLabel="Ejecuta tu codigo para ver resultados."
                      shortcutHint="Ctrl/Cmd + Enter"
                      ariaLabel="Editor de codigo"
                      loadingLabel="Cargando editor..."
                      editorErrorLabel="No se pudo cargar Monaco."
                      placeholder="Escribe tu codigo aqui..."
                    />
                  </Suspense>
                </div>
              )}
            </div>

            {feedback && (
              <div className={`exercise-feedback ${feedback.isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
                <strong>{feedback.isCorrect ? '¡Correcto!' : 'Aun no.'}</strong>
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
                  {submitting ? 'Validando...' : 'Comprobar'}
                </button>
              ) : (
                <button className="exercise-next-btn" onClick={handleNextExercise} type="button">
                  {currentExerciseIdx < exercises.length - 1 ? 'Siguiente' : 'Terminar demo'}
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
