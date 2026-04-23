import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { useRole } from '../hooks/useRole'
import { apiFetch } from '../services/api'

const DEFAULT_AVATAR = '🙂'

function Navbar({
  title,
  profileActionLabel,
  profileActionTo,
}) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const { role, isInstructor, isAdmin } = useRole()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const roleLabel = ['user', 'instructor', 'admin'].includes(role)
    ? t(`roles.${role}`)
    : t('roles.unknown')
  const profileAvatar = String(user?.avatar || '').trim() || DEFAULT_AVATAR
  const resolvedTitle = title || t('dashboard.title')
  const resolvedProfileActionLabel = profileActionLabel || t('nav.profile')
  const resolvedProfileActionTo = profileActionTo || '/profile'

  const navigateTo = (path) => {
    if (location.pathname !== path) {
      navigate(path)
    }
  }

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      // Si falla backend, cerrar sesión local igualmente
      console.error('Error al cerrar sesión en el servidor:', error)
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-main">
        <span className="navbar-avatar" aria-hidden="true">{profileAvatar}</span>
        <p className="dashboard-eyebrow">{t('nav.greeting', { name: user?.nombre || t('nav.defaultName') })}</p>
        <h1>{resolvedTitle}</h1>
        <span className="dashboard-role-badge">{t('nav.role', { role: roleLabel })}</span>
      </div>

      <div className="dashboard-header-actions">
        {(isInstructor || isAdmin) && (
          <button
            onClick={() => navigateTo('/instructor')}
            className={`dashboard-nav-btn ${location.pathname.startsWith('/instructor') ? 'dashboard-nav-btn--active' : ''}`}
            type="button"
          >
            {t('nav.instructor')}
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => navigateTo('/admin')}
            className={`dashboard-nav-btn ${location.pathname.startsWith('/admin') ? 'dashboard-nav-btn--active' : ''}`}
            type="button"
          >
            {t('nav.admin')}
          </button>
        )}

        <button
          onClick={() => navigateTo('/ranking')}
          className={`dashboard-nav-btn ${location.pathname.startsWith('/ranking') ? 'dashboard-nav-btn--active' : ''}`}
          type="button"
        >
          {t('nav.ranking')}
        </button>

        <button
          onClick={() => navigateTo(resolvedProfileActionTo)}
          className={`dashboard-nav-btn ${location.pathname.startsWith('/profile') ? 'dashboard-nav-btn--active' : ''}`}
          type="button"
        >
          {resolvedProfileActionLabel}
        </button>

        <button
          onClick={handleLogout}
          className="dashboard-logout-btn"
          type="button"
          disabled={isLoggingOut}
        >
          {isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
        </button>
      </div>
    </header>
  )
}

export default Navbar
