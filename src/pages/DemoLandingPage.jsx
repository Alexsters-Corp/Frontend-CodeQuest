import { Link, useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'

/**
 * Pagina de bienvenida del demo publico (HU-025).
 * Reutiliza el lenguaje visual del landing principal (clases landing__*)
 * para mantener consistencia y heredar breakpoints responsivos existentes.
 */
function DemoLandingPage() {
  const navigate = useNavigate()

  return (
    <MotionPage className="landing" delay={0.05}>
      <div className="landing__container">
        <section className="landing__hero landing__hero-demo" style={{ gridTemplateColumns: '1fr', textAlign: 'center' }}>
          <div className="landing__hero-copy" style={{ margin: '0 auto', maxWidth: 720 }}>
            <span className="landing__status">Modo demo · Sin registro</span>

            <h1>
              Vas a programar
              <em> de verdad </em>
              en 30 segundos.
            </h1>

            <p>
              Una leccion completa de Python con editor profesional y ejecucion real,
              para que sientas como aprendes en CodeQuest. Sin tarjeta, sin compromisos.
            </p>

            <div className="landing__hero-actions">
              <button
                type="button"
                className="landing__cta-btn ui-jitter"
                onClick={() => navigate('/demo/lesson')}
              >
                Iniciar leccion demo
              </button>
              <Link className="landing__link-btn" to="/login">
                Ya tengo cuenta
              </Link>
            </div>

            <p className="landing__footer" style={{ marginTop: 24 }}>
              Tu progreso del demo no se guarda en el servidor. Crea una cuenta gratis para conservarlo.
            </p>
          </div>
        </section>
      </div>
    </MotionPage>
  )
}

export default DemoLandingPage
