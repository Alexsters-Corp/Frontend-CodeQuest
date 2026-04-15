import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLessonContent, submitLessonExercise, submitLessonSolution } from '../services/learningApi'

// Bonus XP que se otorga por completar la lección perfecta en un reintento
const RETRY_BONUS_XP = 20

function LessonPage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState(null)
  const [exercises, setExercises] = useState([])
  const [currentStep, setCurrentStep] = useState('theory') // theory | exercise | completed
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [codeAnswer, setCodeAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // Estado del intento actual
  const [xpEarned, setXpEarned] = useState(0)
  const [errorsInAttempt, setErrorsInAttempt] = useState(0)
  const [isRetry, setIsRetry] = useState(false)
  const [bonusAwarded, setBonusAwarded] = useState(false)

  const loadLesson = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getLessonContent(Number(lessonId))
      setLesson(data.lesson)
      setExercises(data.exercises)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    loadLesson()
  }, [loadLesson])

  const resetAttempt = () => {
    setCurrentExerciseIdx(0)
    setSelectedAnswer(null)
    setCodeAnswer('')
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

  const currentExercise = exercises[currentExerciseIdx]

  const handleSubmitExercise = async () => {
    if (!currentExercise) return
    setSubmitting(true)

    const answer =
      currentExercise.tipo === 'completar_codigo'
        ? codeAnswer
        : selectedAnswer

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
      <div className="lesson-page">
        <div className="lesson-loading">
          <div className="spinner" />
          <p>Cargando lección...</p>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="lesson-page">
        <div className="lesson-loading">
          <p>Lección no encontrada.</p>
          <button onClick={() => navigate('/dashboard')} type="button">Volver</button>
        </div>
      </div>
    )
  }

  // Pantalla de lección completada
  if (currentStep === 'completed') {
    const wasPerfect = errorsInAttempt === 0

    return (
      <div className="lesson-page">
        <div className="lesson-completed">
          <div className="completed-icon">{wasPerfect ? '🏆' : '🎉'}</div>
          <h1>¡Lección completada!</h1>
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
            <button
              className="lesson-retry-btn"
              onClick={handleRetryLesson}
              type="button"
            >
              🔄 Repetir lección
            </button>
            <button
              className="lesson-back-btn"
              onClick={() => navigate('/dashboard')}
              type="button"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Teoría
  if (currentStep === 'theory') {
    const alreadyCompleted = exercises.length > 0 && exercises[0]?.resuelto === true

    return (
      <div className="lesson-page">
        <div className="lesson-container">
          <div className="lesson-header">
            <button className="lesson-back-link" onClick={() => navigate('/dashboard')} type="button">
              ← Volver
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
            <div
              className="lesson-theory"
              dangerouslySetInnerHTML={{ __html: lesson.contenido_teoria }}
            />
          ) : (
            <div className="lesson-theory">
              <p>{lesson.descripcion}</p>
            </div>
          )}

          <div className="lesson-actions">
            {alreadyCompleted ? (
              <button className="lesson-start-btn lesson-retry-btn" onClick={handleRetryLesson} type="button">
                🔄 Repetir lección
              </button>
            ) : (
              <button className="lesson-start-btn" onClick={handleStartExercises} type="button">
                {exercises.length > 0 ? 'Empezar ejercicios' : 'Completar lección'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Ejercicios
  const options = currentExercise?.opciones || []

  return (
    <div className="lesson-page">
      <div className="lesson-container">
        <div className="exercise-header">
          <span className="exercise-progress">
            Ejercicio {currentExerciseIdx + 1} de {exercises.length}
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
              ? 'Opción múltiple'
              : currentExercise.tipo === 'verdadero_falso'
                ? 'Verdadero / Falso'
                : currentExercise.tipo === 'completar_codigo'
                  ? 'Completar código'
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
              <textarea
                value={codeAnswer}
                onChange={(e) => setCodeAnswer(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                rows={4}
                disabled={!!feedback}
                className="code-textarea"
              />
            </div>
          )}
        </div>

        {feedback && (
          <div className={`exercise-feedback ${feedback.isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
            <strong>{feedback.isCorrect ? '¡Correcto!' : 'Incorrecto'}</strong>
            {!feedback.isCorrect && feedback.hint && <p className="feedback-hint">💡 Pista: {feedback.hint}</p>}
            {!feedback.isCorrect && feedback.correctAnswer && (
              <p className="feedback-answer">Respuesta correcta: {feedback.correctAnswer}</p>
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
              {submitting ? 'Evaluando...' : 'Comprobar'}
            </button>
          ) : (
            <button className="exercise-next-btn" onClick={handleNextExercise} type="button">
              {currentExerciseIdx < exercises.length - 1 ? 'Siguiente' : 'Finalizar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default LessonPage
