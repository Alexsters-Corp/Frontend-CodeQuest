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

const LANGUAGE_SIGNATURES = Object.freeze({
  javascript: [
    /\bfunction\s+\w+\s*\(/,
    /\b(?:const|let|var)\s+\w+/,
    /\bconsole\s*\.\s*log\s*\(/,
    /=>\s*[{(]/,
  ],
  python: [
    /\bdef\s+\w+\s*\(/,
    /\belif\b/,
    /\bprint\s*\(/,
    /\bfrom\s+\w[\w.]*\s+import\b/,
  ],
  java: [
    /\bpublic\s+class\s+\w+/,
    /\bSystem\.out\.print/,
    /\bpublic\s+static\s+void\b/,
  ],
  cpp: [
    /#include\s*[<"]/,
    /\bstd\s*::/,
    /\bcout\s*<</,
  ],
  csharp: [
    /\bConsole\s*\.\s*Write(?:Line)?\s*\(/,
    /\bnamespace\s+\w+/,
    /\busing\s+System\b/,
  ],
})

/**
 * Checks if `code` contains signatures of a language different from `expectedSlug`.
 * Returns the label of the detected language, or null if no mismatch found.
 * @param {string} code
 * @param {string} expectedSlug  e.g. 'python', 'javascript'
 * @returns {string|null}
 */
export function detectLanguageMismatch(code, expectedSlug) {
  if (!code?.trim() || !expectedSlug) return null
  for (const [slug, patterns] of Object.entries(LANGUAGE_SIGNATURES)) {
    if (slug === expectedSlug) continue
    if (patterns.some((p) => p.test(code))) {
      const config = Object.values(LANGUAGE_CONFIG).find((c) => c.slug === slug)
      return config?.label ?? slug
    }
  }
  return null
}

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
