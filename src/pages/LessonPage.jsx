import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLessonContent, submitLessonExercise } from '../services/learningApi'

function LessonPage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState(null)
  const [exercises, setExercises] = useState([])
  const [currentStep, setCurrentStep] = useState('theory') // theory | exercise
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [codeAnswer, setCodeAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [xpEarned, setXpEarned] = useState(0)

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
      if (data.isCorrect) {
        setXpEarned((prev) => prev + (data.xpGained || 0))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextExercise = () => {
    if (currentExerciseIdx < exercises.length - 1) {
      setCurrentExerciseIdx((prev) => prev + 1)
      setSelectedAnswer(null)
      setCodeAnswer('')
      setFeedback(null)
    } else {
      // Lección completada
      setCurrentStep('completed')
    }
  }

  const handleStartExercises = () => {
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
    return (
      <div className="lesson-page">
        <div className="lesson-completed">
          <div className="completed-icon">🎉</div>
          <h1>¡Lección completada!</h1>
          <h2>{lesson.titulo}</h2>
          <div className="completed-xp">
            <span className="xp-icon">⭐</span>
            <span>+{xpEarned} XP</span>
          </div>
          <button className="lesson-back-btn" onClick={() => navigate('/dashboard')} type="button">
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Teoría
  if (currentStep === 'theory') {
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

          {lesson.contenido_teoria && (
            <div
              className="lesson-theory"
              dangerouslySetInnerHTML={{ __html: lesson.contenido_teoria }}
            />
          )}

          {!lesson.contenido_teoria && (
            <div className="lesson-theory">
              <p>{lesson.descripcion}</p>
            </div>
          )}

          <div className="lesson-actions">
            <button className="lesson-start-btn" onClick={handleStartExercises} type="button">
              {exercises.length > 0 ? 'Empezar ejercicios' : 'Completar lección'}
            </button>
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
