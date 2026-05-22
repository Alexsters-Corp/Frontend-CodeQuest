import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AiOutlineUserAdd, AiOutlineUserSwitch } from 'react-icons/ai'
import { IoMdArrowRoundBack } from 'react-icons/io'
import { LuUserRoundCheck, LuUsersRound } from 'react-icons/lu'
import MotionPage from '../components/MotionPage'
import SidebarLayout from '../components/SidebarLayout'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import {
  followUserByUsername,
  getFollowDirectory,
  getPublicFollowDirectory,
  unfollowUserByUsername,
} from '../services/socialApi'
import { notifyError, notifySuccess } from '../utils/notify'

function ConnectionsUserCard({ item, busy, onFollow, onUnfollow, onOpenProfile, showActions, t }) {
  const initial = (item.username?.[0] || 'U').toUpperCase()
  const isMutualFollow = Boolean(item.isFollowing && item.isFollowingBack)
  const actionLabel = item.isFollowing
    ? (isMutualFollow ? t('social.mutualFollowLabel') : t('social.followingLabel'))
    : t('social.followAction')

  return (
    <article className="social-user-card" role="listitem">
      <button type="button" className="social-user-info social-user-info--button" onClick={() => onOpenProfile(item)}>
        <div className="social-user-avatar">
          {item.avatar ? item.avatar : initial}
        </div>
        <div className="social-user-meta">
          <strong>@{item.username}</strong>
          <p>{item.nombre || t('nav.defaultName')}</p>
        </div>
      </button>

      {showActions ? (
        <div className="social-card-actions">
          {item.isFollowing ? (
            <button type="button" className="profile-cancel-btn social-action-btn" onClick={() => onUnfollow(item.username)} disabled={busy}>
              <span className="social-action-btn__icon" aria-hidden="true">
                {isMutualFollow ? <AiOutlineUserSwitch /> : <LuUserRoundCheck />}
              </span>
              <span>{busy ? '...' : actionLabel}</span>
            </button>
          ) : (
            <button type="button" className="profile-save-btn social-action-btn" onClick={() => onFollow(item.username)} disabled={busy}>
              <span className="social-action-btn__icon" aria-hidden="true">
                <AiOutlineUserAdd />
              </span>
              <span>{busy ? '...' : actionLabel}</span>
            </button>
          )}
        </div>
      ) : null}
    </article>
  )
}

function normalizeTab(rawTab) {
  return rawTab === 'following' ? 'following' : 'followers'
}

