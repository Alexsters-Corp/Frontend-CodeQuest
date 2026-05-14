# CodeQuest Frontend

Aplicacion frontend de **CodeQuest**, una plataforma de aprendizaje gamificado para desarrollo de software. Este cliente implementa la experiencia de estudiante, instructor y administrador, y se integra con el API Gateway del backend para autenticacion, rutas de aprendizaje, evaluaciones, analitica y generacion de contenido con IA.

## Fin de CodeQuest dentro del proyecto

CodeQuest resuelve cuatro objetivos de producto:

1. **Onboarding tecnico guiado**: seleccion de lenguaje, diagnostico inicial y rutas por modulos/lecciones.
2. **Practica ejecutable**: ejercicios con editor de codigo y ejecucion remota (Judge0 via backend).
3. **Gamificacion medible**: XP, ranking, progreso, favoritos y seguimiento de avance.
4. **Operacion academica escalable**: paneles de instructor/admin, RBAC y herramientas IA para asistencia de contenido.

## Stack tecnico

| Capa             | Tecnologias                                 |
| ---------------- | ------------------------------------------- |
| Runtime          | Node.js 20+, npm 10+                        |
| UI               | React 19, React DOM 19                      |
| Build/Tooling    | Vite 7, @vitejs/plugin-react                |
| Routing          | react-router-dom 7                          |
| Animaciones      | framer-motion (LazyMotion + domAnimation)   |
| Notificaciones   | sonner                                      |
| Editor de codigo | @monaco-editor/react, @monaco-editor/loader |
| Calidad          | ESLint 9 (flat config)                      |
| Contenedor       | Docker multi-stage + Nginx 1.27-alpine      |

## Arquitectura funcional (frontend)

`src/` se organiza por dominios de UI y acceso a datos:

- `pages/`: pantallas principales (home, auth, dashboard, lesson, social, ranking, admin, instructor, demo).
- `components/`: componentes reutilizables y guards (`PrivateRoute`, `PublicRoute`, `RoleGuard`).
- `services/`: capa de integracion HTTP con backend (`apiFetch`, `learningApi`, `rbacApi`, `aiAdminApi`, `demoApi`).
- `context/`: estado global de autenticacion e idioma.
- `i18n/`: mensajes y resolucion de idioma (`es` y `en`).

### Seguridad y sesion

- JWT en `localStorage` (`accessToken`, `refreshToken`, `user`).
- `apiFetch` inyecta `Authorization: Bearer <token>`.
- En `401` con `TOKEN_EXPIRED`, intenta `POST /api/auth/refresh` y reintenta la solicitud original.
- `AuthProvider` valida sesion al montar usando `GET /api/users/me`.

### Routing y control de acceso

- Rutas publicas: `/`, `/login`, `/registro`, recuperacion de password y demo (`/demo/*`).
- Rutas privadas: dashboard, diagnostico, modulos, lecciones, perfil, social, ranking.
- Rutas protegidas por rol:
  - `/instructor` para `instructor` y `admin`.
  - `/admin` y `/admin/ai` solo para `admin`.

## Contratos API relevantes

Base URL: `VITE_API_URL` (default `http://localhost:4000`).

### Learning

- `GET /api/learning/dashboard`
- `GET /api/learning/languages`
- `POST /api/learning/languages/select`
- `POST /api/learning/diagnostic/start`
- `GET /api/learning/lessons/:lessonId/session`
- `POST /api/learning/lessons/:lessonId/exercises/:exerciseId/submit`
- `POST /api/learning/lessons/:lessonId/submit`
- `GET /api/learning/lessons/:lessonId/solution`
- `POST /api/learning/execute` (ejecucion de codigo autenticada)

### Demo publica (sin auth)

- `GET /api/learning/demo/lesson`
- `GET /api/learning/demo/preview`
- `POST /api/learning/demo/lessons/:lessonId/exercises/:exerciseId/submit`
- `POST /api/learning/demo/execute`

### RBAC / Operacion

- `GET /api/instructor/classes`
- `POST /api/instructor/classes`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `GET /api/admin/analytics`

### IA para administracion

- `POST /api/admin/generate-lesson`
- `POST /api/admin/generate-exercise`
- `POST /api/admin/validate-content`

## Feature flags y entorno

Crea `.env` en la raiz del frontend:

```env
VITE_API_URL=http://localhost:4000
VITE_FEATURE_CODE_EXECUTION_ENABLED=true
```

Notas:

- `VITE_FEATURE_CODE_EXECUTION_ENABLED` controla disponibilidad de Monaco/ejecucion en lecciones.
- `LessonPage` tambien soporta fallback `FEATURE_CODE_EXECUTION_ENABLED` si existe en build-time env.
- Si Monaco no puede cargar o el dispositivo es movil (`max-width: 767px`), se usa fallback a `textarea`.

## Desarrollo local

```bash
npm install
npm run dev
```

Comandos de trabajo:

```bash
npm run lint
npm run build
npm run preview
```

Puerto local de Vite: `http://localhost:5000`.

## Build y despliegue

### Docker local

`docker-compose.yml` compila imagen y publica `5000:80`.

```bash
docker compose up --build
```

### Produccion

- Imagen esperada: `ghcr.io/<org>/codequest-frontend:latest`.
- `docker-compose.prod.yml` expone `5000:80` con healthcheck HTTP sobre `/`.

## Consideraciones tecnicas de ejecucion de codigo

- Servicio: `src/services/codeExecutionService.js`.
- Endpoint: `POST /api/learning/execute`.
- Timeout cliente: **5 segundos**.
- Sanitizacion: elimina null chars y limita payload a **16000** caracteres.
- Respuesta normalizada: `{ output: string[], errors: string[], executionTime: number }`.

## Troubleshooting senior (caso 503 en IA admin)

Si `/api/admin/generate-lesson` responde `503 Service Unavailable`, normalmente el backend tiene IA deshabilitada o sin proveedor operativo.

Validar en backend:

```env
FEATURE_AI_CONTENT_ENABLED=true
GROQ_API_KEY=<tu_api_key_real>
```

Luego reiniciar servicios para recargar entorno:

```bash
docker compose down
docker compose up -d
docker compose logs
```

## Proyeccion de CodeQuest

La evolucion tecnica prevista del frontend apunta a:

1. **Personalizacion adaptativa** basada en telemetria de rendimiento por habilidad y lenguaje.
2. **Escalamiento de authoring IA** para generar lecciones/ejercicios con guardrails de calidad.
3. **Mayor observabilidad de aprendizaje** (metricas de efectividad por modulo, cohortes y funnels).
4. **Experiencia enterprise-ready**: hardening de RBAC, trazabilidad de cambios y flujos multi-tenant.

Este repositorio ya tiene la base para esa proyeccion: separacion por servicios, guards de acceso, feature flags, i18n, demo publica y pipeline de despliegue containerizado.
