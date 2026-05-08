import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import PrivateRoute from './components/PrivateRoute'
import PublicRoute from './components/PublicRoute'
import RoleGuard from './components/guards/RoleGuard'
import LanguageSwitcher from './components/LanguageSwitcher'
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
import UnauthorizedPage from './pages/UnauthorizedPage'
import InstructorDashboardPage from './pages/InstructorDashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminAiPage from './pages/AdminAiPage'
import ProfilePage from './pages/ProfilePage'
import ProfileEditPage from './pages/ProfileEditPage'
import RankingPage from './pages/RankingPage'
import SocialPage from './pages/SocialPage'
import DemoLandingPage from './pages/DemoLandingPage'
import DemoLessonPage from './pages/DemoLessonPage'
import DemoCompletionPage from './pages/DemoCompletionPage'

function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    const isMarketingRoute = pathname === '/' || pathname === '/demo'
    document.body.classList.toggle('theme-marketing', isMarketingRoute)
    return () => {
      document.body.classList.remove('theme-marketing')
    }
  }, [pathname])

  return (
    <LanguageProvider>
      <AuthProvider>
        {!pathname.startsWith('/demo') && <LanguageSwitcher />}

        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="dark"
          toastOptions={{
            className: 'cq-toast',
            descriptionClassName: 'cq-toast-description',
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
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Demo publico (HU-025) - sin guards, accesible sin auth */}
          <Route path="/demo" element={<DemoLandingPage />} />
          <Route path="/demo/lesson" element={<DemoLessonPage />} />
          <Route path="/demo/complete" element={<DemoCompletionPage />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
