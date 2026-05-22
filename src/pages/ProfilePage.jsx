import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiLink, FiShare } from 'react-icons/fi'
import { GoPaperclip } from 'react-icons/go'
import { IoMdArrowRoundBack, IoMdArrowRoundForward } from 'react-icons/io'
import { IoCreateOutline, IoTrophyOutline } from 'react-icons/io5'
import { AiOutlineUsergroupAdd } from 'react-icons/ai'
import { SlLocationPin } from 'react-icons/sl'
import { LuUsersRound } from 'react-icons/lu'
import CountryFlag from '../components/CountryFlag'
import LoadingSpinner from '../components/LoadingSpinner'
import MotionPage from '../components/MotionPage'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { apiFetch } from '../services/api'
import { getDashboardOverview } from '../services/learningApi'
import { getFollowDirectory } from '../services/socialApi'
import { countryNameFromCode, resolveCountryCode } from '../utils/countries'
import { notifyError, notifySuccess } from '../utils/notify'

const PRESET_ICONS = ['🙂', '😎', '🤖', '🚀', '💻', '🎯']

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function renderLanguageIcon(icon, label, t) {
  if (isHttpUrl(icon)) {
    return <img className="profile-page-language-chip__image" src={icon} alt={t('dashboard.languageLogoAlt', { name: label })} loading="lazy" />
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

function formatDayLabel(dateValue, locale) {
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
    weekday: 'short',
    day: 'numeric',
  }).format(date)
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
    bio: '',
    countryCode: '',
    countryRaw: '',
    createdAt: '',
    birthDate: '',
  })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [overview, setOverview] = useState(null)
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 })
  const [activeTab, setActiveTab] = useState('summary')
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const loadProfileData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const [profileRes, overviewData, followData] = await Promise.all([
        apiFetch('/api/users/profile'),
        getDashboardOverview(),
        getFollowDirectory(1),
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
        bio: String(user.bio || ''),
        totalXp,
        currentLevel: Number(user.currentLevel || 1),
        countryCode,
        countryRaw: '',
        createdAt: String(user.createdAt || ''),
        birthDate: String(user.birthDate || ''),
      })
      setOverview(overviewData || null)
      setFollowCounts(followData?.counts || { followers: 0, following: 0 })
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
    { label: t('profile.stats.completedChallenges'), value: String(overview?.completedChallenges || 0) },
    { label: t('profile.stats.solvedExercises'), value: formatProfileMetric(overview?.solvedExercises) },
    { label: t('profile.stats.activeDays'), value: formatProfileMetric(overview?.activeDays) },
    { label: t('profile.stats.bestRanking'), value: formatProfileMetric(overview?.bestRanking, { prefix: '#' }) },
  ]

  const tabs = [
    { id: 'summary', label: t('profile.tabs.summary') },
    { id: 'stats', label: t('profile.tabs.stats') },
    { id: 'activity', label: t('profile.tabs.activity') },
    { id: 'languages', label: t('profile.tabs.languages') },
  ]

  const nextLevelXp = (profile.currentLevel || 1) * 500
  const currentLevelBaseXp = Math.max(0, ((profile.currentLevel || 1) - 1) * 500)
  const currentLevelProgressXp = Math.max(0, (profile.totalXp || 0) - currentLevelBaseXp)
  const xpNeededForNextLevel = Math.max(0, nextLevelXp - (profile.totalXp || 0))
  const levelProgressPercent = Math.min(100, Math.max(0, (currentLevelProgressXp / 500) * 100))
  const streakCount = overview?.racha || 0
  const currentRanking = Number(overview?.currentRanking || 0)
  const rankingLabel = currentRanking > 0 ? `#${currentRanking}` : t('profile.rankUnavailable')
  const streakEmojiClass = [
    'profile-page-hero__mini-metrics-emoji',
    'streak-emoji',
    streakCount > 0 ? 'streak-emoji--active' : 'streak-emoji--inactive',
  ].join(' ')
  const openConnections = (tab) => navigate(`/profile/connections?tab=${tab}`)
  const joinedLabel = useMemo(() => {
    if (!profile.createdAt) {
      return t('profile.joinedFallback')
    }

    const date = new Date(profile.createdAt)
    if (Number.isNaN(date.getTime())) {
      return t('profile.joinedFallback')
    }

    return t('profile.joinedOn', { date: new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
      month: 'long',
      year: 'numeric',
    }).format(date) })
  }, [locale, profile.createdAt, t])
  const publicProfileUrl = useMemo(() => {
    if (!profile.username) {
      return ''
    }

    if (typeof window === 'undefined') {
      return `/u/${encodeURIComponent(profile.username)}`
    }

    return `${window.location.origin}/u/${encodeURIComponent(profile.username)}`
  }, [profile.username])
  const qrCodeUrl = useMemo(() => {
    if (!publicProfileUrl) {
      return ''
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&format=svg&margin=0&qzone=2&ecc=H&data=${encodeURIComponent(publicProfileUrl)}`
  }, [publicProfileUrl])
  const languageCards = overview?.languages || []
  const recentXpEntries = overview?.recentXP || []
  const extraStatsCards = [
    { label: t('dashboard.totalXp'), value: `${formatCompactNumber(profile.totalXp || 0)} XP` },
    { label: t('dashboard.level'), value: formatCompactNumber(profile.currentLevel || 1) },
    { label: t('dashboard.streak'), value: t('dashboard.days', { count: streakCount }) },
    { label: t('profile.currentPosition'), value: rankingLabel },
  ]

  const handleCopyProfileLink = useCallback(async () => {
    if (!publicProfileUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(publicProfileUrl)
      notifySuccess(t('profile.shareCopySuccess'))
    } catch {
      notifyError(t('profile.shareCopyError'))
    }
  }, [publicProfileUrl, t])

  const handleShareProfile = useCallback(async () => {
    if (!publicProfileUrl) {
      return
    }

    const sharePayload = {
      title: t('profile.shareTitle', { username: profile.username || t('profile.notSet') }),
      text: t('profile.shareDescription', { username: profile.username || t('profile.notSet') }),
      url: publicProfileUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(sharePayload)
        return
      }

      await navigator.clipboard.writeText(publicProfileUrl)
      notifySuccess(t('profile.shareCopySuccess'))
    } catch (error) {
      if (error?.name !== 'AbortError') {
        notifyError(t('profile.shareError'))
      }
    }
  }, [profile.username, publicProfileUrl, t])

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
        <section className="profile-page-shell user-profile-page-shell">
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
                  </div>

                  <div className="profile-page-hero__copy">
                    <div className="profile-page-hero__headline">
                      <h1>{profile.username || t('profile.notSet')}</h1>
                      <div className="profile-page-hero__mini-metrics">
                        <span>
                          <span className={streakEmojiClass}>🔥</span>
                          {t('dashboard.days', { count: streakCount })}
                        </span>
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
                      <button type="button" className="profile-page-hero__meta-button" onClick={() => openConnections('followers')}>
                        <span className="profile-page-hero__meta-item"><LuUsersRound /> {t('social.followersCount', { count: followCounts.followers || 0 })}</span>
                      </button>
                      <button type="button" className="profile-page-hero__meta-button" onClick={() => openConnections('following')}>
                        <span className="profile-page-hero__meta-item"><AiOutlineUsergroupAdd /> {t('social.followingCount', { count: followCounts.following || 0 })}</span>
                      </button>
                    </div>
                    <div className="profile-page-hero__actions">
                      <button type="button" className="profile-follow-btn profile-follow-btn--edit" onClick={() => navigate('/profile/edit')}>
                        <span className="profile-follow-btn__icon" aria-hidden="true">
                          <IoCreateOutline />
                        </span>
                        <span>{t('profile.editButton')}</span>
                      </button>
                      <button
                        type="button"
                        className="profile-follow-btn profile-follow-btn--share"
                        onClick={() => setShareModalOpen(true)}
                        disabled={!profile.username}
                      >
                        <span className="profile-follow-btn__icon" aria-hidden="true">
                          <FiShare />
                        </span>
                        <span>{t('profile.shareButton')}</span>
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
                    {recentXpEntries.length > 0 ? (
                      <div className="profile-page-activity-list">
                        {recentXpEntries.map((entry) => (
                          <article key={entry.dia} className="profile-page-activity-item">
                            <span>{formatDayLabel(entry.dia, locale)}</span>
                            <strong>{formatCompactNumber(entry.xp)} XP</strong>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="profile-page-empty-copy">{t('profile.activityEmpty')}</p>
                    )}
                  </section>

                  <section className="profile-page-panel">
                    <div className="profile-page-panel__header">
                      <h3>{t('profile.topLanguages')}</h3>
                    </div>
                    {languageCards.length > 0 ? (
                      <div className="profile-page-languages profile-page-languages--row">
                        {languageCards.map((language) => (
                          <article key={language.lenguaje_id} className="profile-page-language-chip">
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
                  {recentXpEntries.length > 0 ? (
                    <div className="profile-page-activity-list">
                      {recentXpEntries.map((entry) => (
                        <article key={`${activeTab}-${entry.dia}`} className="profile-page-activity-item">
                          <span>{formatDayLabel(entry.dia, locale)}</span>
                          <strong>{formatCompactNumber(entry.xp)} XP</strong>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-page-empty-copy">{t('profile.activityEmpty')}</p>
                  )}
                </section>
              ) : (
                <section className="profile-page-panel profile-page-panel--tab-only">
                  <div className="profile-page-panel__header">
                    <h3>{t('profile.topLanguages')}</h3>
                  </div>
                  {languageCards.length > 0 ? (
                    <div className="profile-page-languages profile-page-languages--row">
                      {languageCards.map((language) => (
                        <article key={`${activeTab}-${language.lenguaje_id}`} className="profile-page-language-chip">
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
          )}
        </section>
        {shareModalOpen ? (
          <div
            className="language-delete-overlay profile-share-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('profile.shareModalTitle')}
            onClick={() => setShareModalOpen(false)}
          >
            <div className="profile-share-modal__panel" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="profile-share-modal__close"
                onClick={() => setShareModalOpen(false)}
                aria-label={t('profile.shareClose')}
              >
                ×
              </button>
              <div className="profile-share-modal__header">
                <p>{t('profile.shareLabel')}</p>
                <h3>@{profile.username || t('profile.notSet')}</h3>
              </div>
              <div className="profile-share-modal__qr-shell">
                <div className="profile-share-modal__qr-frame">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt={t('profile.shareQrAlt', { username: profile.username || t('profile.notSet') })} />
                  ) : null}
                  <div className="profile-share-modal__qr-signature" aria-hidden="true">
                    <span className="profile-share-modal__qr-signature-left">{'<'}</span>
                    <span className="profile-share-modal__qr-signature-slash">{'/'}</span>
                    <span className="profile-share-modal__qr-signature-right">{'>'}</span>
                  </div>
                </div>
              </div>
              <div className="profile-share-modal__actions">
                <button type="button" className="profile-follow-btn profile-follow-btn--share" onClick={handleShareProfile}>
                  <span className="profile-follow-btn__icon" aria-hidden="true">
                    <FiShare />
                  </span>
                  <span>{t('profile.shareAction')}</span>
                </button>
                <button type="button" className="profile-follow-btn profile-follow-btn--link" onClick={handleCopyProfileLink}>
                  <span className="profile-follow-btn__icon" aria-hidden="true">
                    <FiLink />
                  </span>
                  <span>{t('profile.copyLinkAction')}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </MotionPage>
    </SidebarLayout>
  )
}

export default ProfilePage
