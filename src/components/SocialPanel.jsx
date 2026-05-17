import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../context/useLanguage'
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
  t,
  showXp = false,
  showFollowsYou = false,
}) {
  const initial = (user.username?.[0] || 'U').toUpperCase()

  return (
    <article className="social-user-card" role="listitem">
      <div className="social-user-info">
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
      </div>

      <div className="social-card-actions">
        {user.isFollowing ? (
          <button
            type="button"
            className="profile-cancel-btn"
            onClick={() => onUnfollow(user.username)}
            disabled={actionLoading}
          >
            {actionLoading ? '...' : t('social.unfollowAction')}
          </button>
        ) : (
          <button
            type="button"
            className="profile-save-btn"
            onClick={() => onFollow(user.username)}
            disabled={actionLoading}
          >
            {actionLoading ? '...' : t('social.followAction')}
          </button>
        )}
      </div>
    </article>
  )
}

function SocialPanel() {
  const { t } = useLanguage()
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

  return (
    <section className="profile-social-panel">
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
