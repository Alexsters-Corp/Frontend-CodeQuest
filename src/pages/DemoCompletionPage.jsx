import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import { getDemoPreview } from '../services/demoApi'
import { useLanguage } from '../context/useLanguage'

/**
 * Pantalla post-leccion del demo.
 * Reutiliza el patron lesson-completed (mismo shell que la pantalla de leccion
 * completada autenticada) para mantener consistencia visual y heredar
 * los breakpoints responsivos ya definidos en index.css.
 */
function DemoCompletionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, language } = useLanguage()
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const selectedLanguageSlug = searchParams.get('language') || 'python'

  useEffect(() => {
    let active = true

    async function loadPreview() {
      try {
        const data = await getDemoPreview({
          languageSlug: selectedLanguageSlug,
          locale: language,
        })
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
  }, [language, selectedLanguageSlug])

  return (
    <MotionPage className="lesson-page" delay={0.06}>
      <div className="lesson-completed lesson-completed--demo">
        <img
          src="/codey-celebrando.png"
          alt=""
          aria-hidden="true"
          className="demo__completion-mascot"
        />
        <h1>{t('demo.complete.title')}</h1>
        <h2>{t('demo.complete.subtitle')}</h2>

        <div className="demo-completion__stats">
          <div className="demo-completion__stat">
            <span className="demo-completion__stat-number">
              {loading ? t('demo.complete.loadingStat') : preview?.totalLessons ?? '+'}
            </span>
            <span className="demo-completion__stat-label">{t('demo.complete.lessonsLabel')}</span>
          </div>
          <div className="demo-completion__stat">
            <span className="demo-completion__stat-number">
              {loading ? t('demo.complete.loadingStat') : preview?.totalLanguages ?? '+'}
            </span>
            <span className="demo-completion__stat-label">{t('demo.complete.languagesLabel')}</span>
          </div>
        </div>

        {preview?.nextLessonsTitles?.length > 0 && (
          <div className="demo-completion__next">
            <h3>{t('demo.complete.nextTitle')}</h3>
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
            className="demo__link-btn ui-jitter"
            onClick={() => navigate('/')}
          >
            {t('common.backHome')}
          </button>
          <button
            type="button"
            className="demo__cta-btn ui-jitter"
            onClick={() => navigate('/registro')}
          >
            {t('demo.complete.createAccount')}
          </button>
        </div>

        <p className="demo-completion__footnote">
          {t('demo.complete.footnote')}
        </p>
      </div>
    </MotionPage>
  )
}

export default DemoCompletionPage
