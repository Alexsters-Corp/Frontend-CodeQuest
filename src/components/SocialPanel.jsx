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
  const [socialActionUsername, setSocialActionUsername] = useState('')
  const [socialResults, setSocialResults] = useState([])
  const [socialState, setSocialState] = useState({
    counts: { followers: 0, following: 0 },
    following: [],
    followers: [],
  })

  const loadSocialDirectory = useCallback(async () => {
    try {
      const data = await getFollowDirectory(8)
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

  const handleSearchUsers = async () => {
    const query = String(socialQuery || '').trim()
    if (!query) {
      notifyError(t('social.usernameRequired'))
      return
    }

    setSocialLoading(true)
    try {
      const users = await searchUsersByUsername(query, 6)
      setSocialResults(users)

      if (users.length === 0) {
        notifyError(t('social.noResults'))
      }
    } catch (error) {
      notifyError(error.message || t('social.searchError'))
    } finally {
      setSocialLoading(false)
    }
  }

  const handleFollow = async (username = socialQuery) => {
    const normalizedUsername = String(username || '').trim()
    if (!normalizedUsername) {
      notifyError(t('social.usernameRequired'))
      return
    }

    setSocialActionUsername(normalizedUsername)
    try {
      await followUserByUsername(normalizedUsername)
      notifySuccess(t('social.followSuccess', { username: normalizedUsername }))
      await loadSocialDirectory()

      if (String(socialQuery || '').trim()) {
        const users = await searchUsersByUsername(socialQuery, 6)
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
    if (!normalizedUsername) {
      return
    }

    setSocialActionUsername(normalizedUsername)
    try {
      await unfollowUserByUsername(normalizedUsername)
      notifySuccess(t('social.unfollowSuccess', { username: normalizedUsername }))
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
      <div className="profile-edit-header">
        <h2>{t('social.title')}</h2>
        <p>{t('social.description')}</p>
      </div>

      <div className="social-summary-grid">
        <article className="stat-card">
          <p>{t('social.followingLabel')}</p>
          <strong>{Number(socialState.counts.following || 0)}</strong>
        </article>
        <article className="stat-card">
          <p>{t('social.followersLabel')}</p>
          <strong>{Number(socialState.counts.followers || 0)}</strong>
        </article>
      </div>

      <div className="social-search-row">
        <input
          type="text"
          value={socialQuery}
          onChange={(event) => setSocialQuery(event.target.value)}
          placeholder={t('social.usernamePlaceholder')}
          aria-label={t('social.usernameLabel')}
        />
        <button
          type="button"
          className="profile-cancel-btn"
          onClick={handleSearchUsers}
          disabled={socialLoading}
        >
          {socialLoading ? t('common.loading') : t('social.searchAction')}
        </button>
        <button
          type="button"
          className="profile-save-btn"
          onClick={() => handleFollow(socialQuery)}
          disabled={socialActionUsername === socialQuery.trim()}
        >
          {socialActionUsername === socialQuery.trim()
            ? t('common.loading')
            : t('social.followAction')}
        </button>
      </div>

      <div className="social-columns">
        <section className="social-list-card">
          <h3>{t('social.searchResults')}</h3>
          {socialResults.length === 0 ? (
            <p className="social-empty-text">{t('social.searchHint')}</p>
          ) : (
            <div className="social-user-list" role="list">
              {socialResults.map((item) => (
                <article key={`search-${item.id}`} className="social-user-card" role="listitem">
                  <div>
                    <strong>@{item.username}</strong>
                    <p>{item.nombre || t('profile.notSet')}</p>
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
                      ? t('common.loading')
                      : item.isFollowing
                        ? t('social.unfollowAction')
                        : t('social.followAction')}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="social-list-card">
          <h3>{t('social.followingList')}</h3>
          {socialState.following.length === 0 ? (
            <p className="social-empty-text">{t('social.noFollowing')}</p>
          ) : (
            <div className="social-user-list" role="list">
              {socialState.following.map((item) => (
                <article key={`following-${item.id}`} className="social-user-card" role="listitem">
                  <div>
                    <strong>@{item.username}</strong>
                    <p>{t('ranking.xpLabel', { value: item.totalXp || 0 })}</p>
                  </div>
                  <button
                    type="button"
                    className="profile-cancel-btn"
                    onClick={() => handleUnfollow(item.username)}
                    disabled={socialActionUsername === item.username}
                  >
                    {socialActionUsername === item.username
                      ? t('common.loading')
                      : t('social.unfollowAction')}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="social-list-card">
          <h3>{t('social.followersList')}</h3>
          {socialState.followers.length === 0 ? (
            <p className="social-empty-text">{t('social.noFollowers')}</p>
          ) : (
            <div className="social-user-list" role="list">
              {socialState.followers.map((item) => (
                <article key={`followers-${item.id}`} className="social-user-card" role="listitem">
                  <div>
                    <strong>@{item.username}</strong>
                    <p>{item.isFollowingBack ? t('social.followingBack') : t('social.notFollowingBack')}</p>
                  </div>
                  {!item.isFollowingBack ? (
                    <button
                      type="button"
                      className="profile-save-btn"
                      onClick={() => handleFollow(item.username)}
                      disabled={socialActionUsername === item.username}
                    >
                      {socialActionUsername === item.username
                        ? t('common.loading')
                        : t('social.followAction')}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default SocialPanel
