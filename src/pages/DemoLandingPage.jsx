import { Link, useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'

function DemoLandingPage() {
  const navigate = useNavigate()

  return (
    <MotionPage className="landing" delay={0.05}>
      <div className="landing__container">
        <section className="demo__hero-section">
          <div className="demo__hero-copy">
            <h1 className="demo__hero-title">
              Empieza a programar
              <em> ahora mismo</em>
            </h1>

            <p className="demo__hero-sub">
              Prueba una lección interactiva con código real y ejecución instantánea.
              Aprende practicando desde el primer minuto.
            </p>

            <div className="demo__hero-actions">
              <button
                type="button"
                className="demo__cta-btn ui-jitter"
                onClick={() => navigate('/demo/lesson')}
              >
                Iniciar lección demo
              </button>
              <Link className="demo__link-btn" to="/login">
                Ya tengo cuenta
              </Link>
            </div>

            <p className="demo__footer-note">
              No necesitas una cuenta. Empieza gratis.
            </p>

            <div className="demo__badges">
              <span className="demo__badge">⚡ Ejecución instantánea</span>
              <span className="demo__badge">🧑🏻‍💻 Editor profesional</span>
              <span className="demo__badge">🎯 Ejercicios reales</span>
            </div>
          </div>
        </section>
      </div>
    </MotionPage>
  )
}

export default DemoLandingPage
