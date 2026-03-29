import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Rutas públicas (login, registro).
 * Si el usuario ya está autenticado, redirige al dashboard.
 */
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center' }}>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default PublicRoute
