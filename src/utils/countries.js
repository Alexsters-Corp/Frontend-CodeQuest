function hasIntlCountrySupport() {
  return (
    typeof Intl !== 'undefined'
    && typeof Intl.DisplayNames === 'function'
  )
}

const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
]

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'es'
}

function normalizeCode(code) {
  const value = String(code || '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(value) ? value : ''
}

export function getCountryEntries(locale = 'es') {
  if (!hasIntlCountrySupport()) {
    return []
  }

  const normalizedLocale = normalizeLocale(locale)
  const displayNames = new Intl.DisplayNames([normalizedLocale], { type: 'region' })
  const codes = COUNTRY_CODES

  const entries = codes
    .map((rawCode) => {
      const code = normalizeCode(rawCode)
      const name = displayNames.of(code)
      return { code, name }
    })
    .filter((entry) => entry.code && typeof entry.name === 'string' && entry.name.trim().length > 0)

  entries.sort((a, b) => a.name.localeCompare(b.name, normalizedLocale))
  return entries
}

export function countryNameFromCode(code, locale = 'es', fallback = '') {
  const normalizedCode = normalizeCode(code)
  if (!normalizedCode || !hasIntlCountrySupport()) {
    return fallback
  }

  const normalizedLocale = normalizeLocale(locale)
  const displayNames = new Intl.DisplayNames([normalizedLocale], { type: 'region' })
  const value = displayNames.of(normalizedCode)
  return typeof value === 'string' && value.trim() ? value : fallback
}

function findCodeByName(name, locale) {
  const target = String(name || '').trim()
  if (!target) {
    return ''
  }

  const entries = getCountryEntries(locale)
  const matched = entries.find((entry) => entry.name.localeCompare(target, locale, { sensitivity: 'base' }) === 0)
  return matched?.code || ''
}

export function resolveCountryCode(value, locale = 'es') {
  const raw = String(value || '').trim()
  if (!raw) {
    return ''
  }

  const asCode = normalizeCode(raw)
  if (asCode) {
    return asCode
  }

  const normalizedLocale = normalizeLocale(locale)
  return (
    findCodeByName(raw, normalizedLocale)
    || findCodeByName(raw, normalizedLocale === 'en' ? 'es' : 'en')
    || ''
  )
}
