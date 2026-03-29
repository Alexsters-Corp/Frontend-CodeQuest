import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const slides = [
  {
    emoji: '💻',
    title: 'Aprende haciendo',
    description:
      'Cada lección combina teoría breve con ejercicios prácticos de código real. Nada de solo leer: vas a escribir código desde el primer minuto.',
  },
  {
    emoji: '⭐',
    title: 'Gana XP y sube de nivel',
    description:
      'Completa ejercicios para ganar puntos de experiencia. Mantén tu racha diaria y compite en ligas semanales con otros estudiantes.',
  },
  {
    emoji: '🎯',
    title: 'A tu ritmo',
    description:
      'La plataforma se adapta a tu nivel. Si ya sabes algo, no lo repetirás. Avanza rápido donde dominas y profundiza donde necesitas.',
  },
]

function OnboardingTourPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  const isLast = currentSlide === slides.length - 1

  const handleNext = () => {
    if (isLast) {
      navigate('/diagnostic')
    } else {
      setCurrentSlide((prev) => prev + 1)
    }
  }

  const handleSkip = () => {
    navigate('/diagnostic')
  }

  const slide = slides[currentSlide]

  return (
    <div className="onboarding-page">
      <div className="onboarding-container tour-container">
        <div className="tour-skip">
          <button onClick={handleSkip} className="tour-skip-btn" type="button">
            Saltar
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
          {isLast ? '¡Empezar a aprender!' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}

export default OnboardingTourPage
