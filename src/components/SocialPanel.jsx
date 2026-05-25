import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiOutlineUserAdd, AiOutlineUserSwitch } from 'react-icons/ai'
import { LuUserRoundCheck } from 'react-icons/lu'
import { useLanguage } from '../context/useLanguage'
import { useAuth } from '../context/useAuth'
import {
  followUserByUsername,
  getFollowDirectory,
  searchUsersByUsername,
  unfollowUserByUsername,
} from '../services/socialApi'
import { notifyError, notifySuccess } from '../utils/notify'

function UserCard({
  user,
  actionLoading,
  onFollow,
  onUnfollow,
  onOpenProfile,
  t,
  showXp = false,
  showFollowsYou = false,
}) {
  const initial = (user.username?.[0] || 'U').toUpperCase()
  const isMutualFollow = Boolean(user.isFollowing && user.isFollowingBack)
  const actionLabel = user.isFollowing
    ? (isMutualFollow ? t('social.mutualFollowLabel') : t('social.followingLabel'))
    : t('social.followAction')

  return (
    <article className="social-user-card" role="listitem">
      <button type="button" className="social-user-info social-user-info--button" onClick={() => onOpenProfile(user)}>
        <div className="social-user-avatar">
          {user.avatar ? user.avatar : initial}
        </div>
        <div className="social-user-meta">
          <strong>@{user.username}</strong>
          <p>{user.nombre || t('nav.defaultName')}</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
            {showXp && user.totalXp !== undefined && (
              <span style={{ fontSize: '0.75rem', color: 'var(--cq-secondary)', fontWeight: 'bold' }}>
                ✨ {t('ranking.xpLabel', { value: user.totalXp })}
              </span>
            )}
            {showFollowsYou && user.isFollower && (
              <span className="social-follow-badge">
                {t('social.followingBack')}
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="social-card-actions">
        {user.isFollowing ? (
          <button
            type="button"
            className="profile-cancel-btn social-action-btn"
            onClick={() => onUnfollow(user.username)}
            disabled={actionLoading}
          >
            <span className="social-action-btn__icon" aria-hidden="true">
              {isMutualFollow ? <AiOutlineUserSwitch /> : <LuUserRoundCheck />}
            </span>
            <span>{actionLoading ? '...' : actionLabel}</span>
          </button>
        ) : (
          <button
            type="button"
            className="profile-save-btn social-action-btn"
            onClick={() => onFollow(user.username)}
            disabled={actionLoading}
          >
            <span className="social-action-btn__icon" aria-hidden="true">
              <AiOutlineUserAdd />
            </span>
            <span>{actionLoading ? '...' : actionLabel}</span>
          </button>
        )}
      </div>
    </article>
  )
}

function SocialPanel() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [socialQuery, setSocialQuery] = useState('')
  const [socialLoading, setSocialLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('search') // 'search', 'following', 'followers'
  const [socialActionUsername, setSocialActionUsername] = useState('')
  const [socialResults, setSocialResults] = useState([])
  const [socialState, setSocialState] = useState({
    counts: { followers: 0, following: 0 },
    following: [],
    followers: [],
  })

  const loadSocialDirectory = useCallback(async () => {
    try {
      const data = await getFollowDirectory(24)
      setSocialState({
        counts: data.counts || { followers: 0, following: 0 },
        following: (Array.isArray(data.following) ? data.following : []).map(u => ({ ...u, isFollowing: true })),
        followers: (Array.isArray(data.followers) ? data.followers : []).map(u => ({ ...u, isFollower: true, isFollowing: u.isFollowingBack })),
      })
    } catch (error) {
      notifyError(error.message || t('social.loadError'))
    }
  }, [t])

  useEffect(() => {
    loadSocialDirectory()
  }, [loadSocialDirectory])

  // Automatic search effect
  useEffect(() => {
    const query = String(socialQuery || '').trim()
    if (!query) {
      setSocialResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSocialLoading(true)
      try {
        const users = await searchUsersByUsername(query, 10)
        setSocialResults(users)
      } catch {
        // silent
      } finally {
        setSocialLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [socialQuery])

  const handleFollow = async (username) => {
    const normalizedUsername = String(username || '').trim()
    if (!normalizedUsername) return

    setSocialActionUsername(normalizedUsername)
    try {
      await followUserByUsername(normalizedUsername)
      notifySuccess(t('social.followSuccess', { username: normalizedUsername }), { groupKey: 'social-follow' })
      await loadSocialDirectory()

      if (socialQuery.trim()) {
        const users = await searchUsersByUsername(socialQuery, 10)
        setSocialResults(users)
      }
    } catch (error) {
      notifyError(error.message || t('social.followError'))
    } finally {
      setSocialActionUsername('')
    }
  }

  const handleUnfollow = async (username) => {
    const normalizedUsername = String(username || '').trim()
    if (!normalizedUsername) return

    setSocialActionUsername(normalizedUsername)
    try {
      await unfollowUserByUsername(normalizedUsername)
      notifySuccess(t('social.unfollowSuccess', { username: normalizedUsername }), { groupKey: 'social-follow' })
      await loadSocialDirectory()
      
      setSocialResults((current) => current.map((item) => (
        item.username === normalizedUsername
          ? { ...item, isFollowing: false }
          : item
      )))
    } catch (error) {
      notifyError(error.message || t('social.unfollowError'))
    } finally {
      setSocialActionUsername('')
    }
  }

  const handleOpenProfile = (targetUser) => {
    if (!targetUser?.username) {
      return
    }

    if (Number(targetUser.id) === Number(user?.id)) {
      navigate('/profile')
      return
    }

    navigate(`/users/${encodeURIComponent(targetUser.username)}`)
  }

  return (
    <section>
      <div className="profile-edit-header" style={{ marginBottom: '24px' }}>
        <p>{t('social.description')}</p>
      </div>

      <div className="ranking-scope-tabs">
        <button
          type="button"
          className={`ranking-tab ${activeTab === 'search' ? 'ranking-tab--active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          {t('social.searchResults')}
        </button>
        <button
          type="button"
          className={`ranking-tab ${activeTab === 'following' ? 'ranking-tab--active' : ''}`}
          onClick={() => setActiveTab('following')}
        >
          {t('social.followingList')} ({socialState.counts.following})
        </button>
        <button
          type="button"
          className={`ranking-tab ${activeTab === 'followers' ? 'ranking-tab--active' : ''}`}
          onClick={() => setActiveTab('followers')}
        >
          {t('social.followersList')} ({socialState.counts.followers})
        </button>
      </div>

      <div className="social-search-row" style={{ marginTop: '20px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            value={socialQuery}
            onChange={(event) => {
              setSocialQuery(event.target.value)
              if (activeTab !== 'search') setActiveTab('search')
            }}
            placeholder={t('social.usernamePlaceholder')}
            className="social-unified-input"
          />
          {socialLoading && (
            <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
              ⏳
            </div>
          )}
        </div>
      </div>

      <div className="social-active-content">
        {activeTab === 'search' && (
          <section className="social-list-card">
            {socialResults.length === 0 ? (
              <p className="social-empty-text">
                {socialQuery.trim() ? t('social.noResults') : t('social.searchHint')}
              </p>
            ) : (
              <div className="social-user-list">
                {socialResults.map((item) => (
                  <UserCard
                    key={`search-${item.id}`}
                    user={item}
                    actionLoading={socialActionUsername === item.username}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                    onOpenProfile={handleOpenProfile}
                    t={t}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'following' && (
          <section className="social-list-card">
            {socialState.following.length === 0 ? (
              <p className="social-empty-text">{t('social.noFollowing')}</p>
            ) : (
              <div className="social-user-list">
                {socialState.following.map((item) => (
                  <UserCard
                    key={`following-${item.id}`}
                    user={item}
                    actionLoading={socialActionUsername === item.username}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                    onOpenProfile={handleOpenProfile}
                    t={t}
                    showXp
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'followers' && (
          <section className="social-list-card">
            {socialState.followers.length === 0 ? (
              <p className="social-empty-text">{t('social.noFollowers')}</p>
            ) : (
              <div className="social-user-list">
                {socialState.followers.map((item) => (
                  <UserCard
                    key={`followers-${item.id}`}
                    user={item}
                    actionLoading={socialActionUsername === item.username}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                    onOpenProfile={handleOpenProfile}
                    t={t}
                    showFollowsYou
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  )
}

export default SocialPanel
