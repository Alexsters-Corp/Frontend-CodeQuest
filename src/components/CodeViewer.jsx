import { memo, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import Editor from '@monaco-editor/react'
import { monacoReady, monacoError, monacoPromise } from '../utils/monacoLoader'

const VIEWER_OPTIONS = Object.freeze({
  readOnly: true,
  minimap: { enabled: false },
  fontSize: 13,
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  lineNumbers: 'on',
  folding: false,
  renderLineHighlight: 'none',
  scrollbar: { vertical: 'hidden', horizontal: 'auto' },
  overviewRulerLanes: 0,
  contextmenu: false,
})

const LINE_HEIGHT_PX = 19
const HEIGHT_MIN_PX = 54
const HEIGHT_MAX_PX = 420

function computeHeight(code) {
  const lines = (code ?? '').split('\n').length
  return `${Math.min(Math.max(lines * LINE_HEIGHT_PX + 10, HEIGHT_MIN_PX), HEIGHT_MAX_PX)}px`
}

function CodeViewer({ code = '', language = 'plaintext' }) {
  const [ready, setReady] = useState(monacoReady)
  const [error, setError] = useState(monacoError)
  const height = computeHeight(code)

  useEffect(() => {
    if (monacoReady || monacoError) return
    let active = true
    monacoPromise
      .then(() => { if (active) setReady(true) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])

  return (
    <div className="code-viewer">
      <div className="code-viewer__lang">{language}</div>
      {error ? (
        <pre className="code-viewer__fallback"><code>{code}</code></pre>
      ) : ready ? (
        <Editor
          height={height}
          value={code}
          language={language}
          theme="vs-dark"
          options={VIEWER_OPTIONS}
        />
      ) : (
        <pre className="code-viewer__fallback"><code>{code}</code></pre>
      )}
    </div>
  )
}

CodeViewer.propTypes = {
  code: PropTypes.string,
  language: PropTypes.string,
}

export default memo(CodeViewer)