function ProfileConnectionsPage() {
  const navigate = useNavigate()
  const { username } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const activeTab = normalizeTab(searchParams.get('tab'))
  const isOwnProfile = !username
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionUsername, setActionUsername] = useState('')
  const [listQuery, setListQuery] = useState('')
  const [directory, setDirectory] = useState({
    user: null,
    counts: { followers: 0, following: 0 },
    following: [],
    followers: [],
  })

  const loadConnections = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const data = isOwnProfile
        ? await getFollowDirectory(24)
        : await getPublicFollowDirectory(username, 24)

      setDirectory({
        user: data.user || null,
        counts: data.counts || { followers: 0, following: 0 },
        following: Array.isArray(data.following) ? data.following : [],
        followers: Array.isArray(data.followers) ? data.followers : [],
      })
    } catch (error) {
      const message = error.message || t('social.loadError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [isOwnProfile, t, username])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  const handleTabChange = (tab) => {
    setSearchParams({ tab })
    setListQuery('')
  }

  const handleFollow = async (targetUsername) => {
    const normalizedUsername = String(targetUsername || '').trim()
    if (!normalizedUsername) {
      return
    }

    setActionUsername(normalizedUsername)
    try {
      await followUserByUsername(normalizedUsername)
      notifySuccess(t('social.followSuccess', { username: normalizedUsername }), { groupKey: 'social-follow' })
      await loadConnections()
    } catch (error) {
      notifyError(error.message || t('social.followError'))
    } finally {
      setActionUsername('')
    }
  }

  const handleUnfollow = async (targetUsername) => {
    const normalizedUsername = String(targetUsername || '').trim()
    if (!normalizedUsername) {
      return
    }

    setActionUsername(normalizedUsername)
    try {
      await unfollowUserByUsername(normalizedUsername)
      notifySuccess(t('social.unfollowSuccess', { username: normalizedUsername }), { groupKey: 'social-follow' })
      await loadConnections()
    } catch (error) {
      notifyError(error.message || t('social.unfollowError'))
    } finally {
      setActionUsername('')
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

  const visibleList = activeTab === 'following' ? directory.following : directory.followers
  const filteredList = useMemo(() => {
    const query = String(listQuery || '').trim().toLowerCase()
    if (!query) {
      return visibleList
    }

    return visibleList.filter((item) => {
      const usernameValue = String(item.username || '').toLowerCase()
      const nameValue = String(item.nombre || '').toLowerCase()
      return usernameValue.includes(query) || nameValue.includes(query)
    })
  }, [listQuery, visibleList])
  const emptyLabel = activeTab === 'following' ? t('social.noFollowing') : t('social.noFollowers')

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
        <section className="profile-page-shell user-profile-page-shell profile-connections-shell">
          <section className="profile-page-panel profile-connections-panel">
            <div className="profile-connections-header">
              <button
                type="button"
                className="profile-page-back profile-connections-back"
                onClick={() => navigate(isOwnProfile ? '/profile' : `/users/${encodeURIComponent(username)}`)}
              >
                <IoMdArrowRoundBack />
                <span>{isOwnProfile ? t('profile.backToProfile') : t('profile.backToPublicProfile')}</span>
              </button>
            </div>

            <div className="ranking-scope-tabs profile-connections-tabs">
              <button
                type="button"
                className={`ranking-tab ${activeTab === 'followers' ? 'ranking-tab--active' : ''}`}
                onClick={() => handleTabChange('followers')}
              >
                <LuUsersRound /> {t('social.followersList')} ({directory.counts.followers || 0})
              </button>
              <button
                type="button"
                className={`ranking-tab ${activeTab === 'following' ? 'ranking-tab--active' : ''}`}
                onClick={() => handleTabChange('following')}
              >
                <AiOutlineUserAdd /> {t('social.followingList')} ({directory.counts.following || 0})
              </button>
            </div>

            <div className="social-active-content profile-connections-content">
              {loading ? (
                <div className="profile-edit-loading-container">
                  <LoadingSpinner size="large" />
                  <p>{t('common.loadingProfile')}</p>
                </div>
              ) : errorMessage ? (
                <div className="profile-edit-actions">
                  <p className="profile-edit-message error">{errorMessage}</p>
                  <button type="button" className="profile-cancel-btn" onClick={loadConnections}>
                    {t('common.retry')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="social-user-list profile-connections-search">
                    <input
                      type="text"
                      value={listQuery}
                      onChange={(event) => setListQuery(event.target.value)}
                      placeholder={t('social.usernamePlaceholder')}
                      className="social-unified-input"
                    />
                  </div>
                  {visibleList.length === 0 ? (
                    <p className="social-empty-text">{emptyLabel}</p>
                  ) : filteredList.length === 0 ? (
                    <p className="social-empty-text">{t('social.noResults')}</p>
                  ) : (
                    <div className="social-user-list profile-connections-list">
                      {filteredList.map((item) => (
                        <ConnectionsUserCard
                          key={`${activeTab}-${item.id}`}
                          item={item}
                          busy={actionUsername === item.username}
                          onFollow={handleFollow}
                          onUnfollow={handleUnfollow}
                          onOpenProfile={handleOpenProfile}
                          showActions={isOwnProfile}
                          t={t}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default ProfileConnectionsPage
