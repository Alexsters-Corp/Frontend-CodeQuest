import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import MotionPage from '../components/MotionPage'

/**
 * Pagina de bienvenida del demo publico (HU-025).
 */
function DemoLandingPage() {
  const navigate = useNavigate()

  return (
    <MotionPage className="demo-landing" delay={0.05}>
      <div className="landing__mesh" aria-hidden="true" />

      <div className="demo-landing__container">
        {/* Badge */}
        <span className="demo-landing__badge">Modo demo · Sin registro</span>

        {/* Headline */}
        <h1 className="demo-landing__title">
          Empieza a programar
          <em className="demo-landing__title-em">ahora mismo</em>
        </h1>

        {/* Subtítulo */}
        <p className="demo-landing__subtitle">
          Prueba una lección interactiva con código real y ejecución instantánea.
          Aprende practicando desde el primer minuto.
        </p>

        {/* Texto de apoyo */}
        <p className="demo-landing__support">
          Explora cómo se siente aprender programación en CodeQuest.
        </p>

        {/* CTAs */}
        <div className="demo-landing__actions">
          <button
            type="button"
            className="landing__cta-btn demo-landing__cta-main ui-jitter"
            onClick={() => navigate('/demo/lesson')}
          >
            Probar lección demo
          </button>
          <Link className="landing__link-btn demo-landing__cta-secondary" to="/login">
            Ya tengo cuenta
          </Link>
        </div>

        {/* Nota pequeña */}
        <p className="demo-landing__note">
          Sin tarjeta. Sin instalaciones. Empieza gratis.
        </p>

        {/* Features rápidas */}
        <div className="demo-landing__features">
          <div className="demo-landing__feature">
            <span className="demo-landing__feature-icon">⚡</span>
            <span>Ejecución instantánea</span>
          </div>
          <div className="demo-landing__feature">
            <span className="demo-landing__feature-icon">🧑‍💻</span>
            <span>Editor profesional</span>
          </div>
          <div className="demo-landing__feature">
            <span className="demo-landing__feature-icon">🎯</span>
            <span>Ejercicios reales</span>
          </div>
        </div>
      </div>
    </MotionPage>
  )
}

export default DemoLandingPage
