const TECHNICAL_NOISE_PATTERNS = [
  /^\[error\]\s*/i,
  /^exited with error status\s+\d+/i,
  /^process exited with code\s+\d+/i,
]

function cleanLine(line) {
  return String(line || '').replace(/^\[error\]\s*/i, '').trimEnd()
}

function normalizeLines(lines) {
  if (Array.isArray(lines)) {
    return lines.map(cleanLine).filter(Boolean)
  }

  if (lines === null || lines === undefined || lines === '') {
    return []
  }

  return String(lines)
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)
}

function findLineNumber(lines) {
  const joined = lines.join('\n')
  const match = joined.match(/\bline\s+(\d+)\b/i) || joined.match(/:(\d+):(?:\d+:)?/)
  return match ? match[1] : null
}

function findErrorName(lines) {
  const joined = lines.join('\n')
  const match = joined.match(/\b([A-Z][A-Za-z]+Error)\b/)
  return match ? match[1] : null
}

function detectKind(lines) {
  const joined = lines.join('\n').toLowerCase()

  if (/syntaxerror|syntax error|expected|unexpected token|invalid syntax|parse error/.test(joined)) {
    return 'syntax'
  }

  if (/compile|compilation|compiler|javac|gcc|g\+\+|csc|rustc|tsc|:\d+:\s*error/.test(joined)) {
    return 'compile'
  }

  if (/timeout|time limit|timed out/.test(joined)) {
    return 'timeout'
  }

  if (/nameerror|referenceerror|typeerror|indexerror|keyerror|zerodivisionerror|runtime error|exception|traceback/.test(joined)) {
    return 'runtime'
  }

  return 'generic'
}

function removeNoise(lines) {
  return lines.filter((line) => !TECHNICAL_NOISE_PATTERNS.some((pattern) => pattern.test(line.trim())))
}

export function normalizeExecutionFeedback({ errors, t }) {
  const normalized = normalizeLines(errors)
  const relevantLines = removeNoise(normalized)

  if (relevantLines.length === 0) {
    return {
      toastMessage: t('execution.error.generic'),
      consoleLines: [t('execution.console.generic')],
    }
  }

  const kind = detectKind(relevantLines)
  const lineNumber = findLineNumber(relevantLines)
  const errorName = findErrorName(relevantLines)
  const detailLine = relevantLines.find((line) => /error|exception|invalid|unexpected|expected|undefined|not defined/i.test(line))
    || relevantLines[relevantLines.length - 1]
  const detailAlreadyIncludesErrorName = errorName && detailLine.toLowerCase().startsWith(errorName.toLowerCase())
  const detailPrefix = errorName && !detailAlreadyIncludesErrorName ? `${errorName} - ` : ''

  const summaryKey = `execution.error.${kind}`
  const hintKey = `execution.hint.${kind}`
  const lineSuffix = lineNumber ? t('execution.error.lineSuffix', { line: lineNumber }) : ''
  const title = t(summaryKey, { line: lineNumber || '' })

  const consoleLines = [
    `${t('execution.console.problem')}: ${title}${lineSuffix}`,
    `${t('execution.console.detail')}: ${detailPrefix}${detailLine}`,
    `${t('execution.console.hint')}: ${t(hintKey)}`,
    '',
    t('execution.console.raw'),
    ...relevantLines.map((line) => `  ${line}`),
  ]

  return {
    kind,
    toastMessage: `${title}${lineSuffix}`,
    consoleLines,
  }
}
