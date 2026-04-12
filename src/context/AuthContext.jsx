import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { apiFetch } from '../services/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('accessToken')))

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const saveSession = useCallback(({ accessToken, refreshToken, user: userData }) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const updateUser = useCallback((userData) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  // Validar el token al montar la app
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      return
    }

    apiFetch('/api/users/me')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          localStorage.setItem('user', JSON.stringify(data.user))
        } else {
          // Token inválido — limpiar
          logout()
        }
      })
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      saveSession,
      updateUser,
      logout,
    }),
    [user, loading, saveSession, updateUser, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
