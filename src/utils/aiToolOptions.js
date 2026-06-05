export const CONTENT_MODEL_OPTIONS = Object.freeze([
  {
    id: 'llama-3.3-70b-versatile',
    labelKey: 'admin.ai.model.llama33',
  },
  {
    id: 'llama-4-scout',
    labelKey: 'admin.ai.model.llama4Scout',
  },
  {
    id: 'qwen-qwq-32b',
    labelKey: 'admin.ai.model.qwen',
  },
])

export const JUDGE0_LANGUAGE_OPTIONS = Object.freeze([
  {
    id: 63,
    labelKey: 'admin.ai.language.javascript',
    monaco: 'javascript',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  },
  {
    id: 71,
    labelKey: 'admin.ai.language.python3',
    monaco: 'python',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  },
  {
    id: 62,
    labelKey: 'admin.ai.language.java',
    monaco: 'java',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
  },
  {
    id: 54,
    labelKey: 'admin.ai.language.cpp',
    monaco: 'cpp',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg',
  },
  {
    id: 51,
    labelKey: 'admin.ai.language.csharp',
    monaco: 'csharp',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg',
  },
  {
    id: 60,
    labelKey: 'admin.ai.language.go',
    monaco: 'go',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg',
  },
  {
    id: 72,
    labelKey: 'admin.ai.language.ruby',
    monaco: 'ruby',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg',
  },
])

export function getJudge0LanguageOption(languageId) {
  return JUDGE0_LANGUAGE_OPTIONS.find((option) => option.id === Number(languageId)) || JUDGE0_LANGUAGE_OPTIONS[0]
}

export function getMonacoFromJudge0Id(languageId) {
  return getJudge0LanguageOption(languageId)?.monaco || 'plaintext'
}

export function getAiLanguageLabel(languageId, t) {
  const option = getJudge0LanguageOption(languageId)
  return option ? `${option.id} - ${t(option.labelKey)}` : String(languageId || '')
}

export function sortPublishTargetPaths(paths = []) {
  const levelOrder = {
    primer: 0,
    introductorio: 0,
    glosario: 0,
    principiante: 1,
    intermedio: 2,
    avanzado: 3,
  }

  return [...paths].sort((left, right) => {
    const leftSlug = `${left.slug || ''} ${left.name || ''}`.toLowerCase()
    const rightSlug = `${right.slug || ''} ${right.name || ''}`.toLowerCase()
    const leftLevel = left.isOptional || /glosario|intro|primer/.test(leftSlug)
      ? 0
      : (levelOrder[left.difficultyLevel] ?? 9)
    const rightLevel = right.isOptional || /glosario|intro|primer/.test(rightSlug)
      ? 0
      : (levelOrder[right.difficultyLevel] ?? 9)

    if (leftLevel !== rightLevel) {
      return leftLevel - rightLevel
    }

    const leftOrder = Number(left.orderPosition || 999)
    const rightOrder = Number(right.orderPosition || 999)
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return String(left.name || '').localeCompare(String(right.name || ''), 'es', { sensitivity: 'base' })
  })
}
