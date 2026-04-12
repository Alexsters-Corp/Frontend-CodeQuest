import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useRole } from '../hooks/useRole'
import { apiFetch } from '../services/api'

const ROLE_LABELS = {
  user: 'Estudiante',
  instructor: 'Instructor',
  admin: 'Administrador',
}

function Navbar({ title = 'Panel de aprendizaje' }) {
  const { user, logout } = useAuth()
  const { role, isInstructor, isAdmin } = useRole()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const roleLabel = ROLE_LABELS[role] || 'Estudiante'

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
        <p className="dashboard-eyebrow">Hola, {user?.nombre || 'Estudiante'}</p>
        <h1>{title}</h1>
        <span className="dashboard-role-badge">Rol: {roleLabel}</span>
      </div>

      <div className="dashboard-header-actions">
        <button
          onClick={() => navigateTo('/dashboard')}
          className={`dashboard-nav-btn ${location.pathname.startsWith('/dashboard') ? 'dashboard-nav-btn--active' : ''}`}
          type="button"
        >
          Dashboard
        </button>

        {(isInstructor || isAdmin) && (
          <button
            onClick={() => navigateTo('/instructor')}
            className={`dashboard-nav-btn ${location.pathname.startsWith('/instructor') ? 'dashboard-nav-btn--active' : ''}`}
            type="button"
          >
            Instructor
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => navigateTo('/admin')}
            className={`dashboard-nav-btn ${location.pathname.startsWith('/admin') ? 'dashboard-nav-btn--active' : ''}`}
            type="button"
          >
            Admin
          </button>
        )}

        <button
          onClick={handleLogout}
          className="dashboard-logout-btn"
          type="button"
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
        </button>
      </div>
    </header>
  )
}

export default Navbar
