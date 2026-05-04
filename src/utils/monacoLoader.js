import { loader } from '@monaco-editor/react'

// Flags síncronos: cualquier componente que renderice DESPUÉS de que
// la promesa se resuelva arranca con el estado correcto desde useState().
export let monacoReady = false
export let monacoError = false

// Promesa única compartida. loader.init() de @monaco-editor/react ya
// es idempotente, pero aquí garantizamos que solo existe una llamada.
export const monacoPromise = loader
  .init()
  .then(() => { monacoReady = true })
  .catch(() => { monacoError = true })
