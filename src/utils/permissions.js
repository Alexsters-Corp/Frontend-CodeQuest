export const ROLE_USER = 'user'
export const ROLE_INSTRUCTOR = 'instructor'
export const ROLE_ADMIN = 'admin'

const ROLE_ALIASES = {
  student: ROLE_USER,
  user: ROLE_USER,
  instructor: ROLE_INSTRUCTOR,
  admin: ROLE_ADMIN,
}

const ROLE_PERMISSIONS = {
  [ROLE_USER]: [
    'learning:read_assigned',
    'lesson:complete',
    'code:execute',
    'profile:manage_self',
    'progress:read_self',
  ],
  [ROLE_INSTRUCTOR]: [
    'learning:read_assigned',
    'lesson:complete',
    'code:execute',
    'profile:manage_self',
    'progress:read_self',
    'class:create',
    'class:list_own',
    'class:invite_students',
    'class:assign_path',
    'class:analytics_own',
    'class:mark_required_optional',
  ],
  [ROLE_ADMIN]: [
    'learning:read_assigned',
    'lesson:complete',
    'code:execute',
    'profile:manage_self',
    'progress:read_self',
    'class:create',
    'class:list_own',
    'class:invite_students',
    'class:assign_path',
    'class:analytics_own',
    'class:mark_required_optional',
    'learning_path:crud',
    'catalog:manage',
    'user:moderate',
    'analytics:read_global',
    'feature_flags:manage',
    'admin:manage_admins',
  ],
}

export function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase()
  return ROLE_ALIASES[normalized] || ROLE_USER
}

export function getPermissionsForRole(role) {
  const normalizedRole = normalizeRole(role)
  return ROLE_PERMISSIONS[normalizedRole] ? [...ROLE_PERMISSIONS[normalizedRole]] : [...ROLE_PERMISSIONS[ROLE_USER]]
}

export function hasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission)
}
