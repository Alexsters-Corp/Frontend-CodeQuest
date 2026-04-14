import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import { useLanguage } from '../context/useLanguage'
import { notifyInfo, notifySuccess } from '../utils/notify'

function OnboardingTourPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()
  const { t } = useLanguage()

  const slides = useMemo(() => ([
    {
      emoji: '💻',
      title: t('onboarding.slide1.title'),
      description: t('onboarding.slide1.description'),
    },
    {
      emoji: '⭐',
      title: t('onboarding.slide2.title'),
      description: t('onboarding.slide2.description'),
    },
    {
      emoji: '🎯',
      title: t('onboarding.slide3.title'),
      description: t('onboarding.slide3.description'),
    },
  ]), [t])

  const isLast = currentSlide === slides.length - 1

  const handleNext = () => {
    if (isLast) {
      notifySuccess(t('onboarding.tourCompleted'))
      navigate('/diagnostic')
    } else {
      setCurrentSlide((prev) => prev + 1)
    }
  }

  const handleSkip = () => {
    notifyInfo(t('onboarding.tourSkipped'))
    navigate('/diagnostic')
  }

  const slide = slides[currentSlide]

  return (
    <MotionPage className="onboarding-page" delay={0.06}>
      <div className="onboarding-container tour-container">
        <div className="tour-skip">
          <button onClick={handleSkip} className="tour-skip-btn" type="button">
            {t('onboarding.skip')}
          </button>
        </div>

        <div className="tour-slide">
          <span className="tour-emoji">{slide.emoji}</span>
          <h1>{slide.title}</h1>
          <p>{slide.description}</p>
        </div>

        <div className="tour-dots">
          {slides.map((_, index) => (
            <span
              key={index}
              className={`tour-dot ${index === currentSlide ? 'tour-dot-active' : ''}`}
            />
          ))}
        </div>

        <button className="onboarding-continue-btn" onClick={handleNext} type="button">
          {isLast ? t('onboarding.startLearning') : t('common.next')}
        </button>
      </div>
    </MotionPage>
  )
}

export default OnboardingTourPage
