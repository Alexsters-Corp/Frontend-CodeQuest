import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GoPaperclip } from 'react-icons/go'
import { IoIosArrowBack } from 'react-icons/io'
import { IoMdArrowRoundBack } from 'react-icons/io'
import { IoMdArrowRoundForward } from 'react-icons/io'
import { IoTrophyOutline } from 'react-icons/io5'
import { AiOutlineUserAdd, AiOutlineUserSwitch, AiOutlineUsergroupAdd } from 'react-icons/ai'
import { SlLocationPin } from 'react-icons/sl'
import { LuUserRoundCheck, LuUsersRound } from 'react-icons/lu'
import CountryFlag from '../components/CountryFlag'
import LoadingSpinner from '../components/LoadingSpinner'
import MotionPage from '../components/MotionPage'
import SidebarLayout from '../components/SidebarLayout'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { followUserByUsername, getPublicUserProfile, getSharedPublicUserProfile, unfollowUserByUsername } from '../services/socialApi'
import { countryNameFromCode, resolveCountryCode } from '../utils/countries'
import { notifyError, notifySuccess } from '../utils/notify'

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function renderLanguageIcon(icon, label, t) {
  if (isHttpUrl(icon)) {
    return <img className="profile-page-language-chip__image" src={icon} alt={t('dashboard.languageLogoAlt', { name: label })} loading="lazy" />
  }

  return <span className="profile-page-language-chip__emoji">{icon || '💻'}</span>
}

function formatProfileMetric(value, { prefix = '' } = {}) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '—'
  }

  return `${prefix}${numericValue.toLocaleString()}`
}

function formatCompactNumber(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '0'
  }

  return numericValue.toLocaleString()
}

