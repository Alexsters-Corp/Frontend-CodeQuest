import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import { useLanguage } from '../context/useLanguage'
import { getLessonContent, submitLessonExercise } from '../services/learningApi'
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify'

function LessonPage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
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
      notifyError(e?.message || t('lesson.loadError'))
    } finally {
      setLoading(false)
    }
  }, [lessonId, t])

  useEffect(() => {
    loadLesson()
  }, [loadLesson])

  const currentExercise = exercises[currentExerciseIdx]

  const handleSubmitExercise = async () => {
    if (!currentExercise) return

    const answer =
      currentExercise.tipo === 'completar_codigo'
        ? codeAnswer
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
      if (data.isCorrect) {
        setXpEarned((prev) => prev + (data.xpGained || 0))
        notifySuccess(t('lesson.correctToast', { xp: data.xpGained || 0 }))
      } else {
        notifyInfo(t('lesson.incorrectToast'))
      }
    } catch (e) {
      console.error(e)
      notifyError(e?.message || t('lesson.submitError'))
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
      <MotionPage className="lesson-page" delay={0.05}>
        <div className="lesson-loading">
          <div className="spinner" />
          <p>{t('lesson.loading')}</p>
        </div>
      </MotionPage>
    )
  }

  if (!lesson) {
    return (
      <MotionPage className="lesson-page" delay={0.05}>
        <div className="lesson-loading">
          <p>{t('lesson.notFound')}</p>
          <button onClick={() => navigate('/dashboard')} type="button">{t('common.back')}</button>
        </div>
      </MotionPage>
    )
  }

  // Pantalla de lección completada
  if (currentStep === 'completed') {
    return (
      <MotionPage className="lesson-page" delay={0.06}>
        <div className="lesson-completed">
          <div className="completed-icon">🎉</div>
          <h1>{t('lesson.completed')}</h1>
          <h2>{lesson.titulo}</h2>
          <div className="completed-xp">
            <span className="xp-icon">⭐</span>
            <span>+{xpEarned} XP</span>
          </div>
          <button className="lesson-back-btn ui-jitter" onClick={() => navigate('/dashboard')} type="button">
            {t('lesson.backDashboard')}
          </button>
        </div>
      </MotionPage>
    )
  }

  // Teoría
  if (currentStep === 'theory') {
    return (
      <MotionPage className="lesson-page" delay={0.06}>
        <div className="lesson-container">
          <div className="lesson-header">
            <button className="lesson-back-link" onClick={() => navigate('/dashboard')} type="button">
              ← {t('lesson.back')}
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
            <button className="lesson-start-btn ui-jitter" onClick={handleStartExercises} type="button">
              {exercises.length > 0 ? t('lesson.startExercises') : t('lesson.completeLesson')}
            </button>
          </div>
        </div>
      </MotionPage>
    )
  }

  // Ejercicios
  const options = currentExercise?.opciones || []

  return (
    <MotionPage className="lesson-page" delay={0.06}>
      <div className="lesson-container">
        <div className="exercise-header">
          <span className="exercise-progress">
            {t('lesson.exerciseProgress', { current: currentExerciseIdx + 1, total: exercises.length })}
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
              <textarea
                value={codeAnswer}
                onChange={(e) => setCodeAnswer(e.target.value)}
                placeholder={t('lesson.answerPlaceholder')}
                rows={4}
                disabled={!!feedback}
                className="code-textarea"
              />
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
              {submitting ? t('lesson.checking') : t('lesson.check')}
            </button>
          ) : (
            <button className="exercise-next-btn" onClick={handleNextExercise} type="button">
              {currentExerciseIdx < exercises.length - 1 ? t('lesson.next') : t('lesson.finish')}
            </button>
          )}
        </div>
      </div>
    </MotionPage>
  )
}

export default LessonPage
