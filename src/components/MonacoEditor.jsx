import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { motion as Motion } from 'framer-motion'
import Editor from '@monaco-editor/react'
import { monacoReady, monacoError, monacoPromise } from '../utils/monacoLoader'

const DEFAULT_OPTIONS = Object.freeze({
  minimap: { enabled: false },
  fontSize: 14,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  tabSize: 2,
  wordWrap: 'on',
})

function normalizeConsoleOutput(consoleOutput) {
  if (Array.isArray(consoleOutput)) {
    return consoleOutput.map((line) => String(line))
  }

  if (consoleOutput === null || consoleOutput === undefined || consoleOutput === '') {
    return []
  }

  return [String(consoleOutput)]
}

/**
 * Reusable Monaco wrapper for code lesson exercises.
 */
function MonacoEditor({
  value = '',
  onChange,
  language = 'javascript',
  languageLabel = 'JavaScript',
  theme = 'vs-dark',
  height = '400px',
  readOnly = false,
  options = {},
  onRun,
  isExecuting = false,
  consoleOutput = [],
  runLabel = 'Ejecutar codigo',
  runningLabel = 'Ejecutando...',
  outputLabel = 'Salida',
  outputEmptyLabel = 'Ejecuta tu codigo para ver resultados.',
  shortcutHint = 'Ctrl/Cmd + Enter',
  ariaLabel = 'Editor de codigo',
  loadingLabel = 'Cargando editor...',
  editorErrorLabel = 'No se pudo cargar Monaco. Se activo el modo de respaldo.',
  placeholder = 'Escribe tu codigo aqui...',
  onEditorError,
  celebrationTick = 0,
}) {
  const [loaderReady, setLoaderReady] = useState(monacoReady)
  const [loaderError, setLoaderError] = useState(monacoError)

  const outputLines = useMemo(() => normalizeConsoleOutput(consoleOutput), [consoleOutput])

  const editorOptions = useMemo(() => ({
    ...DEFAULT_OPTIONS,
    ...options,
    readOnly,
  }), [options, readOnly])

  const canRun = typeof onRun === 'function' && !isExecuting && !readOnly

  useEffect(() => {
    if (monacoReady || monacoError) return

    let active = true
    monacoPromise
      .then(() => {
        if (!active) return
        setLoaderReady(true)
        setLoaderError(false)
      })
      .catch(() => {
        if (!active) return
        setLoaderError(true)
        if (typeof onEditorError === 'function') {
          onEditorError()
        }
      })

    return () => { active = false }
  }, [onEditorError])

  const handleEditorMount = useCallback((editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (canRun && onRun) {
        onRun()
      }
    })
  }, [canRun, onRun])

  const handleEditorChange = useCallback((nextValue) => {
    onChange(nextValue ?? '')
  }, [onChange])

  const handleFallbackKeyDown = useCallback((event) => {
    if (!canRun) {
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      onRun()
    }
  }, [canRun, onRun])

  return (
    <Motion.section
      className="monaco-shell"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      aria-label={ariaLabel}
    >
      <div className="monaco-toolbar">
        <span className="monaco-language-chip">{languageLabel}</span>
        {onRun && (
          <button
            type="button"
            className={`monaco-run-btn ${isExecuting ? 'is-running' : ''}`}
            onClick={onRun}
            disabled={!canRun}
          >
            {isExecuting ? runningLabel : runLabel}
          </button>
        )}
      </div>

      <div className="monaco-stage">
        {loaderError ? (
          <div className="monaco-fallback-wrapper">
            <p className="exercise-editor-flag-note">{editorErrorLabel}</p>
            <textarea
              className="monaco-fallback-textarea"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleFallbackKeyDown}
              placeholder={placeholder}
              rows={12}
              readOnly={readOnly}
            />
          </div>
        ) : loaderReady ? (
          <Editor
            height={height}
            value={value}
            language={language}
            onChange={handleEditorChange}
            theme={theme}
            onMount={handleEditorMount}
            options={editorOptions}
          />
        ) : (
          <div className="monaco-inline-loading">{loadingLabel}</div>
        )}

        {Boolean(celebrationTick) && (
          <div key={`confetti-${celebrationTick}`} className="monaco-confetti" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <Motion.div
        className="monaco-console"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        role="status"
        aria-live="polite"
      >
        <div className="monaco-console__header">
          <h3>{outputLabel}</h3>
          <span>{shortcutHint}</span>
        </div>
        {outputLines.length === 0 ? (
          <p className="monaco-console-empty">{outputEmptyLabel}</p>
        ) : (
          <pre>
            <code>{outputLines.join('\n')}</code>
          </pre>
        )}
      </Motion.div>
    </Motion.section>
  )
}

MonacoEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  language: PropTypes.string,
  languageLabel: PropTypes.string,
  theme: PropTypes.string,
  height: PropTypes.string,
  readOnly: PropTypes.bool,
  options: PropTypes.object,
  onRun: PropTypes.func,
  isExecuting: PropTypes.bool,
  consoleOutput: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
  ]),
  runLabel: PropTypes.string,
  runningLabel: PropTypes.string,
  outputLabel: PropTypes.string,
  outputEmptyLabel: PropTypes.string,
  shortcutHint: PropTypes.string,
  ariaLabel: PropTypes.string,
  loadingLabel: PropTypes.string,
  editorErrorLabel: PropTypes.string,
  placeholder: PropTypes.string,
  onEditorError: PropTypes.func,
  celebrationTick: PropTypes.number,
}

export default memo(MonacoEditor)
