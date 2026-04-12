import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useRole } from '../hooks/useRole'
import { getAdminAnalytics, listAdminUsers, updateAdminUser } from '../services/rbacApi'

const ALLOWED_ROLES = ['user', 'instructor', 'admin']

function buildDrafts(users) {
  return users.reduce((accumulator, user) => {
    accumulator[user.id] = {
      role: user.role,
      is_active: Boolean(user.is_active),
    }
    return accumulator
  }, {})
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const { role } = useRole()

  const [users, setUsers] = useState([])
  const [drafts, setDrafts] = useState({})
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [savingUserId, setSavingUserId] = useState(null)

  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState('')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadUsers()
    loadAnalytics()
    // Carga inicial única; los refresh manuales se ejecutan desde botones/filtros.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dirtyUsers = useMemo(
    () => users.filter((user) => {
      const draft = drafts[user.id]
      if (!draft) {
        return false
      }

      return draft.role !== user.role || Boolean(draft.is_active) !== Boolean(user.is_active)
    }),
    [drafts, users]
  )

  async function loadUsers() {
    setUsersLoading(true)
    setUsersError('')
    try {
      const payload = await listAdminUsers({
        search,
        role: roleFilter,
        status: statusFilter,
        limit: 100,
      })

      setUsers(payload)
      setDrafts(buildDrafts(payload))
    } catch (requestError) {
      setUsersError(requestError.message || 'No fue posible consultar usuarios.')
      setUsers([])
      setDrafts({})
    } finally {
      setUsersLoading(false)
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true)
    setAnalyticsError('')
    try {
      const payload = await getAdminAnalytics()
      setAnalytics(payload)
    } catch (requestError) {
      setAnalyticsError(requestError.message || 'No fue posible cargar analytics globales.')
      setAnalytics(null)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  function handleDraftChange(userId, patch) {
    setDrafts((previous) => ({
      ...previous,
      [userId]: {
        ...previous[userId],
        ...patch,
      },
    }))
  }

  async function handleSaveUser(user) {
    const draft = drafts[user.id]
    if (!draft) {
      return
    }

    const changes = {}
    if (draft.role !== user.role) {
      changes.role = draft.role
    }

    if (Boolean(draft.is_active) !== Boolean(user.is_active)) {
      changes.isActive = Boolean(draft.is_active)
    }

    if (!Object.keys(changes).length) {
      return
    }

    setSavingUserId(user.id)
    setUsersError('')
    try {
      const payload = await updateAdminUser({
        userId: user.id,
        role: changes.role,
        isActive: changes.isActive,
      })

      if (payload.user) {
        setUsers((previous) => previous.map((item) => (item.id === user.id ? {
          ...item,
          role: payload.user.role,
          is_active: payload.user.is_active,
        } : item)))

        setDrafts((previous) => ({
          ...previous,
          [user.id]: {
            role: payload.user.role,
            is_active: Boolean(payload.user.is_active),
          },
        }))
      }

      await loadAnalytics()
    } catch (requestError) {
      setUsersError(requestError.message || 'No fue posible actualizar el usuario.')
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <div className="rbac-page">
      <Navbar title="Panel de administración" />

      <div className="rbac-header">
        <div>
          <p className="rbac-kicker">Panel por rol</p>
          <h1>Administrador</h1>
          <p className="rbac-subtitle">
            Gestiona usuarios y revisa indicadores globales de la plataforma.
          </p>
        </div>
        <div className="rbac-actions-inline">
          <span className="rbac-role-chip">Rol actual: {role}</span>
          <button type="button" onClick={() => navigate('/dashboard')}>
            Volver al dashboard
          </button>
        </div>
      </div>

      <section className="rbac-card">
        <div className="rbac-section-head">
          <h2>Analytics globales</h2>
          <button type="button" onClick={loadAnalytics} disabled={analyticsLoading}>
            {analyticsLoading ? 'Actualizando...' : 'Actualizar analytics'}
          </button>
        </div>

        {analyticsError && <p className="rbac-error">{analyticsError}</p>}
        {analyticsLoading && <p>Cargando analytics globales...</p>}

        {!analyticsLoading && analytics && (
          <div className="rbac-metric-grid rbac-metric-grid--admin">
            <article>
              <p>Usuarios totales</p>
              <strong>{Number(analytics.users?.users_total || 0)}</strong>
            </article>
            <article>
              <p>Usuarios activos</p>
              <strong>{Number(analytics.users?.users_active || 0)}</strong>
            </article>
            <article>
              <p>Instructores</p>
              <strong>{Number(analytics.users?.users_role_instructor || 0)}</strong>
            </article>
            <article>
              <p>Administradores</p>
              <strong>{Number(analytics.users?.users_role_admin || 0)}</strong>
            </article>
            <article>
              <p>Rutas activas</p>
              <strong>
                {Number(analytics.learning?.learning_paths_active || 0)} / {Number(analytics.learning?.learning_paths_total || 0)}
              </strong>
            </article>
            <article>
              <p>Lecciones completadas</p>
              <strong>{Number(analytics.learning?.lessons_completed_total || 0)}</strong>
            </article>
          </div>
        )}
      </section>

      <section className="rbac-card">
        <div className="rbac-section-head">
          <h2>Moderación de usuarios</h2>
          <button type="button" onClick={loadUsers} disabled={usersLoading}>
            {usersLoading ? 'Consultando...' : 'Buscar'}
          </button>
        </div>

        <div className="rbac-filters">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o email"
          />

          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">Todos los roles</option>
            <option value="user">user</option>
            <option value="instructor">instructor</option>
            <option value="admin">admin</option>
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        {usersError && <p className="rbac-error">{usersError}</p>}
        {dirtyUsers.length > 0 && (
          <p className="rbac-warning">Hay {dirtyUsers.length} usuario(s) con cambios pendientes.</p>
        )}

        {!usersError && usersLoading && <p>Cargando usuarios...</p>}
        {!usersLoading && users.length === 0 && <p className="rbac-muted">No se encontraron usuarios.</p>}

        {users.length > 0 && (
          <div className="rbac-table-wrap">
            <table className="rbac-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Activo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const draft = drafts[user.id] || { role: user.role, is_active: user.is_active }
                  const hasChanges =
                    draft.role !== user.role || Boolean(draft.is_active) !== Boolean(user.is_active)

                  return (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.nombre || 'Sin nombre'}</strong>
                        <p className="rbac-cell-note">ID: {user.id}</p>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={draft.role}
                          onChange={(event) => handleDraftChange(user.id, { role: event.target.value })}
                        >
                          {ALLOWED_ROLES.map((allowedRole) => (
                            <option key={allowedRole} value={allowedRole}>
                              {allowedRole}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <label className="rbac-checkbox-label">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.is_active)}
                            onChange={(event) => handleDraftChange(user.id, { is_active: event.target.checked })}
                          />
                          {draft.is_active ? 'Sí' : 'No'}
                        </label>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleSaveUser(user)}
                          disabled={!hasChanges || savingUserId === user.id}
                        >
                          {savingUserId === user.id ? 'Guardando...' : 'Guardar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminDashboardPage
