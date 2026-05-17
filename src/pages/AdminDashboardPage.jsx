import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { getAdminAnalytics, listAdminUsers, updateAdminUser, deleteAdminUser } from '../services/rbacApi'
import { notifyError, notifySuccess } from '../utils/notify'

const ALLOWED_ROLES = ['user', 'instructor', 'admin']

function buildDrafts(users) {
  return users.reduce((accumulator, user) => {
    accumulator[user.id] = {
      role: user.role,
      is_active: Boolean(user.is_active),
      nombre: user.nombre,
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
  const [deletingUserId, setDeletingUserId] = useState(null)

  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState('')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadUsers()
    loadAnalytics()
  }, [])

  const dirtyUsers = useMemo(
    () => users.filter((user) => {
      const draft = drafts[user.id]
      if (!draft) {
        return false
      }
      return draft.role !== user.role || 
             Boolean(draft.is_active) !== Boolean(user.is_active) ||
             draft.nombre !== user.nombre
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
    if (draft.nombre !== user.nombre) {
      changes.nombre = draft.nombre
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

  async function handleDeleteUser(user) {
    setDeletingUserId(user.id)
    try {
      await deleteAdminUser(user.id)
      setUsers((previous) => previous.filter((item) => item.id !== user.id))
      setDrafts((previous) => {
        const next = { ...previous }
        delete next[user.id]
        return next
      })
      await loadAnalytics()
      notifySuccess(t('admin.userDeleted'))
    } catch (requestError) {
      const message = requestError.message || t('admin.userDeleteError')
      setUsersError(message)
      notifyError(message)
    } finally {
      setDeletingUserId(null)
      setDeleteConfirm(null)
    }
  }

  const roleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'role-badge role-badge--admin'
      case 'instructor': return 'role-badge role-badge--instructor'
      default: return 'role-badge role-badge--user'
    }
  }

  const roleLabel = (role) => {
    switch (role) {
      case 'admin': return t('admin.roles.admin')
      case 'instructor': return t('admin.roles.instructor')
      default: return t('admin.roles.user')
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
        </div>

        <div className="rbac-filters">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') loadUsers() }}
            placeholder={t('admin.searchPlaceholder')}
          />

          <select className="rbac-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">{t('admin.allRoles')}</option>
            <option value="user">{t('admin.roles.user')}</option>
            <option value="instructor">{t('admin.roles.instructor')}</option>
            <option value="admin">{t('admin.roles.admin')}</option>
          </select>

          <select className="rbac-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
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
                        <input
                          className="rbac-name-input"
                          value={draft.nombre || ''}
                          onChange={(e) => handleDraftChange(user.id, { nombre: e.target.value })}
                          placeholder={t('admin.noName')}
                        />
                        <p className="rbac-cell-note">ID: {user.id}</p>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          className="rbac-role-select"
                          value={draft.role}
                          onChange={(event) => handleDraftChange(user.id, { role: event.target.value })}
                        >
                          {ALLOWED_ROLES.map((allowedRole) => (
                            <option key={allowedRole} value={allowedRole}>
                              {roleLabel(allowedRole)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <label className="rbac-toggle-label">
                          <input
                            type="checkbox"
                            className="rbac-toggle-input"
                            checked={Boolean(draft.is_active)}
                            onChange={(event) => handleDraftChange(user.id, { is_active: event.target.checked })}
                          />
                          <span className="rbac-toggle-track">
                            <span className="rbac-toggle-thumb" />
                          </span>
                        </label>
                      </td>
                      <td>
                        <div className="rbac-action-btns">
                          <button
                            type="button"
                            className="rbac-btn-primary"
                            onClick={() => handleSaveUser(user)}
                            disabled={!hasChanges || savingUserId === user.id}
                          >
                            {savingUserId === user.id ? t('admin.saving') : t('admin.save')}
                          </button>
                          <button
                            type="button"
                            className="rbac-btn-danger"
                            onClick={() => setDeleteConfirm(user)}
                            disabled={deletingUserId === user.id}
                          >
                            {deletingUserId === user.id ? t('admin.deleting') : t('admin.delete')}
                          </button>
                        </div>
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

    {/* Delete Confirmation Modal */}
    {deleteConfirm && (
      <div className="rbac-modal-overlay" onClick={() => setDeleteConfirm(null)}>
        <div className="rbac-modal" onClick={(e) => e.stopPropagation()}>
          <h3>{t('admin.deleteConfirmTitle')}</h3>
          <p>{t('admin.deleteConfirmMessage', { name: deleteConfirm.nombre || deleteConfirm.email })}</p>
          <div className="rbac-modal-actions">
            <button className="rbac-btn-secondary" onClick={() => setDeleteConfirm(null)}>
              {t('common.cancel')}
            </button>
            <button className="rbac-btn-danger" onClick={() => handleDeleteUser(deleteConfirm)}>
              {t('admin.confirmDelete')}
            </button>
          </div>
        </div>
      </div>
    )}
      </MotionPage>
    </SidebarLayout>
  )
}

export default AdminDashboardPage
