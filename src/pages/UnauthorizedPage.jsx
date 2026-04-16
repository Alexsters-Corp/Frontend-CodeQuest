import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { useRole } from '../hooks/useRole'

function UnauthorizedPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { role } = useRole()
  const { t } = useLanguage()
  const roleLabel = ['user', 'instructor', 'admin'].includes(role)
    ? t(`roles.${role}`)
    : t('roles.unknown')

  return (
    <MotionPage className="page" delay={0.05}>
      <div className="card unauthorized-card unauthorized-card--modern">
        <h1>{t('unauthorized.title')}</h1>
        <p>
          {t('unauthorized.message')}
        </p>

        {user && (
          <p className="unauthorized-role-note">
            {t('unauthorized.activeSession')}: <strong>{user.nombre || user.email}</strong> ({roleLabel})
          </p>
        )}

        <div className="unauthorized-actions">
          <button type="button" onClick={() => navigate('/dashboard')}>
            {t('unauthorized.gotoDashboard')}
          </button>
          {!user && (
            <button type="button" onClick={() => navigate('/login')}>
              {t('unauthorized.gotoLogin')}
            </button>
          )}
        </div>
      </div>
    </MotionPage>
  )
}

export default UnauthorizedPage
