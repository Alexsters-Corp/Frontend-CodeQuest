import PropTypes from 'prop-types'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useLanguage } from '../../context/useLanguage'
import { normalizeRole } from '../../utils/permissions'

function RoleGuard({ children, allowedRoles }) {
  const { user, loading } = useAuth()
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

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const currentRole = normalizeRole(user.role)
  const normalizedAllowed = allowedRoles.map(normalizeRole)

  if (!normalizedAllowed.includes(currentRole)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

RoleGuard.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
}

RoleGuard.defaultProps = {
  allowedRoles: ['user', 'instructor', 'admin'],
}

export default RoleGuard
