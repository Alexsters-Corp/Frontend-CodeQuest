import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { IoMdArrowRoundDown } from 'react-icons/io'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { useRole } from '../hooks/useRole'
import { notifyPending } from '../utils/notify'
import { apiFetch } from '../services/api'
import LogoCQ from './LogoCQ'
import LanguageSwitcher from './LanguageSwitcher'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { isInstructor, isAdmin } = useRole()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const showDeferredDashboardSections = false

  useEffect(() => {
    if (!langOpen) return
    const close = () => setLangOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [langOpen])

  const navBtn = (path) =>
    `dashboard-nav-btn${location.pathname.startsWith(path) ? ' dashboard-nav-btn--active' : ''}`

  const goToDashboardSection = (sectionId) => {
    if (location.pathname === '/dashboard') {
      const target = document.getElementById(sectionId)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      return
    }
    navigate(`/dashboard#${sectionId}`)
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout server error:', error)
    } finally {
      logout()
      window.location.href = '/'
    }
  }

  const handleOnboarding = () => {
    notifyPending(t('dashboard.addLanguageHint'), { rateLimitKey: 'add-language', rateLimitMs: 3000 })
    navigate('/onboarding/language')
  }

  const langDropdown = (
    <div className="sidebar-lang-dropdown">
      <button
        type="button"
        className="sidebar-lang-dropdown__trigger"
        onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen) }}
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

  const mobilePortal = createPortal(
    <>
      {/* Top bar móvil */}
      <header className="mobile-header">
        <LogoCQ height={32} />
        {langDropdown}
      </header>

      {/* Bottom nav móvil */}
      <nav className="mobile-bottom-nav" aria-label="Navegación principal">
        <button type="button" className="mobile-bottom-nav__item" onClick={() => navigate('/dashboard')}>
          <span className="mobile-bottom-nav__icon">🏠</span>
          <span className="mobile-bottom-nav__label">{t('dashboard.sidebar.languages')}</span>
        </button>
        <button type="button" className="mobile-bottom-nav__item" onClick={() => navigate('/favorites')}>
          <span className="mobile-bottom-nav__icon">⭐</span>
          <span className="mobile-bottom-nav__label">{t('dashboard.sidebar.favorites')}</span>
        </button>
        <button type="button" className="mobile-bottom-nav__item" onClick={() => navigate('/ranking?scope=global')}>
          <span className="mobile-bottom-nav__icon">🥇</span>
          <span className="mobile-bottom-nav__label">{t('dashboard.sidebar.ranking')}</span>
        </button>
        <button type="button" className="mobile-bottom-nav__item" onClick={() => navigate('/social')}>
          <span className="mobile-bottom-nav__icon">👥</span>
          <span className="mobile-bottom-nav__label">{t('dashboard.sidebar.followers')}</span>
        </button>
        <button type="button" className="mobile-bottom-nav__item" onClick={() => navigate('/profile')}>
          <span className="mobile-bottom-nav__icon">👤</span>
          <span className="mobile-bottom-nav__label">{t('nav.profile')}</span>
        </button>
      </nav>
    </>,
    document.body
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__logo-container">
          <LogoCQ height={34} />
        </div>

        <div className="dashboard-sidebar__lang">
          {langDropdown}
        </div>

        <div className="dashboard-sidebar__menu-block">
          <h2>{t('dashboard.sidebar.navigate')}</h2>
          <ul className="dashboard-sidebar-nav">
            <li>
              <button type="button" className={navBtn('/dashboard')} onClick={() => navigate('/dashboard')} title={t('dashboard.sidebar.languages')}>
                <span className="nav-icon">🏠</span>
                {t('dashboard.sidebar.languages')}
              </button>
            </li>
            {/* Nota para futuras IAs: no eliminar esta sección ni sus contenedores de "Logros" y "Actividad".
                Se ocultan temporalmente en frontend por regla de producto, pero se reactivarán cuando esta área escale. */}
            {showDeferredDashboardSections && (
              <>
                <li>
                  <button type="button" className="dashboard-nav-btn" onClick={() => goToDashboardSection('dashboard-achievements')} title={t('dashboard.sidebar.achievements')}>
                    <span className="nav-icon">🏆</span>
                    {t('dashboard.sidebar.achievements')}
                  </button>
                </li>
                <li>
                  <button type="button" className="dashboard-nav-btn" onClick={() => goToDashboardSection('dashboard-activity')} title={t('dashboard.sidebar.activity')}>
                    <span className="nav-icon">📊</span>
                    {t('dashboard.sidebar.activity')}
                  </button>
                </li>
              </>
            )}
            <li>
              <button type="button" className={navBtn('/favorites')} onClick={() => navigate('/favorites')} title={t('dashboard.sidebar.favorites')}>
                <span className="nav-icon">⭐</span>
                {t('dashboard.sidebar.favorites')}
              </button>
            </li>
            <li>
              <button type="button" className={navBtn('/ranking')} onClick={() => navigate('/ranking?scope=global')} title={t('dashboard.sidebar.ranking')}>
                <span className="nav-icon">🥇</span>
                {t('dashboard.sidebar.ranking')}
              </button>
            </li>
            <li>
              <button type="button" className={navBtn('/social')} onClick={() => navigate('/social')} title={t('dashboard.sidebar.followers')}>
                <span className="nav-icon">👥</span>
                {t('dashboard.sidebar.followers')}
              </button>
            </li>
            {(isInstructor || isAdmin) && (
              <li>
                <button type="button" className={navBtn('/instructor')} onClick={() => navigate('/instructor')} title={t('nav.instructor')}>
                  <span className="nav-icon">👨‍🏫</span>
                  {t('nav.instructor')}
                </button>
              </li>
            )}
            {isAdmin && (
              <li>
                <button type="button" className={navBtn('/admin')} onClick={() => navigate('/admin')} title={t('nav.admin')}>
                  <span className="nav-icon">🛡️</span>
                  {t('nav.admin')}
                </button>
              </li>
            )}
            <li>
              <button type="button" className="dashboard-nav-btn" onClick={handleOnboarding} title={t('dashboard.sidebar.onboarding')}>
                <span className="nav-icon">➕</span>
                {t('dashboard.sidebar.onboarding')}
              </button>
            </li>
          </ul>
        </div>

        <div className="dashboard-sidebar__account-block">
          <h3>{t('dashboard.sidebar.accountActions')}</h3>
          <div className="dashboard-sidebar__account-actions">
            <button type="button" className={navBtn('/profile')} onClick={() => navigate('/profile')} title={t('nav.profile')}>
              <span className="nav-icon">👤</span>
              {t('nav.profile')}
            </button>
            <button
              className="dashboard-logout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title={t('nav.logout')}
            >
              <span className="nav-icon">🚪</span>
              {isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile: header + bottom nav vía portal */}
      {mobilePortal}
    </>
  )
}
