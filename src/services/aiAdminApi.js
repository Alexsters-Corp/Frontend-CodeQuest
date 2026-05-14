import { apiFetch } from './api'

async function requestJson(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || data.message || 'No fue posible completar la solicitud.')
  }

  return data
}

function ensureText(value, label) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    throw new Error(`${label} es requerido.`)
  }

  return normalized
}

function ensurePositiveInt(value, label) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} debe ser un entero positivo.`)
  }

  return parsed
}

export async function generateLesson({ topic, language, level, model }) {
  return requestJson('/api/admin/generate-lesson', {
    method: 'POST',
    body: JSON.stringify({
      topic: ensureText(topic, 'topic'),
      language: ensureText(language, 'language'),
      level: ensureText(level, 'level'),
      model: ensureText(model, 'model'),
    }),
  })
}

export async function generateExercise({ concept, difficulty, languageId, model }) {
  return requestJson('/api/admin/generate-exercise', {
    method: 'POST',
    body: JSON.stringify({
      concept: ensureText(concept, 'concept'),
      difficulty: ensureText(difficulty, 'difficulty'),
      languageId: ensurePositiveInt(languageId, 'languageId'),
      model: ensureText(model, 'model'),
    }),
  })
}

export async function validateContent({ content }) {
  return requestJson('/api/admin/validate-content', {
    method: 'POST',
    body: JSON.stringify({
      content: ensureText(content, 'content'),
    }),
  })
}
