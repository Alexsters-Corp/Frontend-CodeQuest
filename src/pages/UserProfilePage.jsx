import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IoMdArrowRoundBack } from 'react-icons/io'
import { IoMdArrowRoundForward } from 'react-icons/io'
import { IoPersonAddOutline, IoPersonRemoveOutline, IoTrophyOutline } from 'react-icons/io5'
import LoadingSpinner from '../components/LoadingSpinner'
import MotionPage from '../components/MotionPage'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { followUserByUsername, getPublicUserProfile, unfollowUserByUsername } from '../services/socialApi'
import { countryNameFromCode, resolveCountryCode } from '../utils/countries'
import { notifyError, notifySuccess } from '../utils/notify'

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function renderLanguageIcon(icon, label) {
  if (isHttpUrl(icon)) {
    return <img className="profile-page-language-chip__image" src={icon} alt={`Logo de ${label}`} loading="lazy" />
  }

  return <span className="profile-page-language-chip__emoji">{icon || '💻'}</span>
}

function UserProfilePage() {
  const navigate = useNavigate()
  const { username } = useParams()
  const { t, language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [pendingFollowAction, setPendingFollowAction] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const data = await getPublicUserProfile(username)
      setProfile(data.user || null)
    } catch (error) {
      const message = error.message || 'No fue posible cargar este perfil.'
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const countryLabel = useMemo(() => {
    if (!profile?.countryCode) {
      return t('profile.notSet')
    }

    const normalized = resolveCountryCode(profile.countryCode, locale)
    return countryNameFromCode(normalized, locale) || normalized
  }, [locale, profile?.countryCode, t])

  const tabs = [
    { id: 'summary', label: 'Resumen' },
    { id: 'stats', label: 'Estadísticas' },
    { id: 'activity', label: 'Actividad' },
    { id: 'languages', label: 'Lenguajes' },
    { id: 'followers', label: 'Seguidores' },
    { id: 'following', label: 'Siguiendo' },
  ]

  const statsCards = [
    { label: 'Desafíos completados', value: String(profile?.lessonsCompleted || 0) },
    { label: 'Ejercicios resueltos', value: '—' },
    { label: 'Días activo', value: '—' },
    { label: 'Ranking máximo', value: '—' },
  ]

  const nextLevelXp = (profile?.currentLevel || 1) * 500
  const currentLevelBaseXp = Math.max(0, ((profile?.currentLevel || 1) - 1) * 500)
  const currentLevelProgressXp = Math.max(0, (profile?.totalXp || 0) - currentLevelBaseXp)
  const xpNeededForNextLevel = Math.max(0, nextLevelXp - (profile?.totalXp || 0))
  const levelProgressPercent = Math.min(100, Math.max(0, (currentLevelProgressXp / 500) * 100))

  const handleToggleFollow = async () => {
    if (!profile?.username) {
      return
    }

    setPendingFollowAction(true)
    try {
      if (profile.isFollowing) {
        await unfollowUserByUsername(profile.username)
        notifySuccess(t('social.unfollowSuccess', { username: profile.username }), { groupKey: 'social-follow' })
      } else {
        await followUserByUsername(profile.username)
        notifySuccess(t('social.followSuccess', { username: profile.username }), { groupKey: 'social-follow' })
      }

      await loadProfile()
    } catch (error) {
      notifyError(error.message || t('ranking.actionError'))
    } finally {
      setPendingFollowAction(false)
    }
  }

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
              <button type="button" className="profile-cancel-btn" onClick={loadProfile}>
                {t('common.retry')}
              </button>
            </div>
          ) : profile ? (
            <>
              <section className="profile-page-hero profile-page-card user-profile-page-hero">
                <div className="profile-page-hero__identity">
                  <div className="profile-page-hero__avatar-wrap">
                    <div className="profile-page-hero__avatar" aria-label={t('profile.photo')}>
                      <span>{String(profile.avatar || '🙂')}</span>
                    </div>
                    <span className="profile-page-hero__status-dot" aria-hidden="true" />
                  </div>

                  <div className="profile-page-hero__copy">
                    <div className="profile-page-hero__headline">
                      <h1>{profile.username || t('profile.notSet')}</h1>
                      <div className="profile-page-hero__mini-metrics">
                        <span><span className="profile-page-hero__mini-metrics-emoji">🔥</span>{t('dashboard.days', { count: profile?.racha || 0 })}</span>
                        <span>Nivel {profile.currentLevel || 1}</span>
                      </div>
                    </div>
                    <p className="profile-page-hero__bio">
                      {profile.nombre || t('profile.notSet')} participa en CodeQuest y comparte su progreso con la comunidad.
                    </p>
                    <div className="profile-page-hero__meta">
                      <span>📍 {countryLabel}</span>
                      <span>🗓 Se unió en 2024</span>
                    </div>
                    <div className="profile-page-hero__meta">
                      <span>👥 {profile.followers || 0} seguidores</span>
                      <span>➡ {profile.following || 0} seguidos</span>
                    </div>
                    <div className="profile-page-hero__actions">
                      <button
                        type="button"
                        className={`profile-follow-btn ${profile.isFollowing ? 'profile-follow-btn--following' : 'profile-follow-btn--idle'}`}
                        onClick={handleToggleFollow}
                        disabled={pendingFollowAction}
                      >
                        <span className="profile-follow-btn__icon" aria-hidden="true">
                          {profile.isFollowing ? <IoPersonRemoveOutline /> : <IoPersonAddOutline />}
                        </span>
                        <span>
                        {pendingFollowAction
                          ? t('common.loading')
                          : profile.isFollowing
                            ? t('social.unfollowAction')
                            : t('social.followAction')}
                        </span>
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

              <nav className="profile-page-tabs user-profile-page-tabs" aria-label="Perfil público">
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
                    {profile.languages?.length > 0 ? (
                      <div className="profile-page-languages profile-page-languages--row">
                        {profile.languages.map((language) => (
                          <article key={language.id} className="profile-page-language-chip">
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
          ) : null}
        </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default UserProfilePage
