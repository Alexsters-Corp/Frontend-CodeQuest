import { Navigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'

/**
 * Rutas públicas (login, registro).
 * Si el usuario ya está autenticado, redirige al dashboard.
 */
function PublicRoute({ children }) {
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

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

PublicRoute.propTypes = {
  children: PropTypes.node.isRequired
}

export default PublicRoute
