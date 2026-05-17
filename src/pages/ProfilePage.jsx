import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ActivityLineChart from '../components/ActivityLineChart'
import LoadingSpinner from '../components/LoadingSpinner'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { apiFetch } from '../services/api'
import { getDashboardOverview } from '../services/learningApi'
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
  const [recentXP, setRecentXP] = useState([])

  const loadProfileData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const [profileRes, overviewData] = await Promise.all([
        apiFetch('/api/users/profile'),
        getDashboardOverview()
      ])
      
      const profileData = await profileRes.json().catch(() => ({}))

      if (!profileRes.ok) {
        throw new Error(profileData.message || t('profile.loadError'))
      }

      const user = profileData.user || {}
      const countryCode = resolveCountryCode(user.countryCode, locale)

      // El XP de overviewData es mas fiable porque calcula sumas reales si el denormalizado falla
      const totalXp = overviewData?.xpTotal !== undefined 
        ? Number(overviewData.xpTotal) 
        : Number(user.totalXp || 0)

      setProfile({
        username: String(user.username || fallbackUsername(user.email)),
        nombre: user.nombre || '',
        email: user.email || '',
        avatar: String(user.avatar || PRESET_ICONS[0]),
        totalXp,
        currentLevel: Number(user.currentLevel || 1),
        countryCode,
        countryRaw: '',
        birthDate: String(user.birthDate || ''),
      })

      if (overviewData?.recentXP) {
        setRecentXP(overviewData.recentXP)
      }
    } catch (error) {
      const message = error.message || t('profile.loadError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [locale, t])

  useEffect(() => {
    loadProfileData()
  }, [loadProfileData])

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
      <section className="profile-edit-card" style={{ marginTop: '24px' }}>
        <div className="profile-header-row">
          <div className="profile-edit-header">
            <h2>{t('profile.infoTitle')}</h2>
            <p>{t('profile.infoDescription')}</p>
          </div>
          <div className="profile-header-actions">
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
          <div className="profile-edit-loading-container">
            <LoadingSpinner size="large" />
            <p>{t('common.loadingProfile')}</p>
          </div>
        ) : errorMessage ? (
          <div className="profile-edit-actions">
            <p className="profile-edit-message error">{errorMessage}</p>
            <button type="button" className="profile-cancel-btn" onClick={loadProfileData}>
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

            <div className="profile-edit-header" style={{ marginTop: '28px' }}>
              <h3>{t('profile.progressTitle')}</h3>
            </div>

            <div className="social-summary-grid" style={{ marginTop: '12px' }}>
              <article className="stat-card">
                <span className="stat-card__icon">⭐</span>
                <div className="stat-card__content">
                  <p>{t('dashboard.totalXp')}</p>
                  <strong>{profile.totalXp?.toLocaleString() || 0} XP</strong>
                </div>
              </article>
              <article className="stat-card">
                <span className="stat-card__icon">📊</span>
                <div className="stat-card__content">
                  <p>{t('dashboard.level')}</p>
                  <strong>{profile.currentLevel || 1}</strong>
                </div>
              </article>
            </div>

            {recentXP.length > 0 && (
              <div className="profile-activity-section" style={{ marginTop: '24px' }}>
                <label>{t('dashboard.activityWeek')}</label>
                <ActivityLineChart data={recentXP} />
              </div>
            )}

            <label htmlFor="profile-view-country" style={{ marginTop: '20px' }}>{t('profile.country')}</label>
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
    </SidebarLayout>
  )
}

export default ProfilePage
