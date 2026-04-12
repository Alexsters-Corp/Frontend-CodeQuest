import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  finishDiagnosticExam,
  getSelectedLanguageId,
  startDiagnosticExam,
} from '../services/learningApi'

function DiagnosticTestPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [exam, setExam] = useState(null)
  const [result, setResult] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})

  const currentQuestion = useMemo(() => {
    if (!exam?.questions?.length) return null
    return exam.questions[currentIndex] || null
  }, [exam, currentIndex])

  const loadDiagnostic = useCallback(async () => {
    const languageId = getSelectedLanguageId()

    if (!languageId) {
      navigate('/onboarding/language', { replace: true })
      return
    }

    setLoading(true)
    setError('')

    try {
      const payload = await startDiagnosticExam(languageId)

      if (payload.alreadyCompleted) {
        setResult(payload.result)
        setExam(null)
      } else {
        setExam(payload)
        setResult(null)
      }
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar el diagnóstico.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadDiagnostic()
  }, [loadDiagnostic])

  const handlePickOption = (optionIndex) => {
    if (!currentQuestion) return

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }))
  }

  const handleSubmitDiagnostic = async () => {
    if (!exam?.attemptId) {
      setError('No se encontró un intento diagnóstico válido.')
      return
    }

    const answersPayload = (exam.questions || []).map((question) => ({
      questionId: question.id,
      selectedOption: answers[question.id],
    }))

    if (answersPayload.some((item) => !Number.isInteger(item.selectedOption))) {
      setError('Debes responder todas las preguntas antes de finalizar.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = await finishDiagnosticExam({
        attemptId: exam.attemptId,
        answers: answersPayload,
      })

      setResult(payload)
      setExam(null)
    } catch (submitError) {
      setError(submitError.message || 'No fue posible finalizar el diagnóstico.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    if (!exam?.questions?.length || !currentQuestion) {
      return
    }

    if (!Number.isInteger(answers[currentQuestion.id])) {
      setError('Selecciona una opción para continuar.')
      return
    }

    setError('')

    if (currentIndex < exam.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      return
    }

    handleSubmitDiagnostic()
  }

  const handleBack = () => {
    if (currentIndex === 0) {
      navigate('/dashboard')
      return
    }

    setCurrentIndex((prev) => prev - 1)
  }

  if (loading) {
    return (
      <div className="diagnostic-page">
        <div className="diagnostic-loading">
          <div className="spinner" />
          <p>Preparando tu diagnóstico...</p>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="diagnostic-page">
        <div className="diagnostic-result">
          <div className="result-icon">🎯</div>
          <h1>Diagnóstico completado</h1>

          <div className="result-level">
            <span className={`level-badge level-${result.assignedLevel || 'principiante'}`}>
              Nivel {result.assignedLevel || 'principiante'}
            </span>
          </div>

          <div className="result-stats">
            <div className="result-stat">
              <span className="stat-number">{result.correctAnswers || 0}</span>
              <span className="stat-label">Correctas</span>
            </div>
            <div className="result-stat">
              <span className="stat-number">{result.totalQuestions || 0}</span>
              <span className="stat-label">Preguntas</span>
            </div>
            <div className="result-stat">
              <span className="stat-number">{Math.round(result.scorePercentage || 0)}%</span>
              <span className="stat-label">Puntaje</span>
            </div>
          </div>

          {result.assignedPath?.nombre && (
            <p className="result-description">
              Te ubicamos en: <strong>{result.assignedPath.nombre}</strong>
            </p>
          )}

          <button className="diagnostic-finish-btn" onClick={() => navigate('/modules')} type="button">
            Ir a mis módulos
          </button>
        </div>
      </div>
    )
  }

  if (!exam || !currentQuestion) {
    return (
      <div className="diagnostic-page">
        <div className="diagnostic-loading">
          <p>{error || 'No se pudo iniciar el diagnóstico.'}</p>
          <button className="diagnostic-finish-btn" onClick={() => navigate('/dashboard')} type="button">
            Volver al dashboard
          </button>
        </div>
      </div>
    )
  }

  const selectedOption = answers[currentQuestion.id]
  const progressPercent = ((currentIndex + 1) / exam.questions.length) * 100

  return (
    <div className="diagnostic-page">
      <div className="diagnostic-container">
        <div className="diagnostic-header">
          <span className="diagnostic-step">
            Pregunta {currentIndex + 1} de {exam.questions.length}
          </span>
          <div className="diagnostic-progress-bar">
            <div className="diagnostic-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="diagnostic-difficulty">Nivel: {currentQuestion.level}</span>
        </div>

        <div className="diagnostic-question">
          <h2>{currentQuestion.prompt}</h2>

          <div className="diagnostic-options">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={`${currentQuestion.id}-${idx}`}
                className={`diagnostic-option ${selectedOption === idx ? 'selected' : ''}`}
                onClick={() => handlePickOption(idx)}
                type="button"
                disabled={submitting}
              >
                <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="diagnostic-feedback feedback-incorrect">
            <strong>{error}</strong>
          </div>
        )}

        <div className="diagnostic-actions">
          <button className="diagnostic-back-btn" onClick={handleBack} type="button" disabled={submitting}>
            {currentIndex === 0 ? 'Volver' : 'Pregunta anterior'}
          </button>
          <button className="diagnostic-next-btn" onClick={handleNext} type="button" disabled={submitting}>
            {submitting
              ? 'Finalizando...'
              : currentIndex === exam.questions.length - 1
                ? 'Finalizar diagnóstico'
                : 'Siguiente pregunta'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DiagnosticTestPage
