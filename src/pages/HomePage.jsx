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
          <a onClick={() => document.getElementById('como-funciona').scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>Como funciona</a>
          <a onClick={() => document.getElementById('beneficios').scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>Beneficios</a>
          <a onClick={() => document.getElementById('ruta').scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>Ruta</a>
          </nav>

          <div className="homepage__actions">
            <Link className="homepage__action homepage__action--ghost" to="/login">
              Iniciar sesion
            </Link>
            <Link
              className="homepage__action homepage__action--primary"
              to={isAuthenticated ? '/dashboard' : '/registro'}
            >
              {isAuthenticated ? 'Entrar' : 'Crear cuenta'}
            </Link>
          </div>
        </header>

        <main className="homepage__hero">
          <section className="homepage__intro">
            <span className="homepage__eyebrow">Plataforma de aprendizaje para programacion</span>
            <h1>Aprende un lenguaje con una ruta clara, medible y adaptada a tu nivel.</h1>
            <p className="homepage__lead">
              Elige tu lenguaje, desbloquea modulos segun tu progreso y sigue tu avance
              desde un panel pensado para estudiar con foco.
            </p>

            <div className="homepage__mini-stats">
              <div className="homepage__mini-stat">
                <strong>Inicio guiado</strong>
                <span>Selecciona lenguaje y ruta en segundos.</span>
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
              La ruta sugerida evita que arranques desde cero si ya tienes base y tambien evita saltos
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
              <h3>Selecciona tu ruta</h3>
              <p>El sistema te propone una ruta inicial y guarda tu progreso por lenguaje.</p>
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
