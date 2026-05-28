import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import LogoCQ from '../components/LogoCQ'
import { useLanguage } from '../context/useLanguage'
import { IoMdArrowRoundDown } from 'react-icons/io'

function DemoLandingPage() {
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)

  const languages = [
    { key: 'python', slug: 'python', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
    { key: 'javascript', slug: 'javascript', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
    { key: 'java', slug: 'java', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg' },
    { key: 'cpp', slug: 'cpp', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg' },
    { key: 'csharp', slug: 'csharp', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg' },
  ]
  const languageGridClassName = `demo-lang-grid${languages.length === 5 ? ' demo-lang-grid--five' : ''}${languages.length > 5 ? ' demo-lang-grid--multi' : ''}`

  useEffect(() => {
    if (!langOpen) return undefined

    const close = () => setLangOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [langOpen])

  return (
    <MotionPage className="demo__page" delay={0.05}>
      <header className="demo__header">
        <Link to="/" className="demo__brand-link" aria-label={t('demo.header.backHome')}>
          <LogoCQ height={35} />
        </Link>

        <div className="sidebar-lang-dropdown demo__lang-dropdown">
          <button
            type="button"
            className="sidebar-lang-dropdown__trigger"
            onClick={(event) => {
              event.stopPropagation()
              setLangOpen((prev) => !prev)
            }}
          >
            🌐 {language === 'es' ? t('language.es') : t('language.en')}
            <IoMdArrowRoundDown className={`sidebar-lang-dropdown__arrow${langOpen ? ' sidebar-lang-dropdown__arrow--open' : ''}`} />
          </button>
          {langOpen && (
            <div className="sidebar-lang-dropdown__menu">
              <button
                type="button"
                className={`sidebar-lang-dropdown__option${language === 'es' ? ' sidebar-lang-dropdown__option--active' : ''}`}
                onClick={() => { setLanguage('es'); setLangOpen(false) }}
              >
                {t('language.es')}
              </button>
              <div className="sidebar-lang-dropdown__separator" aria-hidden="true" />
              <button
                type="button"
                className={`sidebar-lang-dropdown__option${language === 'en' ? ' sidebar-lang-dropdown__option--active' : ''}`}
                onClick={() => { setLanguage('en'); setLangOpen(false) }}
              >
                {t('language.en')}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="demo__page-wrapper">

        {/* Contenido centrado — igual que antes */}
        <section className="demo__hero-section">
          <div className="demo__hero-copy">
            <div className="demo__hero-heading">
              <h1 className="demo__hero-title">
                {t('demo.hero.titleLine1')}
                <em> {t('demo.hero.titleLine2')}</em>
              </h1>

              <p className="demo__hero-subtitle">{t('demo.hero.subtitle')}</p>
            </div>

            <div className="demo__lang-scroll-wrapper">
              <div className="demo__lang-scroll">
                <div className={languageGridClassName}>
                  {languages.map((lang) => (
                    <button
                      key={lang.key}
                      type="button"
                      className="demo-lang-card"
                      onClick={() => navigate(`/demo/lesson?language=${encodeURIComponent(lang.slug)}`)}
                    >
                      <img src={lang.logo} alt={t(`demo.language.${lang.key}`)} />
                      <span className="demo-lang-card__name">{t(`demo.language.${lang.key}`)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="demo__scroll-hint" aria-hidden="true">▼</div>
            </div>

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
