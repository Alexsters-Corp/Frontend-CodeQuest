import { apiFetch } from './api'

const STORAGE_KEYS = {
  selectedLanguageId: 'selectedLanguageId',
  favoriteLessons: 'favoriteLessons',
}

const FAVORITES_UPDATED_EVENT = 'cq:favorites:updated'

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

export function getSelectedLanguageId() {
  return parsePositiveInt(localStorage.getItem(STORAGE_KEYS.selectedLanguageId))
}

export function clearSelectedLanguageId() {
  localStorage.removeItem(STORAGE_KEYS.selectedLanguageId)
}

export function setSelectedLanguageId(languageId) {
  const normalized = parsePositiveInt(languageId)
  if (!normalized) {
    throw new Error('Debes seleccionar un lenguaje válido.')
  }

  localStorage.setItem(STORAGE_KEYS.selectedLanguageId, String(normalized))
  return normalized
}

function mapLessonStatus(status) {
  if (status === 'completed') return 'completada'
  if (status === 'in_progress') return 'en_progreso'
  return 'disponible'
}

export async function listAvailableLanguages() {
  const data = await requestJson('/api/learning/languages')
  return Array.isArray(data) ? data : []
}

export async function selectLanguage(languageId) {
  const normalizedLanguageId = setSelectedLanguageId(languageId)

  return requestJson('/api/learning/languages/select', {
    method: 'POST',
    body: JSON.stringify({ languageId: normalizedLanguageId }),
  })
}

export async function startDiagnosticExam(languageId) {
  const normalizedLanguageId = parsePositiveInt(languageId)
  if (!normalizedLanguageId) {
    throw new Error('Debes seleccionar un lenguaje válido.')
  }

  return requestJson('/api/learning/diagnostic/start', {
    method: 'POST',
    body: JSON.stringify({ languageId: normalizedLanguageId }),
  })
}

export async function finishDiagnosticExam({ attemptId, answers }) {
  const normalizedAttemptId = parsePositiveInt(attemptId)
  if (!normalizedAttemptId) {
    throw new Error('No se encontró un intento diagnóstico válido.')
  }

  if (!Array.isArray(answers)) {
    throw new Error('Las respuestas del diagnóstico no son válidas.')
  }

  return requestJson(`/api/learning/diagnostic/attempts/${normalizedAttemptId}/finish`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
}

export async function getDashboardOverview() {
  return requestJson('/api/learning/dashboard')
}

export async function getModulesByLanguage(languageId) {
  const normalizedLanguageId = parsePositiveInt(languageId)
  if (!normalizedLanguageId) {
    throw new Error('Debes seleccionar un lenguaje válido para ver módulos.')
  }

  const data = await requestJson(`/api/learning/languages/${normalizedLanguageId}/modules`)
  return Array.isArray(data) ? data : []
}

export async function deleteLanguageSelection({
  languageId,
  confirmationText,
  confirmationLanguageName,
  confirmProgressText,
}) {
  const normalizedLanguageId = parsePositiveInt(languageId)
  if (!normalizedLanguageId) {
    throw new Error('El lenguaje seleccionado no es válido.')
  }

  return requestJson(`/api/learning/languages/${normalizedLanguageId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      confirmationText: String(confirmationText || ''),
      confirmationLanguageName: String(confirmationLanguageName || ''),
      confirmProgressText: String(confirmProgressText || ''),
    }),
  })
}

export async function listLessonsByModule(moduleId) {
  const normalizedModuleId = parsePositiveInt(moduleId)
  if (!normalizedModuleId) {
    throw new Error('El módulo seleccionado no es válido.')
  }

  const data = await requestJson(`/api/learning/paths/${normalizedModuleId}/lessons`)
  const lessons = Array.isArray(data) ? data : []

  return lessons.map((lesson) => ({
    id: Number(lesson.id),
    titulo: lesson.title,
    descripcion: lesson.description || '',
    numero: Number(lesson.order_position || 1),
    tipo: 'teoria_practica',
    xp_recompensa: Number(lesson.xp_reward || 0),
    estado: mapLessonStatus(lesson.status),
    puntuacion_mejor: Number(lesson.xp_earned || 0),
  }))
}

export async function getLessonContent(lessonId) {
  const normalizedLessonId = parsePositiveInt(lessonId)
  if (!normalizedLessonId) {
    throw new Error('La lección solicitada no es válida.')
  }

  return requestJson(`/api/learning/lessons/${normalizedLessonId}/session`)
}

export async function submitLessonExercise({ lessonId, exerciseId, answer }) {
  const normalizedLessonId = parsePositiveInt(lessonId)
  if (!normalizedLessonId) {
    throw new Error('La lección del ejercicio no es válida.')
  }

  const normalizedExerciseId = String(exerciseId || '').trim()
  if (!normalizedExerciseId) {
    throw new Error('El ejercicio no es válido para esta lección.')
  }

  return requestJson(
    `/api/learning/lessons/${normalizedLessonId}/exercises/${encodeURIComponent(normalizedExerciseId)}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ answer: String(answer || '') }),
    }
  )
}

function readFavoriteLessons() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.favoriteLessons)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (_error) {
    return []
  }
}

function writeFavoriteLessons(favorites) {
  localStorage.setItem(STORAGE_KEYS.favoriteLessons, JSON.stringify(favorites))

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT))
  }
}

export function getFavoritesUpdatedEventName() {
  return FAVORITES_UPDATED_EVENT
}

export function isLessonFavorite(lessonId) {
  const normalizedLessonId = parsePositiveInt(lessonId)
  if (!normalizedLessonId) {
    return false
  }

  const favorites = readFavoriteLessons()
  return favorites.some((item) => Number(item.lessonId) === normalizedLessonId)
}

export function listFavoriteLessons() {
  const favorites = readFavoriteLessons()
  return favorites
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.favoritedAt || 0).getTime()
      const bTime = new Date(b.favoritedAt || 0).getTime()
      return bTime - aTime
    })
}

export async function toggleLessonFavorite({
  lessonId,
  lessonTitle,
  lessonDescription,
  moduleId,
  moduleName,
  xpReward,
}) {
  const normalizedLessonId = parsePositiveInt(lessonId)
  if (!normalizedLessonId) {
    throw new Error('La lección seleccionada no es válida.')
  }

  const favorites = readFavoriteLessons()
  const existingIndex = favorites.findIndex((item) => Number(item.lessonId) === normalizedLessonId)

  if (existingIndex >= 0) {
    const next = favorites.filter((item) => Number(item.lessonId) !== normalizedLessonId)
    writeFavoriteLessons(next)
    return { favorite: false }
  }

  const entry = {
    lessonId: normalizedLessonId,
    lessonTitle: String(lessonTitle || ''),
    lessonDescription: String(lessonDescription || ''),
    moduleId: parsePositiveInt(moduleId),
    moduleName: String(moduleName || ''),
    xpReward: Number(xpReward || 0),
    favoritedAt: new Date().toISOString(),
  }

  writeFavoriteLessons([...favorites, entry])
  return { favorite: true }
}