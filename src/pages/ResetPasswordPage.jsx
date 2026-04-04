import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../services/api'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Si no hay token, mostrar error
  if (!token) {
    return (
      <div className="page">
        <div className="card">
          <h1>Restablecer contraseña</h1>
          <p className="message error">
            El enlace de recuperación es inválido o ha expirado.
          </p>
          <p>
            Intenta <Link to="/forgot-password">solicitar uno nuevo</Link>.
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    // Validar longitud mínima
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'No fue posible restablecer la contraseña.')
      }

      setMessage('Contraseña restablecida exitosamente.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Restablecer contraseña</h1>
        <p className="message">
          Ingresa tu nueva contraseña (mínimo 8 caracteres).
        </p>

        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="password">Nueva contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tu nueva contraseña"
            minLength="8"
          />

          <label htmlFor="confirmPassword">Confirmar contraseña</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirma tu contraseña"
            minLength="8"
          />

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Restableciendo...' : 'Restablecer contraseña'}
          </button>
        </form>

        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}

        <p>
          Volver a <Link to="/login">iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPasswordPage
