import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRole } from '../src/hooks/useRole'

// Mock useAuth
vi.mock('../src/context/useAuth', () => ({
  useAuth: vi.fn(),
}))

const { useAuth } = await import('../src/context/useAuth')

describe('useRole hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user role when no user', () => {
    useAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useRole())

    expect(result.current.role).toBe('user')
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.isInstructor).toBe(false)
    expect(result.current.isUser).toBe(true)
  })

  it('returns correct role for admin user', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' } })
    const { result } = renderHook(() => useRole())

    expect(result.current.role).toBe('admin')
    expect(result.current.isAdmin).toBe(true)
    expect(result.current.isInstructor).toBe(false)
    expect(result.current.isUser).toBe(false)
  })

  it('returns correct role for instructor user', () => {
    useAuth.mockReturnValue({ user: { role: 'instructor' } })
    const { result } = renderHook(() => useRole())

    expect(result.current.role).toBe('instructor')
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.isInstructor).toBe(true)
    expect(result.current.isUser).toBe(false)
  })

  it('normalizes student role to user', () => {
    useAuth.mockReturnValue({ user: { role: 'student' } })
    const { result } = renderHook(() => useRole())

    expect(result.current.role).toBe('user')
    expect(result.current.isUser).toBe(true)
  })

  it('uses permissions from session if available (permisos)', () => {
    useAuth.mockReturnValue({
      user: {
        role: 'user',
        permisos: ['custom:permission'],
      },
    })
    const { result } = renderHook(() => useRole())

    expect(result.current.permissions).toContain('custom:permission')
    expect(result.current.hasPermission('custom:permission')).toBe(true)
  })

  it('uses permissions from session if available (permissions)', () => {
    useAuth.mockReturnValue({
      user: {
        role: 'user',
        permissions: ['another:permission'],
      },
    })
    const { result } = renderHook(() => useRole())

    expect(result.current.permissions).toContain('another:permission')
  })

  it('falls back to role-based permissions when no session permissions', () => {
    useAuth.mockReturnValue({
      user: { role: 'admin' },
    })
    const { result } = renderHook(() => useRole())

    expect(result.current.permissions).toContain('learning_path:crud')
    expect(result.current.hasPermission('learning_path:crud')).toBe(true)
  })

  it('deduplicates permissions', () => {
    useAuth.mockReturnValue({
      user: {
        role: 'user',
        permisos: ['a', 'a', 'b', 'b'],
      },
    })
    const { result } = renderHook(() => useRole())

    expect(result.current.permissions).toEqual(['a', 'b'])
  })

  it('hasPermission checks against permissions array', () => {
    useAuth.mockReturnValue({
      user: {
        role: 'user',
        permisos: ['read:data'],
      },
    })
    const { result } = renderHook(() => useRole())

    expect(result.current.hasPermission('read:data')).toBe(true)
    expect(result.current.hasPermission('write:data')).toBe(false)
  })

  it('updates when user changes', () => {
    useAuth.mockReturnValue({ user: { role: 'user' } })
    const { result, rerender } = renderHook(() => useRole())

    expect(result.current.role).toBe('user')

    useAuth.mockReturnValue({ user: { role: 'admin' } })
    rerender()

    expect(result.current.role).toBe('admin')
  })
})
