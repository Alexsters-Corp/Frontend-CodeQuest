import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const authState = {
  user: null,
  isAuthenticated: false,
  loading: false,
}

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
}))

vi.mock('../src/context/LanguageContext', () => ({
  LanguageProvider: ({ children }) => <>{children}</>,
}))

vi.mock('../src/context/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('../src/context/useLanguage', () => ({
  useLanguage: () => ({ t: (key) => key, language: 'es' }),
}))

vi.mock('../src/hooks/useToastPosition', () => ({
  useToastPosition: () => 'top-center',
}))

vi.mock('../src/utils/notify', () => ({
  configureNotifications: vi.fn(),
}))

const pageMocks = {
  '../src/pages/DashboardPage': 'DashboardPage',
  '../src/pages/HomePage': 'HomePage',
  '../src/pages/LoginPage': 'LoginPage',
  '../src/pages/RegisterPage': 'RegisterPage',
  '../src/pages/ForgotPasswordPage': 'ForgotPasswordPage',
  '../src/pages/ResetPasswordPage': 'ResetPasswordPage',
  '../src/pages/OnboardingLanguagePage': 'OnboardingLanguagePage',
  '../src/pages/OnboardingTourPage': 'OnboardingTourPage',
  '../src/pages/DiagnosticTestPage': 'DiagnosticTestPage',
  '../src/pages/ModulesPage': 'ModulesPage',
  '../src/pages/LessonPage': 'LessonPage',
  '../src/pages/FavoritesPage': 'FavoritesPage',
  '../src/pages/ProfilePage': 'ProfilePage',
  '../src/pages/StudentClassesPage': 'StudentClassesPage',
  '../src/pages/UnauthorizedPage': 'UnauthorizedPage',
  '../src/pages/InstructorDashboardPage': 'InstructorDashboardPage',
  '../src/pages/AdminDashboardPage': 'AdminDashboardPage',
  '../src/pages/AdminManualCreationPage': 'AdminManualCreationPage',
  '../src/pages/AdminAiPage': 'AdminAiPage',
  '../src/pages/ProfileEditPage': 'ProfileEditPage',
  '../src/pages/ProfileConnectionsPage': 'ProfileConnectionsPage',
  '../src/pages/UserProfilePage': 'UserProfilePage',
  '../src/pages/RankingPage': 'RankingPage',
  '../src/pages/SocialPage': 'SocialPage',
  '../src/pages/DemoLandingPage': 'DemoLandingPage',
  '../src/pages/DemoLessonPage': 'DemoLessonPage',
  '../src/pages/DemoCompletionPage': 'DemoCompletionPage',
}

async function renderAt(path) {
  Object.entries(pageMocks).forEach(([modulePath, label]) => {
    vi.doMock(modulePath, () => ({
      default: () => <main>{label}</main>,
    }))
  })

  const { default: App } = await import('../src/App')
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

describe('App routing smoke coverage', () => {
  beforeEach(() => {
    vi.resetModules()
    authState.user = null
    authState.isAuthenticated = false
    authState.loading = false
  })

  it('renders public demo routes without authentication', async () => {
    await renderAt('/demo/lesson')

    expect(screen.getByText('DemoLessonPage')).toBeInTheDocument()
  })

  it('redirects anonymous users away from protected pages', async () => {
    await renderAt('/dashboard')

    expect(screen.getByText('LoginPage')).toBeInTheDocument()
    expect(screen.queryByText('DashboardPage')).not.toBeInTheDocument()
  })

  it('renders protected dashboard for authenticated users', async () => {
    authState.user = { id: 7, role: 'user' }
    authState.isAuthenticated = true

    await renderAt('/dashboard/classes')

    expect(screen.getByText('StudentClassesPage')).toBeInTheDocument()
  })

  it('allows admin-only AI panel for admins', async () => {
    authState.user = { id: 1, role: 'admin' }
    authState.isAuthenticated = true

    await renderAt('/admin/ai')

    expect(screen.getByText('AdminAiPage')).toBeInTheDocument()
  })

  it('redirects non-admin users from admin-only pages', async () => {
    authState.user = { id: 2, role: 'user' }
    authState.isAuthenticated = true

    await renderAt('/admin/ai')

    expect(screen.getByText('UnauthorizedPage')).toBeInTheDocument()
  })

  it('keeps legacy admin manual creation URL redirected to the canonical route', async () => {
    authState.user = { id: 1, role: 'admin' }
    authState.isAuthenticated = true

    await renderAt('/admin/manual-creatio')

    expect(screen.getByText('AdminManualCreationPage')).toBeInTheDocument()
  })
})
