import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useRole } from '../hooks/useRole'

const ROLE_LABELS = {
  user: 'Estudiante',
  instructor: 'Instructor',
  admin: 'Administrador',
}

function UnauthorizedPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { role } = useRole()
  const roleLabel = ROLE_LABELS[role] || 'Usuario'

  return (
    <div className="page">
      <div className="card unauthorized-card">
        <h1>Acceso denegado</h1>
        <p>
          No tienes permisos suficientes para ingresar a esta sección.
        </p>

        {user && (
          <p className="unauthorized-role-note">
            Sesión activa: <strong>{user.nombre || user.email}</strong> ({roleLabel})
          </p>
        )}

        <div className="unauthorized-actions">
          <button type="button" onClick={() => navigate('/dashboard')}>
            Ir al dashboard
          </button>
          {!user && (
            <button type="button" onClick={() => navigate('/login')}>
              Ir a iniciar sesión
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UnauthorizedPage
