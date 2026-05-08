import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import { getDemoPreview } from '../services/demoApi'

/**
 * Pantalla post-leccion del demo.
 * Reutiliza el patron lesson-completed (mismo shell que la pantalla de leccion
 * completada autenticada) para mantener consistencia visual y heredar
 * los breakpoints responsivos ya definidos en index.css.
 */
function DemoCompletionPage() {
  const navigate = useNavigate()
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadPreview() {
      try {
        const data = await getDemoPreview()
        if (active) {
          setPreview(data)
        }
      } catch {
        if (active) {
          setPreview({
            totalLessons: null,
            totalLanguages: null,
            languages: [],
            nextLessonsTitles: [],
          })
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPreview()
    return () => {
      active = false
    }
  }, [])

  return (
    <MotionPage className="lesson-page" delay={0.06}>
      <div className="lesson-completed lesson-completed--demo">
        <img
          src="/codey-celebrando.png"
          alt=""
          aria-hidden="true"
          className="demo__completion-mascot"
        />
        <h1>¡Felicidades!</h1>
        <h2>Acabas de completar tu primera leccion en CodeQuest.</h2>

        <div className="demo-completion__stats">
          <div className="demo-completion__stat">
            <span className="demo-completion__stat-number">
              {loading ? '...' : preview?.totalLessons ?? '+'}
            </span>
            <span className="demo-completion__stat-label">lecciones esperandote</span>
          </div>
          <div className="demo-completion__stat">
            <span className="demo-completion__stat-number">
              {loading ? '...' : preview?.totalLanguages ?? '+'}
            </span>
            <span className="demo-completion__stat-label">lenguajes disponibles</span>
          </div>
        </div>

        {preview?.nextLessonsTitles?.length > 0 && (
          <div className="demo-completion__next">
            <h3>Lo que te espera al registrarte:</h3>
            <ul>
              {preview.nextLessonsTitles.map((title, idx) => (
                <li key={idx}>
                  <span aria-hidden="true">🔒</span> {title}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="completed-actions">
          <button
            type="button"
            className="demo__cta-btn ui-jitter"
            onClick={() => navigate('/registro')}
          >
            Crear mi cuenta gratis
          </button>
        </div>

        <p className="demo-completion__footnote">
          Puedes crear tu cuenta gratis cuando quieras.
        </p>
      </div>
    </MotionPage>
  )
}

export default DemoCompletionPage
