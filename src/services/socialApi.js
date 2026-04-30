import { apiFetch } from './api'

async function requestJson(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || 'No fue posible completar la solicitud.')
    error.status = response.status
    error.code = data.code
    error.details = data.details
    throw error
  }

  return data
}

export async function searchUsersByUsername(username, limit = 8) {
  const query = String(username || '').trim()
  if (!query) {
    return []
  }

  const params = new URLSearchParams({ username: query, limit: String(limit) })
  const data = await requestJson(`/api/social/search?${params.toString()}`)
  return Array.isArray(data.users) ? data.users : []
}

export async function followUserByUsername(username) {
  const normalizedUsername = String(username || '').trim()
  if (!normalizedUsername) {
    throw new Error('Debes escribir un nombre de usuario válido.')
  }

  return requestJson(`/api/social/follow/${encodeURIComponent(normalizedUsername)}`, {
    method: 'POST',
  })
}

export async function unfollowUserByUsername(username) {
  const normalizedUsername = String(username || '').trim()
  if (!normalizedUsername) {
    throw new Error('Debes escribir un nombre de usuario válido.')
  }

  return requestJson(`/api/social/follow/${encodeURIComponent(normalizedUsername)}`, {
    method: 'DELETE',
  })
}

export async function getFollowDirectory(limit = 12) {
  const params = new URLSearchParams({ limit: String(limit) })
  return requestJson(`/api/social/directory?${params.toString()}`)
}

export async function getLeaderboard(scope = 'global', limit = 25) {
  const params = new URLSearchParams({ scope, limit: String(limit) })
  return requestJson(`/api/ranking/leaderboard?${params.toString()}`)
}