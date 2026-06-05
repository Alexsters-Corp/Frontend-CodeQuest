import { describe, expect, it } from 'vitest'
import { normalizeExecutionFeedback } from '../src/utils/executionErrors'

const messages = {
  'execution.error.syntax': 'Hay un error de sintaxis',
  'execution.error.compile': 'El codigo no compila',
  'execution.error.runtime': 'El codigo fallo durante la ejecucion',
  'execution.error.timeout': 'La ejecucion tardo demasiado',
  'execution.error.generic': 'No se pudo ejecutar el codigo',
  'execution.error.lineSuffix': ' en la linea {line}',
  'execution.console.problem': 'Problema',
  'execution.console.detail': 'Detalle',
  'execution.console.hint': 'Sugerencia',
  'execution.console.raw': 'Salida tecnica original:',
  'execution.console.generic': 'No se pudo interpretar el error del proveedor de ejecucion.',
  'execution.hint.syntax': 'Revisa parentesis.',
  'execution.hint.compile': 'Revisa declaraciones.',
  'execution.hint.runtime': 'Revisa variables.',
  'execution.hint.timeout': 'Revisa bucles.',
  'execution.hint.generic': 'Revisa el detalle.',
}

function t(key, params = {}) {
  return Object.entries(params).reduce(
    (text, [param, value]) => text.replace(`{${param}}`, value),
    messages[key] || key
  )
}

describe('normalizeExecutionFeedback', () => {
  it('summarizes Python syntax errors with line number', () => {
    const feedback = normalizeExecutionFeedback({
      t,
      errors: [
        '  File "script.py", line 3',
        '    print(as("Ada"))',
        '             ^',
        'SyntaxError: invalid syntax',
        'Exited with error status 1',
      ],
    })

    expect(feedback.toastMessage).toBe('Hay un error de sintaxis en la linea 3')
    expect(feedback.consoleLines[0]).toBe('Problema: Hay un error de sintaxis en la linea 3')
    expect(feedback.consoleLines).toContain('Sugerencia: Revisa parentesis.')
    expect(feedback.consoleLines).not.toContain('  Exited with error status 1')
  })

  it('summarizes runtime errors', () => {
    const feedback = normalizeExecutionFeedback({
      t,
      errors: ['ReferenceError: total is not defined'],
    })

    expect(feedback.toastMessage).toBe('El codigo fallo durante la ejecucion')
    expect(feedback.consoleLines[1]).toContain('ReferenceError')
  })

  it('summarizes compiler errors', () => {
    const feedback = normalizeExecutionFeedback({
      t,
      errors: ['Main.java:3: error: cannot find symbol'],
    })

    expect(feedback.toastMessage).toBe('El codigo no compila en la linea 3')
  })

  it('summarizes timeout errors', () => {
    const feedback = normalizeExecutionFeedback({
      t,
      errors: ['Time limit exceeded'],
    })

    expect(feedback.toastMessage).toBe('La ejecucion tardo demasiado')
    expect(feedback.consoleLines).toContain('Sugerencia: Revisa bucles.')
  })
})
