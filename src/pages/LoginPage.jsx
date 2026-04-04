import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../services/api'

function LoginPage() {
  const navigate = useNavigate()
  const { saveSession } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toastState, setToastState] = useState('hidden')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!error) {
      setToastState('hidden')
      return
    }

    setToastState('visible')
    const timeoutId = setTimeout(() => setToastState('leaving'), 3200)
    return () => clearTimeout(timeoutId)
  }, [error])

  useEffect(() => {
    if (toastState !== 'leaving') {
      return
    }

    const timeoutId = setTimeout(() => {
      setToastState('hidden')
      setError('')
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [toastState])

  const closeToast = () => {
    setToastState((current) => (current === 'hidden' ? 'hidden' : 'leaving'))
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'No fue posible iniciar sesión.')
      }

      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      })

      setMessage('Inicio de sesión exitoso.')
      setTimeout(() => navigate('/dashboard'), 400)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-home">
      <div className="login-home__aurora login-home__aurora--one" />
      <div className="login-home__aurora login-home__aurora--two" />

      {toastState !== 'hidden' && error && (
        <div
          className={`login-toast ${toastState === 'leaving' ? 'login-toast--leaving' : ''}`}
          role="alert"
          aria-live="assertive"
        >
          <span className="login-toast__icon" aria-hidden="true">
            !
          </span>
          <div className="login-toast__content">
            <strong>Ups, no se pudo iniciar sesión</strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="login-toast__close"
            onClick={closeToast}
            aria-label="Cerrar notificación"
          >
            x
          </button>
          <span className="login-toast__progress" aria-hidden="true" />
        </div>
      )}

      <div className="login-home__shell">
        <section className="login-panel">
          <div className="login-panel__card">
            <div className="login-home__brand login-panel__brand">
              <span className="login-home__brand-mark">&lt;/&gt;</span>
              <span className="login-home__brand-text">Ruta de aprendizaje</span>
            </div>

            <span className="login-panel__kicker">Acceso</span>
            <h2>Iniciar sesión</h2>
            <p className="login-panel__subtitle">
              Accede a tu cuenta para retomar tus módulos, revisar tu progreso y continuar tu ruta de estudio.
            </p>

            <form onSubmit={handleSubmit} className="form login-panel__form">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
              />

              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Tu contraseña"
              />

              <Link className="login-panel__forgot-link" to="/forgot-password">
                ¿Olvidaste tu contraseña?
              </Link>

              <button className="login-panel__submit" type="submit" disabled={isLoading}>
                {isLoading ? 'Ingresando...' : 'Entrar'}
              </button>
            </form>

            {message && <p className="message success">{message}</p>}

            <div className="login-panel__footer">
              <span>¿Todavía no tienes cuenta?</span>
              <Link to="/registro">Crear cuenta</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default LoginPage
