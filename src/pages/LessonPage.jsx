import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { IoMdArrowRoundBack } from 'react-icons/io'
import EditorLoadingSkeleton from '../components/EditorLoadingSkeleton'
import LoadingSpinner from '../components/LoadingSpinner'
import MotionPage from '../components/MotionPage'
import { useLanguage } from '../context/useLanguage'
import { executeCode } from '../services/codeExecutionService'
import { getLessonContent, getLessonSolution, submitLessonExercise, submitLessonSolution } from '../services/learningApi'
import { getLanguageLabelFromLesson, getMonacoLanguageFromLesson } from '../utils/languages'
import { notifyError, notifyInfo } from '../utils/notify'

import SidebarLayout from '../components/SidebarLayout'
import TheoryContent from '../components/TheoryContent'

const MonacoEditor = lazy(() => import('../components/MonacoEditor'))

function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }

  return fallback
}

const FEATURE_CODE_EXECUTION_ENABLED = parseBooleanFlag(
  import.meta.env.VITE_FEATURE_CODE_EXECUTION_ENABLED ?? import.meta.env.FEATURE_CODE_EXECUTION_ENABLED,
  true
)

function isMissingRouteError(error) {
  const code = String(error?.code || '').trim().toUpperCase()
  const message = String(error?.message || '')

  return code === 'ROUTE_NOT_FOUND' || message.startsWith('Ruta ')
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractTokenFromOutputStatement(submission) {
  const normalized = String(submission || '')
  const patterns = [
    /print\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/,
    /console\.log\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/,
    /System\.out\.println\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/,
    /Console\.WriteLine\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/,
    /(?:std::)?cout\s*<<\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*<</,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return ''
}

function normalizeCodeExerciseAnswer(exercise, answer) {
  const rawAnswer = String(answer || '')
  const trimmedAnswer = rawAnswer.trim()

  if (!trimmedAnswer) {
    return ''
  }

  if (exercise?.tipo !== 'completar_codigo') {
    return trimmedAnswer
  }

  const baseCode = String(exercise?.codigo_base || '').replace(/\r\n/g, '\n')
  if (!baseCode.includes('_____')) {
    return trimmedAnswer
  }

  if (!/\r?\n/.test(rawAnswer) && !rawAnswer.includes('_____')) {
    return trimmedAnswer
  }

  const submission = rawAnswer.replace(/\r\n/g, '\n').trim()
  const [prefix, suffix] = baseCode.split('_____')
  const strictPattern = new RegExp(`^${escapeRegex(prefix)}([\\s\\S]*?)${escapeRegex(suffix)}$`)
  const strictMatch = submission.match(strictPattern)

  if (strictMatch?.[1]) {
    return strictMatch[1].trim()
  }

  const inferredToken = extractTokenFromOutputStatement(submission)
  if (inferredToken) {
    return inferredToken
  }

  return trimmedAnswer
}

function buildExecutionSource(exercise, answer) {
  const rawAnswer = String(answer || '')
  const trimmedAnswer = rawAnswer.trim()

  if (!trimmedAnswer) {
    return ''
  }

  const baseCode = String(exercise?.codigo_base || '')
  const isFillCodeExercise = exercise?.tipo === 'completar_codigo'

  if (!isFillCodeExercise || !baseCode.includes('_____')) {
    return rawAnswer
  }

  if (/\r?\n/.test(rawAnswer) || rawAnswer.includes('_____')) {
    return rawAnswer
  }

  return baseCode.split('_____').join(trimmedAnswer)
}

const RETRY_BONUS_XP = 20

function LessonPage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [lesson, setLesson] = useState(null)
  const [exercises, setExercises] = useState([])
  const [currentStep, setCurrentStep] = useState('theory') // theory | exercise | completed
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [codeAnswer, setCodeAnswer] = useState('')
  const [consoleOutput, setConsoleOutput] = useState([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionUnavailable, setExecutionUnavailable] = useState(false)
  const [solutionUnavailable, setSolutionUnavailable] = useState(false)
  const [isMobileFallback, setIsMobileFallback] = useState(false)
  const [editorLoadFailed, setEditorLoadFailed] = useState(false)
  const [runCelebrationTick, setRunCelebrationTick] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // Estado del intento actual
  const [xpEarned, setXpEarned] = useState(0)
  const [errorsInAttempt, setErrorsInAttempt] = useState(0)
  const [isRetry, setIsRetry] = useState(false)
  const [bonusAwarded, setBonusAwarded] = useState(false)

  // Estado de la solución oficial
  const [solution, setSolution] = useState(null)
  const [showSolution, setShowSolution] = useState(false)
  const [loadingSolution, setLoadingSolution] = useState(false)

  const lessonLanguageId = lesson?.lenguaje_id

  const editorLanguage = useMemo(
    () => getMonacoLanguageFromLesson(lessonLanguageId),
    [lessonLanguageId]
  )

  const editorLanguageLabel = useMemo(
    () => getLanguageLabelFromLesson(lessonLanguageId),
    [lessonLanguageId]
  )

  const shouldRenderMonaco =
    FEATURE_CODE_EXECUTION_ENABLED &&
    !isMobileFallback &&
    !editorLoadFailed

  const canExecuteCode = FEATURE_CODE_EXECUTION_ENABLED && !executionUnavailable

  const monacoOptions = useMemo(() => ({
    minimap: { enabled: false },
    fontSize: 14,
    automaticLayout: true,
    scrollBeyondLastLine: false,
  }), [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)')

    const syncMobileMode = (event) => {
      setIsMobileFallback(event.matches)
    }

    setIsMobileFallback(mediaQuery.matches)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncMobileMode)
      return () => mediaQuery.removeEventListener('change', syncMobileMode)
    }

    mediaQuery.addListener(syncMobileMode)
    return () => mediaQuery.removeListener(syncMobileMode)
  }, [])

  const loadLesson = useCallback(async () => {
    setLoading(true)
    setEditorLoadFailed(false)
    setExecutionUnavailable(false)
    setSolutionUnavailable(false)
    try {
      const data = await getLessonContent(Number(lessonId))
      setLesson(data.lesson)
      setExercises(data.exercises)
    } catch (e) {
      console.error(e)
      notifyError(e?.message || t('lesson.loadError'))
    } finally {
      setLoading(false)
    }
  }, [lessonId, t])

  useEffect(() => {
    loadLesson()
  }, [loadLesson])

  const resetAttempt = () => {
    setCurrentExerciseIdx(0)
    setSelectedAnswer(null)
    setCodeAnswer('')
    setConsoleOutput([])
    setIsExecuting(false)
    setRunCelebrationTick(0)
    setFeedback(null)
    setXpEarned(0)
    setErrorsInAttempt(0)
    setBonusAwarded(false)
  }

  const handleRetryLesson = () => {
    resetAttempt()
    setIsRetry(true)
    setCurrentStep('exercise')
  }

  const handleViewSolution = async () => {
    if (solutionUnavailable) {
      notifyInfo(t('lesson.solutionUnavailable'))
      return
    }

    if (solution) {
      setShowSolution((prev) => !prev)
      return
    }
    setLoadingSolution(true)
    try {
      const data = await getLessonSolution(Number(lessonId))
      setSolution(data)
      setShowSolution(true)
    } catch (e) {
      if (isMissingRouteError(e)) {
        setSolutionUnavailable(true)
        notifyInfo(t('lesson.solutionUnavailable'))
        return
      }

      if (e?.code === 'LESSON_NOT_COMPLETED') {
        notifyInfo(t('lesson.solutionRequiresCompletion'))
        return
      }

      notifyError(e?.message || t('lesson.solutionLoadError'))
    } finally {
      setLoadingSolution(false)
    }
  }

  const currentExercise = exercises[currentExerciseIdx]

  const handleRunCode = useCallback(async (editorValue) => {
    if (!FEATURE_CODE_EXECUTION_ENABLED) {
      notifyInfo(t('lesson.executionDisabled'), { id: 'lesson-execution-disabled', rateLimitKey: 'lesson-execution-disabled' })
      return
    }

    if (executionUnavailable) {
      notifyInfo(t('lesson.executionUnavailable'), { id: 'lesson-execution-unavailable', rateLimitKey: 'lesson-execution-unavailable' })
      return
    }

    const answerForExecution = typeof editorValue === 'string' ? editorValue : codeAnswer
    const executionSource = buildExecutionSource(currentExercise, answerForExecution)

    if (!executionSource.trim()) {
      notifyInfo(t('lesson.noCodeToRun'), { id: 'lesson-no-code-to-run', rateLimitKey: 'lesson-no-code-to-run' })
      return
    }

    if (!lessonLanguageId) {
      notifyError(t('lesson.runError'), { id: 'lesson-run-error', rateLimitKey: 'lesson-run-error' })
      return
    }

    setIsExecuting(true)

    try {
      const result = await executeCode(executionSource, lessonLanguageId)
      const nextOutput = [...(result.output || [])]

      if (Array.isArray(result.errors) && result.errors.length > 0) {
        nextOutput.push(...result.errors.map((line) => `[error] ${line}`))
      }

      setConsoleOutput(nextOutput)

      if (Array.isArray(result.errors) && result.errors.length > 0) {
        notifyError(result.errors[0], { id: 'lesson-code-error', rateLimitKey: 'lesson-code-error', rateLimitMs: 2200 })
      } else {
        setRunCelebrationTick((prev) => prev + 1)
      }
    } catch (error) {
      if (isMissingRouteError(error)) {
        setExecutionUnavailable(true)
        setConsoleOutput([
          t('lesson.executionUnavailable'),
          t('lesson.executionUnavailableHint'),
        ])
        notifyInfo(t('lesson.executionUnavailable'), { id: 'lesson-execution-unavailable', rateLimitKey: 'lesson-execution-unavailable' })
        return
      }

      notifyError(error?.message || t('lesson.runError'), { id: 'lesson-run-error', rateLimitKey: 'lesson-run-error', rateLimitMs: 2200 })
    } finally {
      setIsExecuting(false)
    }
  }, [codeAnswer, currentExercise, executionUnavailable, lessonLanguageId, t])

  const handleEditorLoadError = useCallback(() => {
    setEditorLoadFailed(true)
    notifyInfo(t('lesson.editorFallbackNotice'))
  }, [t])

  const handleFallbackCodeKeyDown = useCallback((event) => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'Enter') {
        event.preventDefault()
        if (!isExecuting && !feedback) {
          handleRunCode()
        }
      }
    }
  }, [feedback, handleRunCode, isExecuting])

  const handleSubmitExercise = async () => {
    if (!currentExercise) return

    const answer =
      currentExercise.tipo === 'completar_codigo'
        ? normalizeCodeExerciseAnswer(currentExercise, codeAnswer)
        : selectedAnswer

    if (!String(answer || '').trim()) {
      notifyInfo(t('lesson.answerRequired'))
      return
    }

    setSubmitting(true)

    try {
      const data = await submitLessonExercise({
        lessonId: Number(lessonId),
        exerciseId: currentExercise.id,
        answer,
      })

      setFeedback(data)

      if (!data.isCorrect) {
        setErrorsInAttempt((prev) => prev + 1)
      }
    } catch (e) {
      console.error(e)
      notifyError(e?.message || t('lesson.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextExercise = async () => {
    const isLastExercise = currentExerciseIdx >= exercises.length - 1

    if (!isLastExercise) {
      setCurrentExerciseIdx((prev) => prev + 1)
      setSelectedAnswer(null)
      setCodeAnswer('')
      setConsoleOutput([])
      setIsExecuting(false)
      setRunCelebrationTick(0)
      setFeedback(null)
      return
    }

    // Último ejercicio — registrar intento completo y calcular XP
    const correctCount   = exercises.length - errorsInAttempt
    const wasPerfect     = errorsInAttempt === 0

    try {
      const result = await submitLessonSolution({
        lessonId: Number(lessonId),
        code: 'lesson:completed',
        languageId: lesson?.lenguaje_id || null,
        correctCount,
        totalExercises: exercises.length,
        isRetry,
      })
      const earned = result?.xpEarned || 0
      setXpEarned(earned)
      if (isRetry && wasPerfect && earned > 0) setBonusAwarded(true)
    } catch (e) {
      console.error('No se pudo registrar el intento:', e)
    }

    setCurrentStep('completed')
  }

  const handleStartExercises = () => {
    resetAttempt()
    if (exercises.length > 0) {
      setCurrentStep('exercise')
    } else {
      setCurrentStep('completed')
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <MotionPage className="lesson-page" delay={0.05}>
          <div className="lesson-loading">
            <LoadingSpinner size="large" />
            <p>{t('lesson.loading')}</p>
          </div>
        </MotionPage>
      </SidebarLayout>
    )
  }

  if (!lesson) {
    return (
      <SidebarLayout>
        <MotionPage className="lesson-page" delay={0.05}>
          <div className="lesson-loading">
            <p>{t('lesson.notFound')}</p>
          </div>
        </MotionPage>
      </SidebarLayout>
    )
  }

  // Pantalla de lección completada
  if (currentStep === 'completed') {
    const wasPerfect = errorsInAttempt === 0

    return (
      <SidebarLayout>
        <MotionPage className="lesson-page" delay={0.06}>
          <div className="lesson-completed">
            <div className="completed-icon">{wasPerfect ? '🏆' : '🎉'}</div>
            <h1>{t('lesson.completed')}</h1>
            <h2>{lesson.titulo}</h2>

            <div className="completed-xp">
              <span className="xp-icon">⭐</span>
              <span>+{xpEarned} XP</span>
            </div>

            {bonusAwarded && (
              <div className="completed-bonus">
                <span className="bonus-icon">🔥</span>
                <span>¡Reintento perfecto! +{RETRY_BONUS_XP} XP bonus</span>
              </div>
            )}

            {isRetry && !wasPerfect && (
              <p className="completed-hint">
                Tuviste {errorsInAttempt} error{errorsInAttempt > 1 ? 'es' : ''}.
                ¡Repite la lección sin errores para ganar el bonus!
              </p>
            )}

            <div className="completed-actions">
              {errorsInAttempt > 0 && (
                <button
                  className="lesson-solution-btn ui-jitter"
                  onClick={handleViewSolution}
                  disabled={loadingSolution || solutionUnavailable}
                  type="button"
                >
                  {loadingSolution ? '⏳ Cargando...' : showSolution ? '🙈 Ocultar solución' : '💡 Ver solución'}
                </button>
              )}
              <button
                className="lesson-retry-btn ui-jitter"
                onClick={handleRetryLesson}
                type="button"
              >
                🔄 Repetir lección
              </button>
            </div>

            {solutionUnavailable && (
              <p className="exercise-editor-flag-note lesson-inline-note">{t('lesson.solutionUnavailable')}</p>
            )}

            {showSolution && solution && (
              <div className="lesson-solution-panel">
                <h3 className="solution-title">💡 Solución oficial</h3>
                {solution.explanation && (
                  <p className="solution-explanation">{solution.explanation}</p>
                )}
                <pre className="solution-code">
                  <code>{solution.solved_code}</code>
                </pre>
              </div>
            )}
          </div>
        </MotionPage>
      </SidebarLayout>
    )
  }

  // Teoría
  if (currentStep === 'theory') {
    const alreadyCompleted = exercises.length > 0 && exercises[0]?.resuelto === true

    return (
      <SidebarLayout>
        <MotionPage className="lesson-page" delay={0.06}>
          <div className="lesson-container">
            <div className="lesson-header">
              <button className="lesson-back-link" onClick={() => navigate('/modules')} type="button">
                <IoMdArrowRoundBack /> {t('lesson.back')}
              </button>
              <span className="lesson-modulo">{lesson.modulo_nombre}</span>
            </div>

            <h1 className="lesson-title">{lesson.titulo}</h1>

            {alreadyCompleted && (
              <div className="lesson-completed-badge">
                ✅ Ya completaste esta lección
              </div>
            )}

            {lesson.contenido_teoria ? (
              <TheoryContent html={lesson.contenido_teoria} language={editorLanguage} />
            ) : (
              <div className="lesson-theory">
                <p>{lesson.descripcion}</p>
              </div>
            )}

            <div className="lesson-actions">
              {alreadyCompleted ? (
                <>
                  <button className="lesson-solution-btn ui-jitter" onClick={handleViewSolution} disabled={loadingSolution || solutionUnavailable} type="button">
                    {loadingSolution ? '⏳ Cargando...' : showSolution ? '🙈 Ocultar solución' : '💡 Ver solución'}
                  </button>
                  <button className="lesson-start-btn lesson-retry-btn ui-jitter" onClick={handleRetryLesson} type="button">
                    🔄 Repetir lección
                  </button>
                </>
              ) : (
                <button className="lesson-start-btn ui-jitter" onClick={handleStartExercises} type="button">
                  {exercises.length > 0 ? t('lesson.startExercises') : t('lesson.completeLesson')}
                </button>
              )}

              {solutionUnavailable && (
                <p className="exercise-editor-flag-note lesson-inline-note">{t('lesson.solutionUnavailable')}</p>
              )}

              {showSolution && solution && (
                <div className="lesson-solution-panel">
                  <h3 className="solution-title">💡 Solución oficial</h3>
                  {solution.explanation && (
                    <p className="solution-explanation">{solution.explanation}</p>
                  )}
                  <pre className="solution-code">
                    <code>{solution.solved_code}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </MotionPage>
      </SidebarLayout>
    )
  }

  // Ejercicios
  const options = currentExercise?.opciones || []

  return (
    <SidebarLayout>
      <MotionPage className="lesson-page" delay={0.06}>
        <div className="lesson-container">
          <div className="exercise-header">
            <span className="exercise-progress">
              {t('lesson.exerciseProgress', { current: currentExerciseIdx + 1, total: exercises.length })}
            </span>
            {isRetry && (
              <span className="exercise-retry-badge">🔄 Reintento</span>
            )}
            <div className="exercise-progress-bar">
              <div
                className="exercise-progress-fill"
                style={{ width: `${((currentExerciseIdx + 1) / exercises.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="exercise-content">
            <span className="exercise-type-badge">
              {currentExercise.tipo === 'opcion_multiple'
                ? t('lesson.exerciseType.multi')
                : currentExercise.tipo === 'verdadero_falso'
                  ? t('lesson.exerciseType.trueFalse')
                  : currentExercise.tipo === 'completar_codigo'
                    ? t('lesson.exerciseType.code')
                    : currentExercise.tipo}
            </span>
            <h2 className="exercise-question">{currentExercise.enunciado}</h2>

            {currentExercise.codigo_base && (
              <pre className="exercise-code">
                <code>{currentExercise.codigo_base}</code>
              </pre>
            )}

            {/* Opciones para opcion_multiple y verdadero_falso */}
            {(currentExercise.tipo === 'opcion_multiple' || currentExercise.tipo === 'verdadero_falso') && (
              <div className="exercise-options">
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    className={`exercise-option ${
                      selectedAnswer === opt ? 'selected' : ''
                    } ${
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

            {/* Input para completar_codigo */}
            {currentExercise.tipo === 'completar_codigo' && (
              <div className="exercise-code-input">
                {executionUnavailable && (
                  <p className="exercise-editor-flag-note lesson-inline-note">{t('lesson.executionUnavailableHint')}</p>
                )}

                {shouldRenderMonaco ? (
                  <Suspense fallback={<EditorLoadingSkeleton />}>
                    <MonacoEditor
                      value={codeAnswer}
                      onChange={setCodeAnswer}
                      language={editorLanguage}
                      languageLabel={editorLanguageLabel}
                      theme="vs-dark"
                      height="clamp(180px, 28vh, 400px)"
                      readOnly={!!feedback}
                      options={monacoOptions}
                      onRun={canExecuteCode ? handleRunCode : undefined}
                      isExecuting={isExecuting}
                      consoleOutput={consoleOutput}
                      runLabel={t('lesson.runCode')}
                      runningLabel={t('lesson.runningCode')}
                      outputLabel={t('lesson.outputTitle')}
                      outputEmptyLabel={t('lesson.outputEmpty')}
                      shortcutHint={t('lesson.runShortcut')}
                      ariaLabel={t('lesson.codeEditorAria')}
                      loadingLabel={t('lesson.editorLoadLabel')}
                      editorErrorLabel={t('lesson.editorFallbackNotice')}
                      placeholder={t('lesson.answerPlaceholder')}
                      onEditorError={handleEditorLoadError}
                      celebrationTick={runCelebrationTick}
                    />
                  </Suspense>
                ) : (
                  <div className="exercise-code-fallback">
                    <label htmlFor="lesson-code-fallback" className="sr-only">
                      {t('lesson.codeEditorAria')}
                    </label>
                    {isMobileFallback && FEATURE_CODE_EXECUTION_ENABLED && (
                      <p className="exercise-editor-flag-note">{t('lesson.mobileFallbackNotice')}</p>
                    )}
                    {!FEATURE_CODE_EXECUTION_ENABLED && (
                      <p className="exercise-editor-flag-note">{t('lesson.executionDisabled')}</p>
                    )}
                    <textarea
                      id="lesson-code-fallback"
                      value={codeAnswer}
                      onChange={(event) => setConsoleOutput([]) || setCodeAnswer(event.target.value)}
                      onKeyDown={handleFallbackCodeKeyDown}
                      placeholder={t('lesson.answerPlaceholder')}
                      rows={10}
                      disabled={!!feedback}
                      className="code-textarea"
                    />

                    {canExecuteCode && (
                      <>
                        <div className="exercise-code-fallback-actions">
                          <button
                            type="button"
                            className={`monaco-run-btn ${isExecuting ? 'is-running' : ''}`}
                            disabled={isExecuting || !!feedback}
                            onClick={handleRunCode}
                          >
                            {isExecuting ? (
                              <span className="btn-content-loading">
                                <span className="mini-spinner" />
                                {t('lesson.runningCode')}
                              </span>
                            ) : (
                              t('lesson.runCode')
                            )}
                          </button>
                          <span className="exercise-code-shortcut">{t('lesson.runShortcut')}</span>
                        </div>

                        <Motion.div
                          className="monaco-console"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          role="status"
                          aria-live="polite"
                        >
                          <div className="monaco-console__header">
                            <h3>{t('lesson.outputTitle')}</h3>
                          </div>
                          {consoleOutput.length === 0 ? (
                            <p className="monaco-console-empty">{t('lesson.outputEmpty')}</p>
                          ) : (
                            <pre>
                              <code>{consoleOutput.join('\n')}</code>
                            </pre>
                          )}
                        </Motion.div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {feedback && (
            <div className={`exercise-feedback ${feedback.isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
              <strong>{feedback.isCorrect ? t('lesson.correct') : t('lesson.incorrect')}</strong>
              {!feedback.isCorrect && feedback.hint && <p className="feedback-hint">💡 {t('lesson.hint')}: {feedback.hint}</p>}
              {!feedback.isCorrect && feedback.correctAnswer && (
                <p className="feedback-answer">{t('lesson.correctAnswer')}: {feedback.correctAnswer}</p>
              )}
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
                    ? !codeAnswer.trim()
                    : selectedAnswer === null)
                }
                type="button"
              >
                {submitting ? (
                  <span className="btn-content-loading">
                    <span className="mini-spinner" />
                    {t('lesson.checking')}
                  </span>
                ) : (
                  t('lesson.check')
                )}
              </button>
            ) : (
              <button className="exercise-next-btn" onClick={handleNextExercise} type="button">
                {currentExerciseIdx < exercises.length - 1 ? t('lesson.next') : t('lesson.finish')}
              </button>
            )}
          </div>
        </div>
      </MotionPage>
    </SidebarLayout>
  )
}

export default LessonPage
