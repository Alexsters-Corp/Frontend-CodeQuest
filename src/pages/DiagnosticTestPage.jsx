import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import { useLanguage } from '../context/useLanguage'
import {
  finishDiagnosticExam,
  getSelectedLanguageId,
  startDiagnosticExam,
} from '../services/learningApi'
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify'

function DiagnosticTestPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
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
      notifyInfo(t('diagnostic.selectLanguageFirst'))
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
      const message = loadError.message || t('diagnostic.loadError')
      setError(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [navigate, t])

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
      const message = t('diagnostic.invalidAttempt')
      setError(message)
      notifyError(message)
      return
    }

    const answersPayload = (exam.questions || []).map((question) => ({
      questionId: question.id,
      selectedOption: answers[question.id],
    }))

    if (answersPayload.some((item) => !Number.isInteger(item.selectedOption))) {
      const message = t('diagnostic.answerAll')
      setError(message)
      notifyInfo(message)
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
      notifySuccess(t('diagnostic.finishSuccess'))
    } catch (submitError) {
      const message = submitError.message || t('diagnostic.finishError')
      setError(message)
      notifyError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    if (!exam?.questions?.length || !currentQuestion) {
      return
    }

    if (!Number.isInteger(answers[currentQuestion.id])) {
      const message = t('diagnostic.pickOption')
      setError(message)
      notifyInfo(message)
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

  const resolveLevelLabel = (level) => {
    const normalized = String(level || 'principiante').toLowerCase()

    if (normalized === 'principiante' || normalized === 'beginner') {
      return t('diagnostic.levelValue.principiante')
    }

    if (normalized === 'intermedio' || normalized === 'intermediate') {
      return t('diagnostic.levelValue.intermedio')
    }

    if (normalized === 'avanzado' || normalized === 'advanced') {
      return t('diagnostic.levelValue.avanzado')
    }

    return level
  }

  if (loading) {
    return (
      <MotionPage className="diagnostic-page" delay={0.05}>
        <div className="diagnostic-loading">
          <div className="spinner" />
          <p>{t('diagnostic.loading')}</p>
        </div>
      </MotionPage>
    )
  }

  if (result) {
    return (
      <MotionPage className="diagnostic-page" delay={0.06}>
        <div className="diagnostic-result">
          <div className="result-icon">🎯</div>
          <h1>{t('diagnostic.completed')}</h1>

          <div className="result-level">
            <span className={`level-badge level-${result.assignedLevel || 'principiante'}`}>
              {t('diagnostic.level', { level: resolveLevelLabel(result.assignedLevel || 'principiante') })}
            </span>
          </div>

          <div className="result-stats">
            <div className="result-stat">
              <span className="stat-number">{result.correctAnswers || 0}</span>
              <span className="stat-label">{t('diagnostic.correct')}</span>
            </div>
            <div className="result-stat">
              <span className="stat-number">{result.totalQuestions || 0}</span>
              <span className="stat-label">{t('diagnostic.questions')}</span>
            </div>
            <div className="result-stat">
              <span className="stat-number">{Math.round(result.scorePercentage || 0)}%</span>
              <span className="stat-label">{t('diagnostic.score')}</span>
            </div>
          </div>

          {result.assignedPath?.nombre && (
            <p className="result-description">
              {t('diagnostic.placedIn')}: <strong>{result.assignedPath.nombre}</strong>
            </p>
          )}

          <button className="diagnostic-finish-btn" onClick={() => navigate('/modules')} type="button">
            {t('diagnostic.gotoModules')}
          </button>
        </div>
      </MotionPage>
    )
  }

  if (!exam || !currentQuestion) {
    return (
      <MotionPage className="diagnostic-page" delay={0.06}>
        <div className="diagnostic-loading">
          <p>{error || t('diagnostic.startError')}</p>
          <button className="diagnostic-finish-btn" onClick={() => navigate('/dashboard')} type="button">
            {t('diagnostic.backDashboard')}
          </button>
        </div>
      </MotionPage>
    )
  }

  const selectedOption = answers[currentQuestion.id]
  const progressPercent = ((currentIndex + 1) / exam.questions.length) * 100

  return (
    <MotionPage className="diagnostic-page" delay={0.06}>
      <div className="diagnostic-container">
        <div className="diagnostic-header">
          <span className="diagnostic-step">
            {t('diagnostic.questionProgress', { current: currentIndex + 1, total: exam.questions.length })}
          </span>
          <div className="diagnostic-progress-bar">
            <div className="diagnostic-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="diagnostic-difficulty">{t('diagnostic.levelLabel')}: {currentQuestion.level}</span>
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
            {currentIndex === 0 ? t('common.back') : t('diagnostic.questionBack')}
          </button>
          <button className="diagnostic-next-btn" onClick={handleNext} type="button" disabled={submitting}>
            {submitting
              ? t('diagnostic.finishing')
              : currentIndex === exam.questions.length - 1
                ? t('diagnostic.finishAction')
                : t('diagnostic.nextQuestion')}
          </button>
        </div>
      </div>
    </MotionPage>
  )
}

export default DiagnosticTestPage
