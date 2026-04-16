import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { apiFetch } from '../services/api'
import { notifyError, notifySuccess } from '../utils/notify'

function ProfileEditPage() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const { t } = useLanguage()
  const [form, setForm] = useState({ nombre: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await apiFetch('/api/users/profile')
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || t('profile.loadError'))
      }

      const user = data.user || {}
      setForm({
        nombre: user.nombre || '',
        email: user.email || '',
      })
    } catch (error) {
      const message = error.message || t('profile.loadError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

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
        throw new Error(data.message || t('profile.updateError'))
      }

      updateUser(data.user)
      setForm({
        nombre: data.user?.nombre || '',
        email: data.user?.email || '',
      })
      const message = data.message || t('profile.updateSuccess')
      setSuccessMessage(message)
      notifySuccess(message)
    } catch (error) {
      const message = error.message || t('profile.updateError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar
        title={t('profile.title')}
        profileActionLabel={t('profile.backDashboard')}
        profileActionTo="/dashboard"
      />

      <section className="profile-edit-card">
        <div className="profile-edit-header">
          <h2>{t('profile.infoTitle')}</h2>
          <p>{t('profile.infoDescription')}</p>
        </div>

        {loading ? (
          <p className="profile-edit-loading">{t('common.loadingProfile')}</p>
        ) : (
          <form className="profile-edit-form" onSubmit={handleSubmit}>
            <label htmlFor="profile-nombre">{t('profile.name')}</label>
            <input
              id="profile-nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              disabled={saving}
              required
            />

            <label htmlFor="profile-email">{t('profile.email')}</label>
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
                {t('common.back')}
              </button>
              <button type="submit" className="profile-save-btn" disabled={saving}>
                {saving ? t('common.saving') : t('profile.save')}
              </button>
            </div>
          </form>
        )}
      </section>
    </MotionPage>
  )
}

export default ProfileEditPage
