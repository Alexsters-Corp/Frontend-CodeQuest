const CODE_BLOCK_RE = /<pre[^>]*>\s*<code(?:\s+class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Splits an HTML string into alternating segments:
 *   { type: 'html',  content: string }
 *   { type: 'code',  content: string, language: string }
 *
 * Consecutive HTML between code blocks is kept as a single 'html' segment.
 * HTML entities inside <code> are decoded so Monaco receives plain text.
 */
export function parseTheoryContent(html) {
  if (!html) return []

  const segments = []
  let lastIndex = 0
  let match

  CODE_BLOCK_RE.lastIndex = 0

  while ((match = CODE_BLOCK_RE.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'html', content: html.slice(lastIndex, match.index) })
    }

    segments.push({
      type: 'code',
      language: match[1] ?? 'plaintext',
      content: decodeHtmlEntities(match[2]),
    })

    lastIndex = CODE_BLOCK_RE.lastIndex
  }

  if (lastIndex < html.length) {
    segments.push({ type: 'html', content: html.slice(lastIndex) })
  }

  return segments
}
