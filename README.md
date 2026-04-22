# Frontend CodeQuest

Frontend de CodeQuest construido con React 19 + Vite.

## Requisitos

- Node.js 20+
- npm 10+
- Backend de CodeQuest ejecutandose (API Gateway en `http://localhost:4000`)

## Instalacion

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raiz del frontend.

```env
VITE_API_URL=http://localhost:4000
VITE_FEATURE_CODE_EXECUTION_ENABLED=true
```

- `VITE_API_URL`: URL del API Gateway.
- `VITE_FEATURE_CODE_EXECUTION_ENABLED`: habilita o deshabilita Monaco + ejecucion de codigo en lecciones.

## Comandos disponibles

```bash
npm run dev      # desarrollo en http://localhost:5000
npm run lint     # validacion ESLint
npm run build    # build de produccion
npm run preview  # preview del build
```

## Integracion Monaco en lecciones

La pagina de lecciones carga Monaco solo cuando:

- el ejercicio es `completar_codigo`
- la feature flag esta activa
- la vista no es movil (<768px)
- Monaco no ha fallado en carga

Se incluye fallback graceful a `textarea` para:

- movil
- error de carga de Monaco
- feature flag deshabilitada

Tambien soporta:

- `Ctrl/Cmd + Enter` para ejecutar codigo
- panel de salida de consola
- notificaciones con Sonner
- loading skeleton mientras carga Monaco

## Uso del componente MonacoEditor

```jsx
<MonacoEditor
	value={codeAnswer}
	onChange={setCodeAnswer}
	language="javascript"
	languageLabel="JavaScript"
	theme="vs-dark"
	height="400px"
	onRun={handleRunCode}
	isExecuting={isExecuting}
	consoleOutput={consoleOutput}
/>
```

## Configuracion backend para ejecucion (Judge0)

El frontend consume:

- `POST /api/learning/execute`

Body esperado:

```json
{
	"code": "console.log('Hello CodeQuest')",
	"languageId": 2
}
```

Para habilitar ejecucion en backend, verifica estas settings/env:

- `FEATURE_CODE_EXECUTION_ENABLED=true`
- `JUDGE0_API_URL=https://ce.judge0.com`
- `JUDGE0_API_KEY=<tu_key_si_aplica>`

El servicio frontend aplica timeout de 5 segundos por ejecucion.

## Notas tecnicas

- Monaco se integra via `@monaco-editor/react` y `@monaco-editor/loader`.
- La carga es lazy (`React.lazy + Suspense`) para reducir impacto en bundle inicial.
- El editor mantiene coherencia visual con el design system dark de CodeQuest.
