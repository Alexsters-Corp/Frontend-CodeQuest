import { useMemo } from 'react'
import { useAuth } from '../context/useAuth'
import { normalizeRole, getPermissionsForRole } from '../utils/permissions'

export function useRole() {
  const { user } = useAuth()

  return useMemo(() => {
    const role = normalizeRole(user?.role)
    const permissionsFromSession = Array.isArray(user?.permisos)
      ? user.permisos
      : Array.isArray(user?.permissions)
        ? user.permissions
        : null
    const permissions = permissionsFromSession
      ? [...new Set(permissionsFromSession)]
      : getPermissionsForRole(role)

    return {
      role,
      permissions,
      isAdmin: role === 'admin',
      isInstructor: role === 'instructor',
      isUser: role === 'user',
      hasPermission: (permission) => permissions.includes(permission),
    }
  }, [user])
}
