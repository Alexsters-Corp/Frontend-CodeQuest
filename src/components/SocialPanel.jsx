import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../context/useLanguage'
import {
  followUserByUsername,
  getFollowDirectory,
  searchUsersByUsername,
  unfollowUserByUsername,
} from '../services/socialApi'
import { notifyError, notifySuccess } from '../utils/notify'

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
      const data = await getFollowDirectory(12)
      setSocialState({
        counts: data.counts || { followers: 0, following: 0 },
        following: Array.isArray(data.following) ? data.following : [],
        followers: Array.isArray(data.followers) ? data.followers : [],
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
        // silent — auto-search no muestra popups de error
      } finally {
        setSocialLoading(false)
      }
    }, 400) // 400ms debounce

    return () => clearTimeout(timer)
  }, [socialQuery])

  const handleFollow = async (username) => {
    const normalizedUsername = String(username || '').trim()
    if (!normalizedUsername) return

    setSocialActionUsername(normalizedUsername)
    try {
      await followUserByUsername(normalizedUsername)
      notifySuccess(t('social.followSuccess', { username: normalizedUsername }))
      await loadSocialDirectory()

      // Refresh search results if we are on the search tab
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
      notifySuccess(t('social.unfollowSuccess', { username: normalizedUsername }))
      await loadSocialDirectory()
      
      // Update search results state locally
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
      <div className="profile-edit-header" style={{ marginBottom: '20px', borderBottom: '1px solid var(--cq-border)', paddingBottom: '12px' }}>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--cq-muted)' }}>{t('social.description')}</p>
      </div>

      <div className="ranking-scope-tabs" style={{ marginTop: '20px' }}>
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

      <div className="social-search-row" style={{ gridTemplateColumns: '1fr' }}>
        <input
          type="text"
          value={socialQuery}
          onChange={(event) => {
            setSocialQuery(event.target.value)
            if (activeTab !== 'search') setActiveTab('search')
          }}
          placeholder={t('social.usernamePlaceholder')}
          aria-label={t('social.usernameLabel')}
          className="social-unified-input"
        />
        {socialLoading && <span className="social-search-spinner">🔍 {t('common.loading')}</span>}
      </div>

      <div className="social-active-content">
        {activeTab === 'search' && (
          <section className="social-list-card">
            {socialResults.length === 0 ? (
              <p className="social-empty-text">
                {socialQuery.trim() ? t('social.noResults') : t('social.searchHint')}
              </p>
            ) : (
              <div className="social-user-list" role="list">
                {socialResults.map((item) => (
                  <article key={`search-${item.id}`} className="social-user-card" role="listitem">
                    <div className="social-user-info">
                      <div className="social-user-avatar">
                        {(item.username?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="social-user-meta">
                        <strong>@{item.username}</strong>
                        <p>{item.nombre || t('profile.notSet')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={item.isFollowing ? 'profile-cancel-btn' : 'profile-save-btn'}
                      onClick={() => (
                        item.isFollowing
                          ? handleUnfollow(item.username)
                          : handleFollow(item.username)
                      )}
                      disabled={socialActionUsername === item.username}
                    >
                      {socialActionUsername === item.username
                        ? '...'
                        : item.isFollowing
                          ? t('social.unfollowAction')
                          : t('social.followAction')}
                    </button>
                  </article>
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
              <div className="social-user-list" role="list">
                {socialState.following.map((item) => (
                  <article key={`following-${item.id}`} className="social-user-card" role="listitem">
                    <div className="social-user-info">
                      <div className="social-user-avatar">
                        {(item.username?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="social-user-meta">
                        <strong>@{item.username}</strong>
                        <p>{t('ranking.xpLabel', { value: item.totalXp || 0 })}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="profile-cancel-btn"
                      onClick={() => handleUnfollow(item.username)}
                      disabled={socialActionUsername === item.username}
                    >
                      {socialActionUsername === item.username ? '...' : t('social.unfollowAction')}
                    </button>
                  </article>
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
              <div className="social-user-list" role="list">
                {socialState.followers.map((item) => (
                  <article key={`followers-${item.id}`} className="social-user-card" role="listitem">
                    <div className="social-user-info">
                      <div className="social-user-avatar">
                        {(item.username?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="social-user-meta">
                        <strong>@{item.username}</strong>
                        <p>{item.isFollowingBack ? t('social.followingBack') : t('social.notFollowingBack')}</p>
                      </div>
                    </div>
                    {!item.isFollowingBack && (
                      <button
                        type="button"
                        className="profile-save-btn"
                        onClick={() => handleFollow(item.username)}
                        disabled={socialActionUsername === item.username}
                      >
                        {socialActionUsername === item.username ? '...' : t('social.followAction')}
                      </button>
                    )}
                  </article>
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
