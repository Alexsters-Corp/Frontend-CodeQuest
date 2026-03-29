import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import PublicRoute from './components/PublicRoute'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingLanguagePage from './pages/OnboardingLanguagePage'
import OnboardingTourPage from './pages/OnboardingTourPage'
import DiagnosticTestPage from './pages/DiagnosticTestPage'
import ModulesPage from './pages/ModulesPage'
import LessonPage from './pages/LessonPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
