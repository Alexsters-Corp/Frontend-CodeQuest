import { useCallback, useMemo, useState } from 'react'
import { LanguageContext } from './language-context'
import { DEFAULT_LANGUAGE, messages, SUPPORTED_LANGUAGES } from '../i18n/messages'

const STORAGE_KEY = 'cq-language'

function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE
}

function detectInitialLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    return normalizeLanguage(stored)
  }

  const browserLanguage = (navigator.language || '').toLowerCase()
  if (browserLanguage.startsWith('en')) {
    return 'en'
  }

  return DEFAULT_LANGUAGE
}

function interpolate(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (_, token) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      return String(params[token])
    }

    return `{${token}}`
  })
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(detectInitialLanguage)

  const setLanguage = useCallback((nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage)
    setLanguageState(normalized)
    localStorage.setItem(STORAGE_KEY, normalized)
  }, [])

  const t = useCallback((key, params = {}) => {
    const selectedDictionary = messages[language] || messages[DEFAULT_LANGUAGE]
    const fallbackDictionary = messages[DEFAULT_LANGUAGE]
    const template = selectedDictionary[key] ?? fallbackDictionary[key] ?? key

    if (!params || Object.keys(params).length === 0) {
      return template
    }

    return interpolate(template, params)
  }, [language])

  const formatDate = useCallback((value, options = {}) => {
    if (!value) {
      return ''
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return ''
    }

    const locale = language === 'en' ? 'en-US' : 'es-CO'
    return new Intl.DateTimeFormat(locale, options).format(date)
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    formatDate,
    isSpanish: language === 'es',
    isEnglish: language === 'en',
  }), [formatDate, language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
