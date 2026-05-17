import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { getAdminAnalytics, listAdminUsers, updateAdminUser } from '../services/rbacApi'
import { notifyError, notifySuccess } from '../utils/notify'

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
  const { t } = useLanguage()

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
      const message = requestError.message || t('admin.usersLoadError')
      setUsersError(message)
      notifyError(message)
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
      const message = requestError.message || t('admin.analyticsLoadError')
      setAnalyticsError(message)
      notifyError(message)
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
      notifySuccess(t('admin.userUpdated'))
    } catch (requestError) {
      const message = requestError.message || t('admin.userUpdateError')
      setUsersError(message)
      notifyError(message)
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar title={t('admin.title')} hideActions />

      <section className="rbac-page">
      <section className="rbac-card ai-admin-entry">
        <div className="rbac-section-head">
          <h2>{t('admin.ai.toolsTitle')}</h2>
          <button type="button" onClick={() => navigate('/admin/ai')}>
            {t('admin.ai.open')}
          </button>
        </div>
        <p className="rbac-muted">{t('admin.ai.toolsHint')}</p>
      </section>

      <section className="rbac-card">
        <div className="rbac-section-head">
          <h2>{t('admin.globalAnalytics')}</h2>
          <button type="button" onClick={loadAnalytics} disabled={analyticsLoading}>
            {analyticsLoading ? t('admin.updatingAnalytics') : t('admin.updateAnalytics')}
          </button>
        </div>

        {analyticsError && <p className="rbac-error">{analyticsError}</p>}
        {analyticsLoading && <p>{t('admin.loadingAnalytics')}</p>}

        {!analyticsLoading && analytics && (
          <div className="rbac-metric-grid rbac-metric-grid--admin">
            <article>
              <p>{t('admin.metric.totalUsers')}</p>
              <strong>{Number(analytics.users?.users_total || 0)}</strong>
            </article>
            <article>
              <p>{t('admin.metric.activeUsers')}</p>
              <strong>{Number(analytics.users?.users_active || 0)}</strong>
            </article>
            <article>
              <p>{t('admin.metric.instructors')}</p>
              <strong>{Number(analytics.users?.users_role_instructor || 0)}</strong>
            </article>
            <article>
              <p>{t('admin.metric.admins')}</p>
              <strong>{Number(analytics.users?.users_role_admin || 0)}</strong>
            </article>
            <article>
              <p>{t('admin.metric.activePaths')}</p>
              <strong>
                {Number(analytics.learning?.learning_paths_active || 0)} / {Number(analytics.learning?.learning_paths_total || 0)}
              </strong>
            </article>
            <article>
              <p>{t('admin.metric.completedLessons')}</p>
              <strong>{Number(analytics.learning?.lessons_completed_total || 0)}</strong>
            </article>
          </div>
        )}
      </section>

      <section className="rbac-card">
        <div className="rbac-section-head">
          <h2>{t('admin.userModeration')}</h2>
          <button type="button" onClick={loadUsers} disabled={usersLoading}>
            {usersLoading ? t('admin.updatingUsers') : t('admin.search')}
          </button>
        </div>

        <div className="rbac-filters">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.searchPlaceholder')}
          />

          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">{t('admin.allRoles')}</option>
            <option value="user">user</option>
            <option value="instructor">instructor</option>
            <option value="admin">admin</option>
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">{t('admin.allStatuses')}</option>
            <option value="active">{t('admin.active')}</option>
            <option value="inactive">{t('admin.inactive')}</option>
          </select>
        </div>

        {usersError && <p className="rbac-error">{usersError}</p>}
        {dirtyUsers.length > 0 && (
          <p className="rbac-warning">{t('admin.pendingChanges', { count: dirtyUsers.length })}</p>
        )}

        {!usersError && usersLoading && <p>{t('admin.loadingUsers')}</p>}
        {!usersLoading && users.length === 0 && <p className="rbac-muted">{t('admin.noUsers')}</p>}

        {users.length > 0 && (
          <div className="rbac-table-wrap">
            <table className="rbac-table">
              <thead>
                <tr>
                  <th>{t('admin.table.user')}</th>
                  <th>{t('admin.table.email')}</th>
                  <th>{t('admin.table.role')}</th>
                  <th>{t('admin.table.active')}</th>
                  <th>{t('admin.table.action')}</th>
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
                        <strong>{user.nombre || t('admin.noName')}</strong>
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
                          {draft.is_active ? t('common.yes') : t('common.no')}
                        </label>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleSaveUser(user)}
                          disabled={!hasChanges || savingUserId === user.id}
                        >
                          {savingUserId === user.id ? t('admin.saving') : t('admin.save')}
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
    </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default AdminDashboardPage
