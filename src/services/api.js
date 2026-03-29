const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * Wrapper para fetch que inyecta automáticamente el JWT
 * y maneja refresh de tokens expirados.
 */
async function apiFetch(endpoint, options = {}) {
  const accessToken = localStorage.getItem('accessToken')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Si el token expiró, intentar refresh automático
  if (response.status === 401) {
    const data = await response.json().catch(() => ({}))

    if (data.code === 'TOKEN_EXPIRED') {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        // Reintentar la petición con el nuevo token
        headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        })
      }
    }
  }

  return response
}

/**
 * Intenta renovar el access token usando el refresh token.
 * @returns {boolean} true si logró renovar
 */
async function tryRefreshToken() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      // Refresh token inválido — limpiar sesión
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      return false
    }

    const data = await response.json()
    localStorage.setItem('accessToken', data.accessToken)
    return true
  } catch {
    return false
  }
}

export { apiFetch, API_URL }
