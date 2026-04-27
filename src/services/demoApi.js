import { API_URL } from './api'

const EXECUTION_TIMEOUT_MS = 5000
const MAX_CODE_LENGTH = 16000

/**
 * Cliente publico para los endpoints /api/learning/demo/*.
 * No inyecta Authorization. No depende de localStorage ni de sesion.
 */
async function demoFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  return response
}

async function demoRequestJson(endpoint, options = {}) {
  const response = await demoFetch(endpoint, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || 'No fue posible completar la solicitud demo.')
    error.status = response.status
    error.code = data.code
    error.details = data.details
    throw error
  }

  return data
}

/**
 * Obtiene la leccion demo (la marcada como is_free_demo=1 en BD).
 * Devuelve { lesson, exercises, demo, lessonId }.
 */
export async function getDemoLessonContent() {
  return demoRequestJson('/api/learning/demo/lesson')
}

/**
 * Devuelve metricas del catalogo: totalLessons, totalLanguages, languages, nextLessonsTitles.
 */
export async function getDemoPreview() {
  return demoRequestJson('/api/learning/demo/preview')
}

/**
 * Valida la respuesta a un ejercicio del demo. No persiste nada.
 */
export async function submitDemoExercise({ lessonId, exerciseId, answer }) {
  const normalizedLessonId = Number(lessonId)
  const normalizedExerciseId = String(exerciseId || '').trim()

  if (!Number.isInteger(normalizedLessonId) || normalizedLessonId <= 0) {
    throw new Error('La leccion demo no es valida.')
  }

  if (!normalizedExerciseId) {
    throw new Error('El ejercicio no es valido.')
  }

  return demoRequestJson(
    `/api/learning/demo/lessons/${normalizedLessonId}/exercises/${encodeURIComponent(normalizedExerciseId)}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ answer: String(answer || '') }),
    }
  )
}

function sanitizeCode(code) {
  return String(code || '')
    .split('\0')
    .join('')
    .slice(0, MAX_CODE_LENGTH)
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry))
  }

  if (value === null || value === undefined) {
    return []
  }

  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line, index, rows) => !(line === '' && index === rows.length - 1))
}

/**
 * Ejecuta codigo en Judge0 a traves del endpoint demo (sin auth).
 * Mismo contrato que codeExecutionService.executeCode.
 */
export async function executeDemoCode(code, languageId) {
  const safeCode = sanitizeCode(code)
  const normalizedLanguageId = Number(languageId)

  if (!safeCode.trim()) {
    throw new Error('Debes escribir codigo antes de ejecutar.')
  }

  if (!Number.isInteger(normalizedLanguageId) || normalizedLanguageId <= 0) {
    throw new Error('No se encontro un lenguaje valido para ejecutar este ejercicio.')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS)

  try {
    const response = await demoFetch('/api/learning/demo/execute', {
      method: 'POST',
      body: JSON.stringify({
        code: safeCode,
        languageId: normalizedLanguageId,
      }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => ({}))
    const output = normalizeTextArray(payload.output)
    const errors = normalizeTextArray(payload.errors)

    if (!response.ok) {
      const fallbackMessage = errors[0] || 'No fue posible ejecutar el codigo en este momento.'
      const error = new Error(payload.message || fallbackMessage)
      error.status = response.status
      error.code = payload.code
      error.details = payload.details
      throw error
    }

    return {
      output,
      errors,
      executionTime: Number(payload.executionTime) || 0,
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('La ejecucion supero el tiempo maximo de 5 segundos.')
    }

    throw error instanceof Error
      ? error
      : new Error('No fue posible ejecutar el codigo en este momento.')
  } finally {
    clearTimeout(timeoutId)
  }
}
