/**
 * Utilidades de normalizacion de respuestas de ejercicios.
 * Extraidas de LessonPage.jsx para reutilizar en DemoLessonPage sin duplicar logica.
 */

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractTokenFromOutputStatement(submission) {
  const normalized = String(submission || '')
  const patterns = [
    /print\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/,
    /console\.log\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/,
    /System\.out\.println\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/,
    /Console\.WriteLine\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/,
    /(?:std::)?cout\s*<<\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*<</,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return ''
}

/**
 * Normaliza la respuesta del alumno para ejercicios "completar_codigo".
 * Si el codigo base contiene "_____", intenta extraer solo el token escrito.
 */
export function normalizeCodeExerciseAnswer(exercise, answer) {
  const rawAnswer = String(answer || '')
  const trimmedAnswer = rawAnswer.trim()

  if (!trimmedAnswer) {
    return ''
  }

  if (exercise?.tipo !== 'completar_codigo') {
    return trimmedAnswer
  }

  const baseCode = String(exercise?.codigo_base || '').replace(/\r\n/g, '\n')
  if (!baseCode.includes('_____')) {
    return trimmedAnswer
  }

  if (!/\r?\n/.test(rawAnswer) && !rawAnswer.includes('_____')) {
    return trimmedAnswer
  }

  const submission = rawAnswer.replace(/\r\n/g, '\n').trim()
  const [prefix, suffix] = baseCode.split('_____')
  const strictPattern = new RegExp(`^${escapeRegex(prefix)}([\\s\\S]*?)${escapeRegex(suffix)}$`)
  const strictMatch = submission.match(strictPattern)

  if (strictMatch?.[1]) {
    return strictMatch[1].trim()
  }

  const inferredToken = extractTokenFromOutputStatement(submission)
  if (inferredToken) {
    return inferredToken
  }

  return trimmedAnswer
}

/**
 * Construye el codigo a ejecutar en Judge0 reemplazando "_____" por la respuesta del alumno.
 */
export function buildExecutionSource(exercise, answer) {
  const rawAnswer = String(answer || '')
  const trimmedAnswer = rawAnswer.trim()

  if (!trimmedAnswer) {
    return ''
  }

  const baseCode = String(exercise?.codigo_base || '')
  const isFillCodeExercise = exercise?.tipo === 'completar_codigo'

  if (!isFillCodeExercise || !baseCode.includes('_____')) {
    return rawAnswer
  }

  if (/\r?\n/.test(rawAnswer) || rawAnswer.includes('_____')) {
    return rawAnswer
  }

  return baseCode.split('_____').join(trimmedAnswer)
}
