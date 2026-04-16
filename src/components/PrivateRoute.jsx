import { Navigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'

/**
 * Envuelve rutas que requieren autenticación.
 * Mientras carga, muestra un spinner; si no hay sesión, redirige al login.
 */
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center' }}>
          <p>{t('route.loading')}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired
}

export default PrivateRoute
