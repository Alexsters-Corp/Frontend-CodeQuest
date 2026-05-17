import { apiFetch } from './api'

async function requestJson(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'No fue posible completar la solicitud.')
  }

  return data
}

function parsePositiveInt(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function createQueryString(filters = {}) {
  const params = new URLSearchParams()

  if (filters.search && String(filters.search).trim()) {
    params.set('search', String(filters.search).trim())
  }

  if (filters.role && String(filters.role).trim()) {
    params.set('role', String(filters.role).trim())
  }

  if (filters.status && String(filters.status).trim()) {
    params.set('status', String(filters.status).trim())
  }

  const limit = parsePositiveInt(filters.limit)
  if (limit) {
    params.set('limit', String(limit))
  }

  const offset = Number(filters.offset)
  if (Number.isInteger(offset) && offset >= 0) {
    params.set('offset', String(offset))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function getCurrentUserProfile() {
  const data = await requestJson('/api/users/me')
  return data.user || null
}

export async function listInstructorClasses() {
  const data = await requestJson('/api/instructor/classes')
  return Array.isArray(data.classes) ? data.classes : []
}

export async function listInstructorInvites() {
  const data = await requestJson('/api/instructor/invites')
  return Array.isArray(data.invites) ? data.invites : []
}

export async function createInstructorClass({ name, description }) {
  return requestJson('/api/instructor/classes', {
    method: 'POST',
    body: JSON.stringify({
      name: String(name || '').trim(),
      description: String(description || '').trim(),
    }),
  })
}

export async function updateInstructorClass({ id, name, description }) {
  const normalizedId = parsePositiveInt(id)
  if (!normalizedId) {
    throw new Error('Clase no válida para actualizar.')
  }

  return requestJson(`/api/instructor/classes/${normalizedId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: name ? String(name).trim() : undefined,
      description: description !== undefined ? String(description || '').trim() : undefined,
    }),
  })
}

export async function generateClassInvite({ classId, email, expiresAt, maxUses }) {
  const normalizedClassId = parsePositiveInt(classId)
  if (!normalizedClassId) {
    throw new Error('Clase no válida para generar invitación.')
  }

  return requestJson(`/api/instructor/classes/${normalizedClassId}/invite`, {
    method: 'POST',
    body: JSON.stringify({
      email: email ? String(email).trim() : null,
      expiresAt: expiresAt || null,
      maxUses: parsePositiveInt(maxUses) || null,
    }),
  })
}

export async function revokeClassInvite(inviteId) {
  const normalizedId = parsePositiveInt(inviteId)
  return requestJson(`/api/instructor/invites/${normalizedId}/revoke`, {
    method: 'PATCH',
  })
}

export async function rotateClassCode(classId) {
  const normalizedClassId = parsePositiveInt(classId)
  return requestJson(`/api/instructor/classes/${normalizedClassId}/rotate-code`, {
    method: 'POST',
  })
}

export async function deleteInstructorClass(classId) {
  const normalizedClassId = parsePositiveInt(classId)
  return requestJson(`/api/instructor/classes/${normalizedClassId}`, {
    method: 'DELETE',
  })
}

export async function kickStudentFromClass({ classId, studentId }) {
  const normalizedClassId = parsePositiveInt(classId)
  const normalizedStudentId = parsePositiveInt(studentId)
  return requestJson(`/api/instructor/classes/${normalizedClassId}/students/${normalizedStudentId}`, {
    method: 'DELETE',
  })
}

export async function getClassAnalytics(classId) {
  const normalizedClassId = parsePositiveInt(classId)
  if (!normalizedClassId) {
    throw new Error('Clase no válida para consultar analytics.')
  }

  return requestJson(`/api/instructor/classes/${normalizedClassId}/analytics`)
}

export async function listAdminUsers(filters = {}) {
  const queryString = createQueryString(filters)
  const data = await requestJson(`/api/admin/users${queryString}`)
  return Array.isArray(data.users) ? data.users : []
}

export async function updateAdminUser({ userId, role, isActive }) {
  const normalizedUserId = parsePositiveInt(userId)
  if (!normalizedUserId) {
    throw new Error('Usuario no válido para actualizar.')
  }

  const payload = {}
  if (role !== undefined) {
    payload.role = String(role || '').trim().toLowerCase()
  }

  if (isActive !== undefined) {
    payload.isActive = Boolean(isActive)
  }

  if (!Object.keys(payload).length) {
    throw new Error('No hay cambios para guardar.')
  }

  return requestJson(`/api/admin/users/${normalizedUserId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function getAdminAnalytics() {
  return requestJson('/api/admin/analytics')
}
