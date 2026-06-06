export const LESSON_AUTOSAVE_DEBOUNCE_MS = 500
export const LESSON_AUTOSAVE_MAX_AGE_MS = 60 * 60 * 1000

export function loadSessionAutosaveState(key, maxAgeMs = LESSON_AUTOSAVE_MAX_AGE_MS) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > maxAgeMs) {
      sessionStorage.removeItem(key)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function saveSessionAutosaveState(key, payload) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      })
    )
  } catch {
    /* sessionStorage lleno o deshabilitado, ignoramos */
  }
}

export function clearSessionAutosaveState(key) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
