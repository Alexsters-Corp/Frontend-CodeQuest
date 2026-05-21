import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoMdArrowRoundBack, IoMdArrowRoundForward } from 'react-icons/io'
import { IoCreateOutline, IoTrophyOutline } from 'react-icons/io5'
import LoadingSpinner from '../components/LoadingSpinner'
import MotionPage from '../components/MotionPage'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { apiFetch } from '../services/api'
import { getDashboardOverview } from '../services/learningApi'
import { countryNameFromCode, resolveCountryCode } from '../utils/countries'
import { notifyError } from '../utils/notify'

const PRESET_ICONS = ['🙂', '😎', '🤖', '🚀', '💻', '🎯']

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function renderLanguageIcon(icon, label) {
  if (isHttpUrl(icon)) {
    return <img className="profile-page-language-chip__image" src={icon} alt={`Logo de ${label}`} loading="lazy" />
  }

  return <span className="profile-page-language-chip__emoji">{icon || '💻'}</span>
}

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
  const [overview, setOverview] = useState(null)
  const [activeTab, setActiveTab] = useState('summary')

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
      setOverview(overviewData || null)
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

  const countryLabel = useMemo(() => {
    if (!profile.countryCode) {
      return t('profile.notSet')
    }

    return countryNameFromCode(profile.countryCode, locale) || profile.countryCode
  }, [locale, profile.countryCode, t])

  const statsCards = [
    { label: 'Desafíos completados', value: String(overview?.completedChallenges || 0) },
    { label: 'Ejercicios resueltos', value: '—' },
    { label: 'Días activo', value: '—' },
    { label: 'Ranking máximo', value: '—' },
  ]

  const tabs = [
    { id: 'summary', label: 'Resumen' },
    { id: 'stats', label: 'Estadísticas' },
    { id: 'activity', label: 'Actividad' },
    { id: 'languages', label: 'Lenguajes' },
    { id: 'followers', label: 'Seguidores' },
    { id: 'following', label: 'Siguiendo' },
  ]

  const nextLevelXp = (profile.currentLevel || 1) * 500
  const currentLevelBaseXp = Math.max(0, ((profile.currentLevel || 1) - 1) * 500)
  const currentLevelProgressXp = Math.max(0, (profile.totalXp || 0) - currentLevelBaseXp)
  const xpNeededForNextLevel = Math.max(0, nextLevelXp - (profile.totalXp || 0))
  const levelProgressPercent = Math.min(100, Math.max(0, (currentLevelProgressXp / 500) * 100))

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
        <section className="profile-page-shell user-profile-page-shell">
          <button type="button" className="profile-page-back" onClick={() => navigate('/ranking')}>
            <IoMdArrowRoundBack />
            <span>Volver al ranking</span>
          </button>

          {loading ? (
            <div className="profile-edit-loading-container profile-page-card">
              <LoadingSpinner size="large" />
              <p>{t('common.loadingProfile')}</p>
            </div>
          ) : errorMessage ? (
            <div className="profile-edit-actions profile-page-card">
              <p className="profile-edit-message error">{errorMessage}</p>
              <button type="button" className="profile-cancel-btn" onClick={loadProfileData}>
                {t('common.retry')}
              </button>
            </div>
          ) : (
            <>
              <section className="profile-page-hero profile-page-card user-profile-page-hero">
                <div className="profile-page-hero__identity">
                  <div className="profile-page-hero__avatar-wrap">
                    <div className="profile-page-hero__avatar" aria-label={t('profile.photo')}>
                      <span>{profile.avatar}</span>
                    </div>
                    <span className="profile-page-hero__status-dot" aria-hidden="true" />
                  </div>

                  <div className="profile-page-hero__copy">
                    <div className="profile-page-hero__headline">
                      <h1>{profile.username || t('profile.notSet')}</h1>
                      <div className="profile-page-hero__mini-metrics">
                        <span>
                          <span className="profile-page-hero__mini-metrics-emoji">🔥</span>
                          {t('dashboard.days', { count: overview?.racha || 0 })}
                        </span>
                        <span>Nivel {profile.currentLevel || 1}</span>
                      </div>
                    </div>
                    <p className="profile-page-hero__bio">
                      {profile.nombre || t('profile.notSet')} explora desafios y mejora su progreso en CodeQuest.
                    </p>
                    <div className="profile-page-hero__meta">
                      <span>📍 {countryLabel}</span>
                      <span>✉ {profile.email || t('profile.notSet')}</span>
                    </div>
                    <div className="profile-page-hero__actions">
                      <button type="button" className="profile-follow-btn profile-follow-btn--edit" onClick={() => navigate('/profile/edit')}>
                        <span className="profile-follow-btn__icon" aria-hidden="true">
                          <IoCreateOutline />
                        </span>
                        <span>Editar perfil</span>
                      </button>
                      <button type="button" className="profile-cancel-btn">
                        Compartir perfil
                      </button>
                    </div>
                  </div>
                </div>

                <aside className="profile-page-hero__spotlight">
                  <div className="profile-page-hero__spotlight-top">
                    <div className="profile-page-hero__trophy" aria-hidden="true">
                      <IoTrophyOutline />
                    </div>
                    <div>
                      <p>Posición actual</p>
                      <strong>#1</strong>
                      <div className="profile-page-hero__spotlight-line" />
                    </div>
                  </div>
                  <p className="profile-page-hero__progress-copy">Progreso al siguiente nivel</p>
                  <div className="profile-page-hero__progress-meta">
                    <span>{profile.totalXp?.toLocaleString() || 0} XP</span>
                    <span>Para el próximo nivel</span>
                  </div>
                  <div className="profile-page-hero__progress">
                    <div className="profile-page-hero__progress-bar">
                      <span style={{ width: `${levelProgressPercent}%` }} />
                    </div>
                  </div>
                  <div className="profile-page-hero__progress-meta profile-page-hero__progress-meta--footer">
                    <span>{currentLevelProgressXp.toLocaleString()} XP</span>
                    <span>{xpNeededForNextLevel.toLocaleString()} XP faltantes</span>
                  </div>
                </aside>
              </section>

              <nav className="profile-page-tabs user-profile-page-tabs" aria-label="Perfil">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`profile-page-tabs__item ${activeTab === tab.id ? 'profile-page-tabs__item--active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              {activeTab === 'summary' ? (
                <div className="profile-page-grid profile-page-grid--summary user-profile-page-grid">
                  <section className="profile-page-panel">
                    <div className="profile-page-panel__header">
                      <h3>Estadísticas generales</h3>
                    </div>
                    <div className="profile-page-stats-grid">
                      {statsCards.map((card) => (
                        <article key={card.label} className="profile-page-stat-box">
                          <span>{card.label}</span>
                          <strong>{card.value}</strong>
                        </article>
                      ))}
                    </div>
                    <button type="button" className="profile-page-panel__cta">
                      Ver todas las estadísticas <IoMdArrowRoundForward />
                    </button>
                  </section>

                  <section className="profile-page-panel">
                    <div className="profile-page-panel__header">
                      <h3>Actividad reciente</h3>
                    </div>
                    <div className="profile-page-empty-slot" />
                  </section>

                  <section className="profile-page-panel">
                    <div className="profile-page-panel__header">
                      <h3>Lenguajes principales</h3>
                    </div>
                    {overview?.languages?.length > 0 ? (
                      <div className="profile-page-languages profile-page-languages--row">
                        {overview.languages.map((language) => (
                          <article key={language.lenguaje_id} className="profile-page-language-chip">
                            <span className="profile-page-language-chip__icon">
                              {renderLanguageIcon(language.icono, language.nombre)}
                            </span>
                            <span>{language.nombre}</span>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : (
                <section className="profile-page-panel profile-page-panel--tab-only">
                  <div className="profile-page-panel__header">
                    <h3>{tabs.find((tab) => tab.id === activeTab)?.label || 'Sección'}</h3>
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default ProfilePage
