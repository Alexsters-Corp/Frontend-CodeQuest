import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { API_URL } from '../services/api'

function RegisterPage() {
  const navigate = useNavigate()
  const { saveSession } = useAuth()
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'No fue posible registrar el usuario.')
      }

      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      })

      setMessage('¡Cuenta creada! Redirigiendo...')
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

      <div className="login-home__shell">
        <section className="login-panel">
          <div className="login-panel__card">
            <div className="login-home__brand login-panel__brand">
              <span className="login-home__brand-mark">&lt;/&gt;</span>
              <span className="login-home__brand-text">Ruta de aprendizaje</span>
            </div>           
            <h2>Crea tu cuenta</h2>
            <p className="login-panel__subtitle">Empieza tu ruta de aprendizaje hoy.</p>

            <form onSubmit={handleSubmit} className="form login-panel__form">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                value={formData.nombre}
                onChange={handleChange}
              />

              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
              />

              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                minLength={6}
                required
                value={formData.password}
                onChange={handleChange}
              />

              <button type="submit" className="login-panel__submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Crear cuenta'}
              </button>
            </form>

            {message && <p className="message success">{message}</p>}
            {error && <p className="message error">{error}</p>}

            <div className="login-panel__footer">
              <span>¿Ya tienes cuenta?</span>
              <Link to="/login">Inicia sesión</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default RegisterPage
