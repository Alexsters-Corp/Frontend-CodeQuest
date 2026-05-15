import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { useRole } from '../hooks/useRole'

const DEFAULT_AVATAR = '🙂'

function Navbar({
  title,
  headerAside = null,
}) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { role } = useRole()

  const roleLabel = ['user', 'instructor', 'admin'].includes(role)
    ? t(`roles.${role}`)
    : t('roles.unknown')
  const profileAvatar = String(user?.avatar || '').trim() || DEFAULT_AVATAR
  const resolvedTitle = title || t('dashboard.title')

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-main">
        <span className="navbar-avatar" aria-hidden="true">{profileAvatar}</span>
        <div className="dashboard-header-text">
          <h1>{resolvedTitle}</h1>
          <span className="dashboard-role-badge">{t('nav.role', { role: roleLabel })}</span>
        </div>
      </div>

      <div className="dashboard-header-aside">
        {headerAside}
      </div>
    </header>
  )
}

export default Navbar
