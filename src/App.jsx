import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { useLanguage } from './context/useLanguage'
import { useAuth } from './context/useAuth'
import PrivateRoute from './components/PrivateRoute'
import PublicRoute from './components/PublicRoute'
import RoleGuard from './components/guards/RoleGuard'
import { useToastPosition } from './hooks/useToastPosition'
import { configureNotifications } from './utils/notify'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import OnboardingLanguagePage from './pages/OnboardingLanguagePage'
import OnboardingTourPage from './pages/OnboardingTourPage'
import DiagnosticTestPage from './pages/DiagnosticTestPage'
import ModulesPage from './pages/ModulesPage'
import LessonPage from './pages/LessonPage'
import FavoritesPage from './pages/FavoritesPage'
import ProfilePage from './pages/ProfilePage'
import StudentClassesPage from './pages/StudentClassesPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import InstructorDashboardPage from './pages/InstructorDashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminManualCreationPage from './pages/AdminManualCreationPage'
import AdminAiPage from './pages/AdminAiPage'
import ForbiddenPage from './pages/UnauthorizedPage'

import ProfileEditPage from './pages/ProfileEditPage'
import ProfileConnectionsPage from './pages/ProfileConnectionsPage'
import UserProfilePage from './pages/UserProfilePage'
import RankingPage from './pages/RankingPage'
import SocialPage from './pages/SocialPage'
import DemoLandingPage from './pages/DemoLandingPage'
import DemoLessonPage from './pages/DemoLessonPage'
import DemoCompletionPage from './pages/DemoCompletionPage'

const SIDEBAR_ROUTES = [
  '/dashboard', '/favorites', '/profile', '/ranking',
  '/social', '/users', '/instructor', '/admin', '/modules',
  '/lesson', '/diagnostic', '/onboarding', '/dashboard/classes',
]

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  )
}

function AppContent() {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  const toastPosition = useToastPosition()

  useEffect(() => {
    configureNotifications({
      close: t('notifications.close'),
      closeAria: t('notifications.close_aria'),
    })
  }, [t])

  useEffect(() => {
    const isMarketingRoute = pathname === '/' || pathname === '/demo'
    document.body.classList.toggle('theme-marketing', isMarketingRoute)
    return () => {
      document.body.classList.remove('theme-marketing')
    }
  }, [pathname])

  return (
    <>
        <Toaster
          position={toastPosition}
          offset="72px"
          theme="dark"
          toastOptions={{
            className: 'cq-toast',
          }}
        />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/registro"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/onboarding/language"
            element={
              <PrivateRoute>
                <OnboardingLanguagePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/onboarding/tour"
            element={
              <PrivateRoute>
                <OnboardingTourPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/classes"
            element={
              <PrivateRoute>
                <StudentClassesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/diagnostic"
            element={
              <PrivateRoute>
                <DiagnosticTestPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/modules"
            element={
              <PrivateRoute>
                <ModulesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/lesson/:lessonId"
            element={
              <PrivateRoute>
                <LessonPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <PrivateRoute>
                <FavoritesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/ranking"
            element={
              <PrivateRoute>
                <RankingPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/social"
            element={
              <PrivateRoute>
                <SocialPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <PrivateRoute>
                <ProfileEditPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/connections"
            element={
              <PrivateRoute>
                <ProfileConnectionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/users/:username"
            element={
              <PrivateRoute>
                <UserProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/u/:username"
            element={<SharedProfileRoute />}
          />
          <Route
            path="/users/:username/connections"
            element={
              <PrivateRoute>
                <ProfileConnectionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/instructor"
            element={
              <PrivateRoute>
                <RoleGuard allowedRoles={['instructor', 'admin']}>
                  <InstructorDashboardPage />
                </RoleGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </RoleGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/ai"
            element={
              <PrivateRoute>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminAiPage />
                </RoleGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/manual-creation"
            element={
              <PrivateRoute>
                <RoleGuard allowedRoles={['admin']}>
                  <AdminManualCreationPage />
                </RoleGuard>
              </PrivateRoute>
            }
          />
          <Route path="/admin/manual-creatio" element={<Navigate to="/admin/manual-creation" replace />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Demo publico (HU-025) - sin guards, accesible sin auth */}
          <Route path="/demo" element={<DemoLandingPage />} />
          <Route path="/demo/lesson" element={<DemoLessonPage />} />
          <Route path="/demo/complete" element={<DemoCompletionPage />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    </>
  )
}

function SharedProfileRoute() {
  const { username } = useParams()
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return null
  }

  if (isAuthenticated && username) {
    return <Navigate to={`/users/${encodeURIComponent(username)}`} replace />
  }

  return <UserProfilePage standalone />
}

export default App
