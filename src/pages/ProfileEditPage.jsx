import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import { apiFetch } from '../services/api'

function ProfileEditPage() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [form, setForm] = useState({ nombre: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await apiFetch('/api/users/profile')
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'No fue posible cargar tu perfil.')
      }

      const user = data.user || {}
      setForm({
        nombre: user.nombre || '',
        email: user.email || '',
      })
    } catch (error) {
      setErrorMessage(error.message || 'No fue posible cargar tu perfil.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) {
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await apiFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'No fue posible actualizar tu perfil.')
      }

      updateUser(data.user)
      setForm({
        nombre: data.user?.nombre || '',
        email: data.user?.email || '',
      })
      setSuccessMessage(data.message || 'Perfil actualizado exitosamente.')
    } catch (error) {
      setErrorMessage(error.message || 'No fue posible actualizar tu perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-page">
      <Navbar
        title="Editar perfil"
        profileActionLabel="Volver al dashboard"
        profileActionTo="/dashboard"
      />

      <section className="profile-edit-card">
        <div className="profile-edit-header">
          <h2>Tu información de perfil</h2>
          <p>Mantén tus datos actualizados para personalizar tu experiencia en CodeQuest.</p>
        </div>

        {loading ? (
          <p className="profile-edit-loading">Cargando perfil...</p>
        ) : (
          <form className="profile-edit-form" onSubmit={handleSubmit}>
            <label htmlFor="profile-nombre">Nombre</label>
            <input
              id="profile-nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              disabled={saving}
              required
            />

            <label htmlFor="profile-email">Correo electrónico</label>
            <input
              id="profile-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              disabled={saving}
              required
            />

            {errorMessage ? <p className="profile-edit-message error">{errorMessage}</p> : null}
            {successMessage ? <p className="profile-edit-message success">{successMessage}</p> : null}

            <div className="profile-edit-actions">
              <button
                type="button"
                className="profile-cancel-btn"
                onClick={() => navigate('/dashboard')}
                disabled={saving}
              >
                Volver
              </button>
              <button type="submit" className="profile-save-btn" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export default ProfileEditPage
