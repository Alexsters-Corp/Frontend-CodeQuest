import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../services/api'

function DiagnosticTestPage() {
  const [question, setQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const languageId = localStorage.getItem('selectedLanguageId')

  useEffect(() => {
    if (!languageId) {
      navigate('/dashboard')
      return
    }
    startDiagnostic()
  }, [])

  const startDiagnostic = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/diagnostic/start?languageId=${languageId}`)
      const data = await res.json()
      if (res.ok) {
        setQuestion(data.question)
      } else {
        // Ya completó el diagnóstico o error
        if (data.message?.includes('Ya completaste')) {
          navigate('/dashboard')
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null || !question) return
    setSubmitting(true)
    setFeedback(null)

    try {
      const res = await apiFetch('/api/diagnostic/answer', {
        method: 'POST',
        body: JSON.stringify({
          languageId: Number(languageId),
          questionId: question.id,
          answer: selectedAnswer,
        }),
      })

      const data = await res.json()

      if (data.finished) {
        // Finalizar y guardar resultado
        const finishRes = await apiFetch('/api/diagnostic/finish', {
          method: 'POST',
          body: JSON.stringify({ languageId: Number(languageId) }),
        })
        const finishData = await finishRes.json()
        setResult(finishData.result || data.result)
      } else {
        setFeedback({
          isCorrect: data.isCorrect,
          nextQuestion: data.question,
          questionsAnswered: data.questionsAnswered,
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextQuestion = () => {
    if (feedback?.nextQuestion) {
      setQuestion(feedback.nextQuestion)
      setQuestionsAnswered(feedback.questionsAnswered)
    }
    setSelectedAnswer(null)
    setFeedback(null)
  }

  const handleFinish = () => {
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="diagnostic-page">
        <div className="diagnostic-loading">
          <div className="spinner" />
          <p>Preparando tu test diagnóstico...</p>
        </div>
      </div>
    )
  }

  // Pantalla de resultado
  if (result) {
    return (
      <div className="diagnostic-page">
        <div className="diagnostic-result">
          <div className="result-icon">
            {result.nivel === 'avanzado' ? '🏆' : result.nivel === 'intermedio' ? '🎯' : '🌱'}
          </div>
          <h1>¡Diagnóstico completado!</h1>
          <div className="result-level">
            <span className={`level-badge level-${result.nivel}`}>
              {result.nivel.charAt(0).toUpperCase() + result.nivel.slice(1)}
            </span>
          </div>
          <div className="result-stats">
            <div className="result-stat">
              <span className="stat-number">{result.correctas}</span>
              <span className="stat-label">Correctas</span>
            </div>
            <div className="result-stat">
              <span className="stat-number">{result.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="result-stat">
              <span className="stat-number">{result.puntuacion}%</span>
              <span className="stat-label">Puntuación</span>
            </div>
          </div>
          <p className="result-description">
            {result.nivel === 'avanzado'
              ? 'Tienes un nivel avanzado. Hemos desbloqueado los primeros módulos para que vayas directo a lo que necesitas.'
              : result.nivel === 'intermedio'
                ? 'Tienes una base sólida. Hemos ajustado tu ruta de aprendizaje para que avances desde tu nivel.'
                : 'Empezaremos desde los fundamentos. ¡No te preocupes, cada experto fue principiante!'}
          </p>
          <button className="diagnostic-finish-btn" onClick={handleFinish} type="button">
            Ir al Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="diagnostic-page">
        <div className="diagnostic-loading">
          <p>No hay preguntas disponibles.</p>
          <button onClick={handleFinish} type="button">Volver</button>
        </div>
      </div>
    )
  }

  const options = question.opciones || []

  return (
    <div className="diagnostic-page">
      <div className="diagnostic-container">
        <div className="diagnostic-header">
          <span className="diagnostic-step">Pregunta {questionsAnswered + 1}</span>
          <div className="diagnostic-progress-bar">
            <div
              className="diagnostic-progress-fill"
              style={{ width: `${Math.min(((questionsAnswered + 1) / 10) * 100, 100)}%` }}
            />
          </div>
          <span className="diagnostic-difficulty">Nivel {question.dificultad}/10</span>
        </div>

        <div className="diagnostic-question">
          <h2>{question.enunciado}</h2>
          {question.codigo && (
            <pre className="diagnostic-code">
              <code>{question.codigo}</code>
            </pre>
          )}
        </div>

        <div className="diagnostic-options">
          {options.map((option, idx) => (
            <button
              key={idx}
              className={`diagnostic-option ${
                selectedAnswer === option ? 'selected' : ''
              } ${
                feedback
                  ? selectedAnswer === option
                    ? feedback.isCorrect
                      ? 'correct'
                      : 'incorrect'
                    : ''
                  : ''
              }`}
              onClick={() => !feedback && setSelectedAnswer(option)}
              type="button"
              disabled={!!feedback}
            >
              <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
              <span className="option-text">{option}</span>
            </button>
          ))}
        </div>

        {feedback && (
          <div className={`diagnostic-feedback ${feedback.isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
            {feedback.isCorrect ? '¡Correcto! 🎉' : 'Incorrecto ✗'}
          </div>
        )}

        {!feedback ? (
          <button
            className="diagnostic-submit-btn"
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null || submitting}
            type="button"
          >
            {submitting ? 'Evaluando...' : 'Comprobar'}
          </button>
        ) : (
          <button
            className="diagnostic-next-btn"
            onClick={handleNextQuestion}
            type="button"
          >
            Siguiente pregunta →
          </button>
        )}
      </div>
    </div>
  )
}

export default DiagnosticTestPage
