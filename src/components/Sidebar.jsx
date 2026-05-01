import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
// import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { useRole } from '../hooks/useRole'
import { notifyPending } from '../utils/notify'
import { apiFetch } from '../services/api'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const { t } = useLanguage()
  const { isInstructor, isAdmin } = useRole()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed)
    document.body.classList.toggle('sidebar-is-collapsed', isCollapsed)
  }, [isCollapsed])

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)

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
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout server error:', error)
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  const handleOnboarding = () => {
    notifyPending(t('dashboard.addLanguageHint'))
    navigate('/onboarding/language')
  }

  return (
    <aside className={`dashboard-sidebar ${isCollapsed ? 'dashboard-sidebar--collapsed' : ''}`}>
      <div className="dashboard-sidebar__logo-container">
        <motion.button
          type="button"
          className="dashboard-sidebar__toggle"
          onClick={toggleSidebar}
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          aria-label="Toggle Sidebar"
        >
        <span className="landing__brand-mark">&lt;/&gt;</span>
        </motion.button>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              className="dashboard-sidebar__logo-text"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              CodeQuest
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="dashboard-sidebar__menu-block">
        {!isCollapsed && <h2>{t('dashboard.sidebar.navigate')}</h2>}
        <ul className="dashboard-sidebar-nav">
          <li>
            <button type="button" className="dashboard-nav-btn" onClick={() => goToDashboardSection('dashboard-languages')} title={t('dashboard.sidebar.languages')}>
              <span className="nav-icon">🌐</span>
              {!isCollapsed && t('dashboard.sidebar.languages')}
            </button>
          </li>
          <li>
            <button type="button" className="dashboard-nav-btn" onClick={() => goToDashboardSection('dashboard-achievements')} title={t('dashboard.sidebar.achievements')}>
              <span className="nav-icon">🏆</span>
              {!isCollapsed && t('dashboard.sidebar.achievements')}
            </button>
          </li>
          <li>
            <button type="button" className="dashboard-nav-btn" onClick={() => goToDashboardSection('dashboard-activity')} title={t('dashboard.sidebar.activity')}>
              <span className="nav-icon">📊</span>
              {!isCollapsed && t('dashboard.sidebar.activity')}
            </button>
          </li>
          <li>
            <button type="button" className="dashboard-nav-btn" onClick={() => navigate('/favorites')} title={t('dashboard.sidebar.favorites')}>
              <span className="nav-icon">⭐</span>
              {!isCollapsed && t('dashboard.sidebar.favorites')}
            </button>
          </li>
          <li>
            <button type="button" className="dashboard-nav-btn" onClick={() => navigate('/ranking?scope=global')} title={t('dashboard.sidebar.ranking')}>
              <span className="nav-icon">🥇</span>
              {!isCollapsed && t('dashboard.sidebar.ranking')}
            </button>
          </li>
          <li>
            <button type="button" className="dashboard-nav-btn" onClick={() => navigate('/social')} title={t('dashboard.sidebar.followers')}>
              <span className="nav-icon">👥</span>
              {!isCollapsed && t('dashboard.sidebar.followers')}
            </button>
          </li>
          {(isInstructor || isAdmin) && (
            <li>
              <button type="button" className="dashboard-nav-btn" onClick={() => navigate('/instructor')} title={t('nav.instructor')}>
                <span className="nav-icon">👨‍🏫</span>
                {!isCollapsed && t('nav.instructor')}
              </button>
            </li>
          )}
          {isAdmin && (
            <li>
              <button type="button" className="dashboard-nav-btn" onClick={() => navigate('/admin')} title={t('nav.admin')}>
                <span className="nav-icon">🛡️</span>
                {!isCollapsed && t('nav.admin')}
              </button>
            </li>
          )}
          <li>
            <button
              type="button"
              className="dashboard-nav-btn"
              onClick={handleOnboarding}
              title={t('dashboard.sidebar.onboarding')}
            >
              <span className="nav-icon">➕</span>
              {!isCollapsed && t('dashboard.sidebar.onboarding')}
            </button>
          </li>
        </ul>
      </div>

      <div className="dashboard-sidebar__account-block">
        {!isCollapsed && <h3>{t('dashboard.sidebar.accountActions')}</h3>}
        <div className="dashboard-sidebar__account-actions">
          <button type="button" className="dashboard-nav-btn" onClick={() => navigate('/profile')} title={t('nav.profile')}>
            <span className="nav-icon">👤</span>
            {!isCollapsed && t('nav.profile')}
          </button>
          <button
            className="dashboard-logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={t('nav.logout')}
          >
            <span className="nav-icon">🚪</span>
            {!isCollapsed && (isLoggingOut ? t('nav.loggingOut') : t('nav.logout'))}
          </button>
        </div>
      </div>
    </aside>
  )
}

