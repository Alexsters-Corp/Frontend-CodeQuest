import { describe, it, expect } from 'vitest'
import { normalizeRole, getPermissionsForRole, hasPermission, ROLE_USER, ROLE_INSTRUCTOR, ROLE_ADMIN } from '../src/utils/permissions'

describe('permissions utils', () => {
  describe('role constants', () => {
    it('exports correct role values', () => {
      expect(ROLE_USER).toBe('user')
      expect(ROLE_INSTRUCTOR).toBe('instructor')
      expect(ROLE_ADMIN).toBe('admin')
    })
  })

  describe('normalizeRole', () => {
    it('normalizes student to user', () => {
      expect(normalizeRole('student')).toBe('user')
    })

    it('normalizes user to user', () => {
      expect(normalizeRole('user')).toBe('user')
    })

    it('normalizes instructor to instructor', () => {
      expect(normalizeRole('instructor')).toBe('instructor')
    })

    it('normalizes admin to admin', () => {
      expect(normalizeRole('admin')).toBe('admin')
    })

    it('handles uppercase', () => {
      expect(normalizeRole('ADMIN')).toBe('admin')
    })

    it('handles whitespace', () => {
      expect(normalizeRole('  admin  ')).toBe('admin')
    })

    it('defaults to user for unknown roles', () => {
      expect(normalizeRole('unknown')).toBe('user')
      expect(normalizeRole('')).toBe('user')
    })

    it('handles null and undefined', () => {
      expect(normalizeRole(null)).toBe('user')
      expect(normalizeRole(undefined)).toBe('user')
    })
  })

  describe('getPermissionsForRole', () => {
    it('returns permissions for user', () => {
      const perms = getPermissionsForRole('user')
      expect(perms).toContain('learning:read_assigned')
      expect(perms).toContain('lesson:complete')
    })

    it('returns permissions for instructor', () => {
      const perms = getPermissionsForRole('instructor')
      expect(perms).toContain('class:create')
      expect(perms).toContain('learning:read_assigned')
    })

    it('returns permissions for admin', () => {
      const perms = getPermissionsForRole('admin')
      expect(perms).toContain('learning_path:crud')
      expect(perms).toContain('user:moderate')
    })

    it('instructor has all user permissions', () => {
      const userPerms = getPermissionsForRole('user')
      const instructorPerms = getPermissionsForRole('instructor')
      userPerms.forEach((p) => expect(instructorPerms).toContain(p))
    })

    it('admin has all instructor permissions', () => {
      const instructorPerms = getPermissionsForRole('instructor')
      const adminPerms = getPermissionsForRole('admin')
      instructorPerms.forEach((p) => expect(adminPerms).toContain(p))
    })

    it('returns a copy of the array', () => {
      const perms1 = getPermissionsForRole('user')
      const perms2 = getPermissionsForRole('user')
      expect(perms1).not.toBe(perms2)
    })

    it('unknown role returns user permissions', () => {
      const perms = getPermissionsForRole('unknown')
      expect(perms).toContain('learning:read_assigned')
    })
  })

  describe('hasPermission', () => {
    it('user has learning:read_assigned', () => {
      expect(hasPermission('user', 'learning:read_assigned')).toBe(true)
    })

    it('user does not have class:create', () => {
      expect(hasPermission('user', 'class:create')).toBe(false)
    })

    it('instructor has class:create', () => {
      expect(hasPermission('instructor', 'class:create')).toBe(true)
    })

    it('admin has user:moderate', () => {
      expect(hasPermission('admin', 'user:moderate')).toBe(true)
    })

    it('normalizes role', () => {
      expect(hasPermission('student', 'learning:read_assigned')).toBe(true)
    })
  })
})
