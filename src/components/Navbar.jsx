import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../services/api'

function Navbar({ title = 'Panel de aprendizaje' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
      <div>
        <p className="dashboard-eyebrow">Hola, {user?.nombre || 'Estudiante'}</p>
        <h1>{title}</h1>
      </div>
      <button
        onClick={handleLogout}
        className="dashboard-logout-btn"
        type="button"
        disabled={isLoggingOut}
      >
        {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
      </button>
    </header>
  )
}

export default Navbar