function UserProfilePage({ standalone = false }) {
  const navigate = useNavigate()
  const { username } = useParams()
  const { isAuthenticated } = useAuth()
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
      const data = standalone
        ? await getSharedPublicUserProfile(username)
        : await getPublicUserProfile(username)
      setProfile(data.user || null)
    } catch (error) {
      const message = error.message || t('profile.publicLoadError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [standalone, t, username])

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
    { id: 'summary', label: t('profile.tabs.summary') },
    { id: 'stats', label: t('profile.tabs.stats') },
    { id: 'activity', label: t('profile.tabs.activity') },
    { id: 'languages', label: t('profile.tabs.languages') },
  ]

  const statsCards = [
    { label: t('profile.stats.completedChallenges'), value: String(profile?.lessonsCompleted || 0) },
    { label: t('profile.stats.solvedExercises'), value: formatProfileMetric(profile?.solvedExercises) },
    { label: t('profile.stats.activeDays'), value: formatProfileMetric(profile?.activeDays) },
    { label: t('profile.stats.bestRanking'), value: formatProfileMetric(profile?.bestRanking, { prefix: '#' }) },
  ]

  const nextLevelXp = (profile?.currentLevel || 1) * 500
  const currentLevelBaseXp = Math.max(0, ((profile?.currentLevel || 1) - 1) * 500)
  const currentLevelProgressXp = Math.max(0, (profile?.totalXp || 0) - currentLevelBaseXp)
  const xpNeededForNextLevel = Math.max(0, nextLevelXp - (profile?.totalXp || 0))
  const levelProgressPercent = Math.min(100, Math.max(0, (currentLevelProgressXp / 500) * 100))
  const streakCount = profile?.racha || 0
  const currentRanking = Number(profile?.currentRanking || 0)
  const rankingLabel = currentRanking > 0 ? `#${currentRanking}` : t('profile.rankUnavailable')
  const streakEmojiClass = [
    'profile-page-hero__mini-metrics-emoji',
    'streak-emoji',
    streakCount > 0 ? 'streak-emoji--active' : 'streak-emoji--inactive',
  ].join(' ')
  const isMutualFollow = Boolean(profile?.isFollowing && profile?.isFollowingBack)
  const followButtonLabel = pendingFollowAction
    ? t('common.loading')
    : profile?.isFollowing
      ? (isMutualFollow ? t('social.mutualFollowLabel') : t('social.followingLabel'))
      : t('social.followAction')
  const openConnections = (tab) => {
    if (standalone) {
      return
    }

    navigate(`/users/${encodeURIComponent(username)}/connections?tab=${tab}`)
  }
  const joinedLabel = useMemo(() => {
    if (!profile?.createdAt) {
      return t('profile.joinedFallback')
    }

    const date = new Date(profile.createdAt)
    if (Number.isNaN(date.getTime())) {
      return t('profile.joinedFallback')
    }

    return t('profile.joinedOn', {
      date: new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
        month: 'long',
        year: 'numeric',
      }).format(date),
    })
  }, [locale, profile?.createdAt, t])
  const languageCards = profile?.languages || []
  const extraStatsCards = [
    { label: t('dashboard.totalXp'), value: `${formatCompactNumber(profile?.totalXp || 0)} XP` },
    { label: t('dashboard.level'), value: formatCompactNumber(profile?.currentLevel || 1) },
    { label: t('dashboard.streak'), value: t('dashboard.days', { count: streakCount }) },
    { label: t('profile.currentPosition'), value: rankingLabel },
  ]

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

  const content = (
    <MotionPage className={`dashboard-page ${standalone ? 'dashboard-page--public-profile' : ''}`} delay={0.06}>
      <section className={`profile-page-shell user-profile-page-shell ${standalone ? 'public-profile-shell' : ''}`}>
        {standalone ? (
          <div className="public-profile-shell__topbar">
            <div className="public-profile-shell__auth-actions">
              <button type="button" className="profile-cancel-btn public-profile-shell__ghost-btn" onClick={() => navigate('/login')}>
                {t('home.login')}
              </button>
              <button type="button" className="profile-follow-btn profile-follow-btn--share public-profile-shell__auth-btn" onClick={() => navigate('/registro')}>
                {t('home.getStarted')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="profile-page-back"
            onClick={() => navigate('/ranking')}
          >
              <IoIosArrowBack />
              <span>{t('common.back')}</span>
          </button>
        )}

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
                  </div>

                  <div className="profile-page-hero__copy">
                    <div className="profile-page-hero__headline">
                      <h1>{profile.username || t('profile.notSet')}</h1>
                      <div className="profile-page-hero__mini-metrics">
                        <span><span className={streakEmojiClass}>🔥</span>{t('dashboard.days', { count: streakCount })}</span>
                        <span>{t('ranking.levelLabel', { value: profile.currentLevel || 1 })}</span>
                      </div>
                    </div>
                    <p className="profile-page-hero__bio">
                      {profile.bio?.trim() || t('profile.noBio')}
                    </p>
                    <div className="profile-page-hero__meta">
                      {profile.countryCode ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <CountryFlag code={profile.countryCode} label={countryLabel} />
                          <span>{countryLabel}</span>
                        </span>
                      ) : (
                        <span className="profile-page-hero__meta-item"><SlLocationPin /> {t('profile.country')}</span>
                      )}
                      <span className="profile-page-hero__meta-item"><GoPaperclip /> {joinedLabel}</span>
                    </div>
                    <div className="profile-page-hero__meta">
                      {standalone ? (
                        <>
                          <span className="profile-page-hero__meta-item"><LuUsersRound /> {t('social.followersCount', { count: profile.followers || 0 })}</span>
                          <span className="profile-page-hero__meta-item"><AiOutlineUsergroupAdd /> {t('social.followingCount', { count: profile.following || 0 })}</span>
                        </>
                      ) : (
                        <>
                          <button type="button" className="profile-page-hero__meta-button" onClick={() => openConnections('followers')}>
                            <span className="profile-page-hero__meta-item"><LuUsersRound /> {t('social.followersCount', { count: profile.followers || 0 })}</span>
                          </button>
                          <button type="button" className="profile-page-hero__meta-button" onClick={() => openConnections('following')}>
                            <span className="profile-page-hero__meta-item"><AiOutlineUsergroupAdd /> {t('social.followingCount', { count: profile.following || 0 })}</span>
                          </button>
                        </>
                      )}
                    </div>
                    {!standalone && isAuthenticated ? (
                      <div className="profile-page-hero__actions">
                        <button
                          type="button"
                          className={`profile-follow-btn ${profile.isFollowing ? 'profile-follow-btn--following' : 'profile-follow-btn--idle'}`}
                          onClick={handleToggleFollow}
                          disabled={pendingFollowAction}
                        >
                          <span className="profile-follow-btn__icon" aria-hidden="true">
                            {profile.isFollowing
                              ? (isMutualFollow ? <AiOutlineUserSwitch /> : <LuUserRoundCheck />)
                              : <AiOutlineUserAdd />}
                          </span>
                          <span>{followButtonLabel}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <aside className="profile-page-hero__spotlight">
                  <div className="profile-page-hero__spotlight-top">
                    <div className="profile-page-hero__trophy" aria-hidden="true">
                      <IoTrophyOutline />
                    </div>
                    <div>
                      <p>{t('profile.currentPosition')}</p>
                      <strong>{rankingLabel}</strong>
                      <div className="profile-page-hero__spotlight-line" />
                    </div>
                  </div>
                  <p className="profile-page-hero__progress-copy">{t('profile.nextLevelProgress')}</p>
                  <div className="profile-page-hero__progress-meta">
                    <span>{profile.totalXp?.toLocaleString() || 0} XP</span>
                    <span>{t('profile.nextLevelLabel')}</span>
                  </div>
                  <div className="profile-page-hero__progress">
                    <div className="profile-page-hero__progress-bar">
                      <span style={{ width: `${levelProgressPercent}%` }} />
                    </div>
                  </div>
                  <div className="profile-page-hero__progress-meta profile-page-hero__progress-meta--footer">
                    <span>{currentLevelProgressXp.toLocaleString()} XP</span>
                    <span>{t('profile.xpRemaining', { value: xpNeededForNextLevel.toLocaleString() })}</span>
                  </div>
                </aside>
            </section>

            <nav className="profile-page-tabs user-profile-page-tabs" aria-label={t('profile.publicAria')}>
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
                      <h3>{t('profile.generalStats')}</h3>
                    </div>
                    <div className="profile-page-stats-grid">
                      {statsCards.map((card) => (
                        <article key={card.label} className="profile-page-stat-box">
                          <span>{card.label}</span>
                          <strong>{card.value}</strong>
                        </article>
                      ))}
                    </div>
                    <button type="button" className="profile-page-panel__cta" onClick={() => setActiveTab('stats')}>
                      {t('profile.viewAllStats')} <IoMdArrowRoundForward />
                    </button>
                  </section>

                  <section className="profile-page-panel">
                    <div className="profile-page-panel__header">
                      <h3>{t('profile.recentActivity')}</h3>
                    </div>
                    <p className="profile-page-empty-copy">{t('profile.publicActivityEmpty')}</p>
                  </section>

                  <section className="profile-page-panel">
                    <div className="profile-page-panel__header">
                      <h3>{t('profile.topLanguages')}</h3>
                    </div>
                    {languageCards.length > 0 ? (
                      <div className="profile-page-languages profile-page-languages--row">
                        {languageCards.map((language) => (
                          <article key={language.id} className="profile-page-language-chip">
                            <span className="profile-page-language-chip__icon">
                              {renderLanguageIcon(language.icono, language.nombre, t)}
                            </span>
                            <span>{language.nombre}</span>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="profile-page-empty-copy">{t('profile.languagesEmpty')}</p>
                    )}
                  </section>
              </div>
            ) : activeTab === 'stats' ? (
              <section className="profile-page-panel profile-page-panel--tab-only">
                  <div className="profile-page-panel__header">
                    <h3>{t('profile.generalStats')}</h3>
                  </div>
                  <div className="profile-page-stats-grid">
                    {[...statsCards, ...extraStatsCards].map((card) => (
                      <article key={`${activeTab}-${card.label}`} className="profile-page-stat-box">
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                      </article>
                    ))}
                  </div>
              </section>
            ) : activeTab === 'activity' ? (
              <section className="profile-page-panel profile-page-panel--tab-only">
                  <div className="profile-page-panel__header">
                    <h3>{t('profile.recentActivity')}</h3>
                  </div>
                  <p className="profile-page-empty-copy">{t('profile.publicActivityEmpty')}</p>
              </section>
            ) : (
              <section className="profile-page-panel profile-page-panel--tab-only">
                  <div className="profile-page-panel__header">
                    <h3>{t('profile.topLanguages')}</h3>
                  </div>
                  {languageCards.length > 0 ? (
                    <div className="profile-page-languages profile-page-languages--row">
                      {languageCards.map((language) => (
                        <article key={`${activeTab}-${language.id}`} className="profile-page-language-chip">
                          <span className="profile-page-language-chip__icon">
                            {renderLanguageIcon(language.icono, language.nombre, t)}
                          </span>
                          <span>{language.nombre}</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-page-empty-copy">{t('profile.languagesEmpty')}</p>
                  )}
              </section>
            )}
          </>
        ) : null}
      </section>
    </MotionPage>
  )

  return standalone ? content : <SidebarLayout>{content}</SidebarLayout>
}

export default UserProfilePage
