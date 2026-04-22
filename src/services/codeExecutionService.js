import { apiFetch } from './api'

const EXECUTION_ENDPOINT = '/api/learning/execute'
const EXECUTION_TIMEOUT_MS = 5000
const MAX_CODE_LENGTH = 16000

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

function normalizeLanguageId(languageId) {
  const normalized = Number(languageId)
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null
}

function sanitizeCode(code) {
  return String(code || '')
    .split('\0')
    .join('')
    .slice(0, MAX_CODE_LENGTH)
}

/**
 * Executes learner code through the backend execution endpoint.
 * @param {string} code Source code to execute.
 * @param {number|string} languageId Programming language id for the current lesson.
 * @returns {Promise<{ output: string[], errors: string[], executionTime: number }>} Normalized execution result.
 */
export async function executeCode(code, languageId) {
  const safeCode = sanitizeCode(code)
  const normalizedLanguageId = normalizeLanguageId(languageId)

  if (!safeCode.trim()) {
    throw new Error('Debes escribir codigo antes de ejecutar.')
  }

  if (!normalizedLanguageId) {
    throw new Error('No se encontro un lenguaje valido para ejecutar este ejercicio.')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS)

  try {
    const response = await apiFetch(EXECUTION_ENDPOINT, {
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
