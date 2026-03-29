import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="homepage">
      <div className="homepage__orb homepage__orb--one" />
      <div className="homepage__orb homepage__orb--two" />

      <div className="homepage__shell">
        <header className="homepage__header">
          <div className="homepage__brand">
            <span className="homepage__brand-mark">&lt;/&gt;</span>
            <span className="homepage__brand-text">Ruta de aprendizaje</span>
          </div>

          <nav className="homepage__nav">
            <a href="#como-funciona">Como funciona</a>
            <a href="#beneficios">Beneficios</a>
            <a href="#ruta">Ruta</a>
          </nav>

          <div className="homepage__actions">
            <Link className="homepage__action homepage__action--ghost" to="/login">
              Iniciar sesion
            </Link>
            <Link
              className="homepage__action homepage__action--primary"
              to={isAuthenticated ? '/dashboard' : '/registro'}
            >
              {isAuthenticated ? 'Ir al dashboard' : 'Crear cuenta'}
            </Link>
          </div>
        </header>

        <main className="homepage__hero">
          <section className="homepage__intro">
            <span className="homepage__eyebrow">Plataforma de aprendizaje para programacion</span>
            <h1>Aprende un lenguaje con una ruta clara, medible y adaptada a tu nivel.</h1>
            <p className="homepage__lead">
              Empieza con un diagnostico, desbloquea modulos segun tu conocimiento y sigue tu avance
              desde un panel pensado para estudiar con foco.
            </p>

            <div className="homepage__cta-row">
              <Link className="homepage__cta homepage__cta--primary" to={isAuthenticated ? '/dashboard' : '/registro'}>
                {isAuthenticated ? 'Continuar aprendizaje' : 'Empezar ahora'}
              </Link>
              <Link className="homepage__cta homepage__cta--secondary" to="/login">
                Ya tengo cuenta
              </Link>
            </div>

            <div className="homepage__mini-stats">
              <div className="homepage__mini-stat">
                <strong>Diagnostico inicial</strong>
                <span>Determina desde donde empezar.</span>
              </div>
              <div className="homepage__mini-stat">
                <strong>Modulos guiados</strong>
                <span>Lecciones y ejercicios por progreso.</span>
              </div>
              <div className="homepage__mini-stat">
                <strong>XP y nivel</strong>
                <span>Seguimiento visible de tu avance.</span>
              </div>
            </div>
          </section>
        </main>

        <section className="homepage__features" id="beneficios">
          <article className="homepage__feature-card">
            <span className="homepage__feature-tag">Personalizado</span>
            <h3>Empiezas segun tu nivel real</h3>
            <p>
              El diagnostico evita que arranques desde cero si ya tienes base y tambien evita saltos
              demasiado grandes.
            </p>
          </article>
          <article className="homepage__feature-card">
            <span className="homepage__feature-tag">Claro</span>
            <h3>Sabes que sigue despues</h3>
            <p>
              La ruta marca modulos disponibles, progreso actual y proximos pasos para que no estudies
              sin direccion.
            </p>
          </article>
          <article className="homepage__feature-card">
            <span className="homepage__feature-tag">Motivacion</span>
            <h3>Tu avance se ve y se siente</h3>
            <p>
              XP, racha, nivel y logros convierten el avance en algo visible y facil de retomar cada dia.
            </p>
          </article>
        </section>

        <section className="homepage__steps" id="como-funciona">
          <div className="homepage__section-heading">
            <span>Como funciona</span>
            <h2>Una entrada simple, una ruta clara y seguimiento constante.</h2>
          </div>

          <div className="homepage__step-grid">
            <article className="homepage__step-card">
              <strong>01</strong>
              <h3>Crea tu cuenta</h3>
              <p>Entras a la plataforma y eliges el lenguaje que quieres aprender.</p>
            </article>
            <article className="homepage__step-card">
              <strong>02</strong>
              <h3>Completa el diagnostico</h3>
              <p>La plataforma mide tu nivel y ajusta tu punto de partida.</p>
            </article>
            <article className="homepage__step-card" id="ruta">
              <strong>03</strong>
              <h3>Avanza con tu dashboard</h3>
              <p>Sigues modulos, entras a lecciones y controlas tu progreso desde un mismo lugar.</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}

export default HomePage