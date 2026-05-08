import { Link, useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import LogoCQ from '../components/LogoCQ'

const LANGUAGES = [
  { name: 'Python',     logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
  { name: 'JavaScript', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
  { name: 'Java',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg' },
  { name: 'C++',        logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg' },
  { name: 'C#',         logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg' },
  { name: 'Go',         logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg' },
  { name: 'Ruby',       logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg' },
]

function DemoLandingPage() {
  const navigate = useNavigate()

  return (
    <MotionPage className="demo__page" delay={0.05}>
      <Link to="/" className="demo__brand-link" aria-label="Volver al inicio">
        <LogoCQ height={34} />
      </Link>

      <div className="demo__page-wrapper">

        {/* Contenido centrado — igual que antes */}
        <section className="demo__hero-section">
          <div className="demo__hero-copy">
            <Link to="/" className="demo__brand-mobile" aria-label="Volver al inicio">
              <LogoCQ height={28} />
            </Link>

            <h1 className="demo__hero-title">
              Empieza a programar
              <em> ahora mismo</em>
            </h1>

            <p className="demo__hero-subtitle">Elige tu primer lenguaje</p>

            <div className="demo__lang-scroll-wrapper">
              <div className="demo__lang-scroll">
                <div className="demo-lang-grid">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.name}
                      type="button"
                      className="demo-lang-card"
                      onClick={() => navigate('/demo/lesson')}
                    >
                      <img src={lang.logo} alt={lang.name} />
                      <span className="demo-lang-card__name">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="demo__scroll-hint" aria-hidden="true">▼</div>
            </div>

            <div className="demo__badges">
              <span className="demo__badge">⚡ Ejecución instantánea</span>
              <span className="demo__badge">🧑🏻‍💻 Editor profesional</span>
              <span className="demo__badge">🎯 Ejercicios reales</span>
            </div>

            <p className="demo__footer-note">
              No necesitas una cuenta. Empieza gratis.
            </p>
          </div>
        </section>

        {/* Mascota fuera del contenido — a la derecha en desktop, abajo en móvil */}
        <div className="demo__mascot-container">
          <img
            src="/codey-saludando.png"
            alt=""
            aria-hidden="true"
            className="demo__mascot"
          />
        </div>

      </div>
    </MotionPage>
  )
}

export default DemoLandingPage
