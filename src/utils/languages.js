const DEFAULT_LANGUAGE_CONFIG = Object.freeze({
  id: 2,
  slug: 'javascript',
  monaco: 'javascript',
  label: 'JavaScript',
})

export const LANGUAGE_CONFIG = Object.freeze({
  1: {
    id: 1,
    slug: 'python',
    monaco: 'python',
    label: 'Python',
  },
  2: {
    id: 2,
    slug: 'javascript',
    monaco: 'javascript',
    label: 'JavaScript',
  },
  3: {
    id: 3,
    slug: 'java',
    monaco: 'java',
    label: 'Java',
  },
  4: {
    id: 4,
    slug: 'cpp',
    monaco: 'cpp',
    label: 'C++',
  },
  5: {
    id: 5,
    slug: 'csharp',
    monaco: 'csharp',
    label: 'C#',
  },
})

function normalizeLanguageId(languageId) {
  const normalized = Number(languageId)
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null
}

/**
 * Returns language metadata used by the lesson code editor.
 * @param {number|string|null|undefined} languageId Numeric language id from lessons payload.
 * @returns {{ id: number, slug: string, monaco: string, label: string }}
 */
export function getLanguageConfig(languageId) {
  const normalizedId = normalizeLanguageId(languageId)

  if (!normalizedId) {
    return DEFAULT_LANGUAGE_CONFIG
  }

  return LANGUAGE_CONFIG[normalizedId] || DEFAULT_LANGUAGE_CONFIG
}

/**
 * Maps a lesson language id to a Monaco editor language identifier.
 * @param {number|string|null|undefined} languageId Numeric language id from lessons payload.
 * @returns {string}
 */
export function getMonacoLanguageFromLesson(languageId) {
  return getLanguageConfig(languageId).monaco
}

/**
 * Maps a lesson language id to a UI display label.
 * @param {number|string|null|undefined} languageId Numeric language id from lessons payload.
 * @returns {string}
 */
export function getLanguageLabelFromLesson(languageId) {
  return getLanguageConfig(languageId).label
}
