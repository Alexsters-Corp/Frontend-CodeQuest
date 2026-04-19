import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import { useLanguage } from '../context/useLanguage'
import { apiFetch } from '../services/api'
import { countryNameFromCode, resolveCountryCode } from '../utils/countries'
import { notifyError } from '../utils/notify'

const PRESET_ICONS = ['🙂', '😎', '🤖', '🚀', '💻', '🎯']

function fallbackUsername(email) {
  const value = String(email || '')
  const at = value.indexOf('@')
  if (at > 0) {
    return value.slice(0, at)
  }

  return value || ''
}

function ProfilePage() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const [profile, setProfile] = useState({
    username: '',
    nombre: '',
    email: '',
    avatar: PRESET_ICONS[0],
    countryCode: '',
    countryRaw: '',
    birthDate: '',
  })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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
      const countryCode = resolveCountryCode(user.countryCode, locale)

      setProfile({
        username: String(user.username || fallbackUsername(user.email)),
        nombre: user.nombre || '',
        email: user.email || '',
        avatar: String(user.avatar || PRESET_ICONS[0]),
        countryCode,
        countryRaw: '',
        birthDate: String(user.birthDate || ''),
      })
    } catch (error) {
      const message = error.message || t('profile.loadError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [locale, t])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  return (
    <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar title={t('profile.viewTitle')} />

      <section className="profile-edit-card">
        <div className="profile-header-row">
          <div className="profile-edit-header">
            <h2>{t('profile.infoTitle')}</h2>
            <p>{t('profile.infoDescription')}</p>
          </div>
          <div className="profile-header-actions">
            <button
              type="button"
              className="profile-back-btn"
              onClick={() => navigate('/dashboard')}
            >
              {t('profile.backDashboard')}
            </button>
            <button
              type="button"
              className="profile-settings-btn"
              onClick={() => navigate('/profile/edit')}
              aria-label={t('profile.editButton')}
              title={t('profile.editButton')}
            >
              ⚙
            </button>
          </div>
        </div>

        {loading ? (
          <p className="profile-edit-loading">{t('common.loadingProfile')}</p>
        ) : errorMessage ? (
          <div className="profile-edit-actions">
            <p className="profile-edit-message error">{errorMessage}</p>
            <button type="button" className="profile-cancel-btn" onClick={loadProfile}>
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <div className="profile-edit-form">
            <label>{t('profile.photo')}</label>
            <div className="profile-photo-preview" aria-label={t('profile.photo')}>
              <span>{profile.avatar}</span>
            </div>

            <label htmlFor="profile-view-username">{t('profile.username')}</label>
            <input
              id="profile-view-username"
              type="text"
              value={profile.username || t('profile.notSet')}
              readOnly
            />

            <label htmlFor="profile-view-nombre">{t('profile.name')}</label>
            <input
              id="profile-view-nombre"
              type="text"
              value={profile.nombre || t('profile.notSet')}
              readOnly
            />

            <label htmlFor="profile-view-email">{t('profile.email')}</label>
            <input
              id="profile-view-email"
              type="email"
              value={profile.email || t('profile.notSet')}
              readOnly
            />

            <label htmlFor="profile-view-password">{t('profile.password')}</label>
            <input
              id="profile-view-password"
              type="password"
              value="********"
              readOnly
            />

            <label>{t('profile.presetIcons')}</label>
            <div className="profile-icon-list" role="list">
              {PRESET_ICONS.map((icon) => (
                <span
                  key={icon}
                  className={`profile-icon-chip ${profile.avatar === icon ? 'active' : ''}`}
                  role="listitem"
                >
                  {icon}
                </span>
              ))}
            </div>

            <label htmlFor="profile-view-country">{t('profile.country')}</label>
            <input
              id="profile-view-country"
              type="text"
              value={
                countryNameFromCode(profile.countryCode, locale, '')
                || profile.countryRaw
                || t('profile.notSet')
              }
              readOnly
            />

            <label htmlFor="profile-view-birthdate">{t('profile.birthDate')}</label>
            <input
              id="profile-view-birthdate"
              type="text"
              value={profile.birthDate || t('profile.notSet')}
              readOnly
            />
          </div>
        )}
      </section>
    </MotionPage>
  )
}

export default ProfilePage