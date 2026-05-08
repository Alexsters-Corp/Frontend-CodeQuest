import { memo } from 'react'
import PropTypes from 'prop-types'
import CodeViewer from './CodeViewer'
import { parseTheoryContent } from '../utils/parseTheoryContent'

/**
 * Renderiza el HTML de teoría de una lección reemplazando cada
 * <pre><code> por un Monaco readOnly. El parseo ocurre de forma
 * síncrona antes del primer render, eliminando cualquier parpadeo.
 *
 * @param {string} html      HTML plano de lesson.contenido_teoria
 * @param {string} language  Monaco language id ('python', 'javascript', …)
 */
function TheoryContent({ html, language = 'plaintext' }) {
  if (!html) return null

  const segments = parseTheoryContent(html)
  if (segments.length === 0) return null

  // Sin bloques de código: renderiza directamente para no añadir capas.
  if (segments.length === 1 && segments[0].type === 'html') {
    return (
      <div
        className="lesson-theory"
        dangerouslySetInnerHTML={{ __html: segments[0].content }}
      />
    )
  }

  return (
    <div className="lesson-theory">
      {segments.map((seg, i) => {
        if (seg.type === 'html') {
          return (
            <div
              key={i}
              dangerouslySetInnerHTML={{ __html: seg.content }}
            />
          )
        }

        const lang = seg.language !== 'plaintext' ? seg.language : language
        return <CodeViewer key={i} code={seg.content} language={lang} />
      })}
    </div>
  )
}

TheoryContent.propTypes = {
  html: PropTypes.string,
  language: PropTypes.string,
}

export default memo(TheoryContent)
