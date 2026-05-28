import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IoMdArrowRoundDown, IoMdArrowRoundForward } from 'react-icons/io'
import { RiLoginCircleFill } from 'react-icons/ri'
import { BsLightningChargeFill } from 'react-icons/bs'
import { RiCodeSSlashLine } from 'react-icons/ri'
import { PiTargetBold } from 'react-icons/pi'
import MotionPage from '../components/MotionPage'
import LogoCQ from '../components/LogoCQ'
import ScrollToTopButton from '../components/ScrollToTopButton'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'

const MotionArticle = motion.article
const MotionAside = motion.aside

function HomePage() {
  const { isAuthenticated } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [activeSection, setActiveSection] = useState('')
  const [langOpen, setLangOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const highlightTimeoutRef = useRef(null)

  const featureCards = useMemo(() => ([
    {
      title: t('home.card.editor.title'),
      description: t('home.card.editor.description'),
      snippet: "const mission = 'Learn Code';\nexecute(mission);",
    },
    {
      title: t('home.card.gamified.title'),
      description: t('home.card.gamified.description'),
      snippet: 'Current quest: Data Structures II',
    },
    {
      title: t('home.card.certs.title'),
      description: t('home.card.certs.description'),
      snippet: 'Verified by partner companies',
    },
  ]), [t])

  const heroHighlights = useMemo(() => ([
    {
      key: 'instant',
      number: '01',
      icon: <BsLightningChargeFill aria-hidden="true" />,
      title: t('home.hero.highlight.instantTitle'),
      description: t('home.hero.highlight.instantDescription'),
    },
    {
      key: 'editor',
      number: '02',
      icon: <RiCodeSSlashLine aria-hidden="true" />,
      title: t('home.hero.highlight.editorTitle'),
      description: t('home.hero.highlight.editorDescription'),
    },
    {
      key: 'exercises',
      number: '03',
      icon: <PiTargetBold aria-hidden="true" />,
      title: t('home.hero.highlight.exerciseTitle'),
      description: t('home.hero.highlight.exerciseDescription'),
    },
  ]), [t])

  useEffect(() => {
    if (!langOpen) return undefined

    const close = () => setLangOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [langOpen])

  const scrollTo = (id) => {
    const target = document.getElementById(id)
    if (!target) return

    setActiveSection(id)
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
    highlightTimeoutRef.current = setTimeout(() => setActiveSection(''), 900)

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targetY = target.getBoundingClientRect().top + window.scrollY - 20

    window.scrollTo({
      top: targetY,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })

    setMobileMenuOpen(false)
  }

  const langDropdown = (
    <div className="sidebar-lang-dropdown landing__lang-dropdown">
      <button
        type="button"
        className="sidebar-lang-dropdown__trigger"
        onClick={(event) => {
          event.stopPropagation()
          setLangOpen((prev) => !prev)
        }}
      >
        🌐 {language === 'es' ? 'Español' : 'English'}
        <IoMdArrowRoundDown className={`sidebar-lang-dropdown__arrow${langOpen ? ' sidebar-lang-dropdown__arrow--open' : ''}`} />
      </button>
      {langOpen && (
        <div className="sidebar-lang-dropdown__menu">
          <button
            type="button"
            className={`sidebar-lang-dropdown__option${language === 'es' ? ' sidebar-lang-dropdown__option--active' : ''}`}
            onClick={() => { setLanguage('es'); setLangOpen(false) }}
          >
            Español
          </button>
          <div className="sidebar-lang-dropdown__separator" aria-hidden="true" />
          <button
            type="button"
            className={`sidebar-lang-dropdown__option${language === 'en' ? ' sidebar-lang-dropdown__option--active' : ''}`}
            onClick={() => { setLanguage('en'); setLangOpen(false) }}
          >
            English
          </button>
        </div>
      )}
    </div>
  )

  return (
    <MotionPage className="landing" delay={0.05}>
      <div className="landing__container">
        {mobileMenuOpen && (
          <button
            type="button"
            className="landing__mobile-backdrop"
            aria-label="Cerrar menu movil"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <header className="landing__header">
          <div className="landing__brand">
            <LogoCQ height={35} />
          </div>

          <nav className="landing__nav">
            <button type="button" onClick={() => scrollTo('features')}>{t('home.nav.modules')}</button>
            <button type="button" onClick={() => scrollTo('pricing')}>{t('home.nav.roadmap')}</button>
          </nav>

          <div className="landing__actions">
            {langDropdown}
          </div>

          <div className="landing__mobile-tools">
            {langDropdown}
            <button
              type="button"
              className={`landing__menu-toggle${mobileMenuOpen ? ' landing__menu-toggle--open' : ''}`}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
              aria-label={mobileMenuOpen ? 'Cerrar menu de navegacion' : 'Abrir menu de navegacion'}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          <div
            id="landing-mobile-menu"
            className={`landing__mobile-menu${mobileMenuOpen ? ' landing__mobile-menu--open' : ''}`}
          >
            <nav className="landing__mobile-nav">
              <button type="button" onClick={() => scrollTo('features')}>{t('home.nav.modules')}</button>
              <button type="button" onClick={() => scrollTo('pricing')}>{t('home.nav.roadmap')}</button>
            </nav>
          </div>
        </header>

        <section className={`landing__hero ${activeSection === 'about' ? 'landing-section--targeted' : ''}`} id="about">
          <div className="landing__hero-copy">
            <span className="landing__status">{t('home.status')}</span>
            <h1 className="landing__hero-title">
              <span className="landing__hero-line">{t('home.hero.titleLine1')}</span>
              <em>
                <span className="landing__hero-line">{t('home.hero.titleLine2a')}</span>
                <span className="landing__hero-line landing__hero-terminal">{t('home.hero.titleLine2b')}</span>
              </em>
              <span className="landing__hero-terminal-stroke" aria-hidden="true" />
            </h1>
            <p>
              {t('home.hero.description')}
            </p>

            <div className="landing__hero-actions">
              <Link className="landing__cta-btn landing__hero-login-btn ui-jitter" to={isAuthenticated ? '/dashboard' : '/login'}>
                <span>{isAuthenticated ? t('home.goDashboard') : t('home.login')}</span>
                <RiLoginCircleFill aria-hidden="true" />
              </Link>
              <Link className="landing__link-btn landing__hero-start-btn" to="/demo">
                <span>{t('home.hero.start')}</span>
                <IoMdArrowRoundForward aria-hidden="true" />
              </Link>
            </div>

            <p className="landing__companies">{t('home.hero.companies')}</p>
            <div className="landing__company-row" aria-hidden="true">
              <span>Alexsters Corp</span>
            </div>
          </div>

          <MotionAside
            className="landing__auth-preview landing__auth-preview--highlights"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            {heroHighlights.map((item, index) => (
              <MotionArticle
                key={item.key}
                className="landing__hero-side-card"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.14 + (index * 0.08) }}
              >
                <span className="landing__hero-side-card-icon">{item.icon}</span>
                <div className="landing__hero-side-card-copy">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </MotionArticle>
            ))}
          </MotionAside>
        </section>

        <section className={`landing__feature-section ${activeSection === 'features' ? 'landing-section--targeted' : ''}`} id="features">
          <div className="landing__feature-head">
            <h2>{t('home.feature.headline')}</h2>
            <p>
              {t('home.feature.description')}
            </p>
          </div>

          <div className="landing__feature-grid">
            {featureCards.map((card, index) => (
              <MotionArticle
                key={card.title}
                className="landing__feature-card"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <pre>{card.snippet}</pre>
              </MotionArticle>
            ))}
          </div>
        </section>

        <section className={`landing__showcase ${activeSection === 'pricing' ? 'landing-section--targeted' : ''}`} id="pricing">
          <div className="landing__showcase-copy">
            <h2>
              {t('home.showcase.titleLine1')}
              <em>{t('home.showcase.titleLine2')}</em>
            </h2>
            <ul>
              <li>{t('home.showcase.item1')}</li>
              <li>{t('home.showcase.item2')}</li>
              <li>{t('home.showcase.item3')}</li>
            </ul>
          </div>

          <div className="landing__showcase-screen" aria-hidden="true">
            <span>{t('home.showcase.badge')}</span>
            <strong>{t('home.showcase.label')}</strong>
          </div>
        </section>

        <footer className="landing__footer">
          <strong>CodeQuest</strong>
          <span>© 2026 CodeQuest. {t('home.footer')}</span>
        </footer>
      </div>
      <ScrollToTopButton />
    </MotionPage>
  )
}

export default HomePage
