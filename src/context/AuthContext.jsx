import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  // Validar el token al montar la app
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setLoading(false)
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
  }, [])

  /**
   * Guarda tokens y datos del usuario tras login/register.
   */
  function saveSession({ accessToken, refreshToken, user: userData }) {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  /**
   * Limpia la sesión completa.
   */
  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    saveSession,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
