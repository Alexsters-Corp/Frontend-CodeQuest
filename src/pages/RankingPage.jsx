import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import LoadingSpinner from '../components/LoadingSpinner'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { followUserByUsername, getLeaderboard, unfollowUserByUsername } from '../services/socialApi'
import { countryNameFromCode } from '../utils/countries'
import { notifyError, notifySuccess } from '../utils/notify'

function parseScopeParam(value) {
  return value === 'following' ? 'following' : 'global'
}

function parseTimeframeParam(value) {
  return value === 'weekly' ? 'weekly' : 'all_time'
}

function RankingPage() {
  const { t, language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const [searchParams, setSearchParams] = useSearchParams()
  const [scope, setScope] = useState(() => parseScopeParam(searchParams.get('scope')))
  const [timeframe, setTimeframe] = useState(() => parseTimeframeParam(searchParams.get('timeframe')))
  const [entries, setEntries] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [pendingUsername, setPendingUsername] = useState('')

  const LIMIT = 25

  useEffect(() => {
    const parsedScope = parseScopeParam(searchParams.get('scope'))
    const parsedTimeframe = parseTimeframeParam(searchParams.get('timeframe'))
    setScope((current) => (current === parsedScope ? current : parsedScope))
    setTimeframe((current) => (current === parsedTimeframe ? current : parsedTimeframe))
  }, [searchParams])

  const handleScopeChange = (nextScope) => {
    const resolvedScope = parseScopeParam(nextScope)
    setScope(resolvedScope)
    setOffset(0)
    setEntries([])

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('scope', resolvedScope)
    setSearchParams(nextParams, { replace: true })
  }

  const handleTimeframeChange = (nextTimeframe) => {
    const resolvedTimeframe = parseTimeframeParam(nextTimeframe)
    setTimeframe(resolvedTimeframe)
    setOffset(0)
    setEntries([])

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('timeframe', resolvedTimeframe)
    setSearchParams(nextParams, { replace: true })
  }

  const loadLeaderboard = useCallback(async (isInitial = true) => {
    if (isInitial) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setErrorMessage('')

    const currentOffset = isInitial ? 0 : offset

    try {
      const data = await getLeaderboard(scope, timeframe, LIMIT, currentOffset)
      const newEntries = Array.isArray(data.entries) ? data.entries : []
      
      if (isInitial) {
        setEntries(newEntries)
        setMe(data.me)
      } else {
        setEntries((prev) => [...prev, ...newEntries])
      }

      setHasMore(newEntries.length === LIMIT)
      if (newEntries.length === LIMIT) {
        setOffset(currentOffset + LIMIT)
      }
    } catch (error) {
      const message = error.message || t('ranking.loadError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [scope, timeframe, offset, t])

  useEffect(() => {
    loadLeaderboard(true)
  }, [scope, timeframe])

  const handleToggleFollow = async (entry) => {
    const username = String(entry.username || '').trim()
    if (!username) {
      return
    }

    setPendingUsername(username)
    try {
      if (entry.isFollowing) {
        await unfollowUserByUsername(username)
        notifySuccess(t('social.unfollowSuccess', { username }), { groupKey: 'social-follow' })
      } else {
        await followUserByUsername(username)
        notifySuccess(t('social.followSuccess', { username }), { groupKey: 'social-follow' })
      }

      // Re-load current view to update isFollowing state across entries
      // Optimization: we could update local state instead of re-fetching everything
      const data = await getLeaderboard(scope, timeframe, entries.length, 0)
      setEntries(Array.isArray(data.entries) ? data.entries : [])
    } catch (error) {
      notifyError(error.message || t('ranking.actionError'))
    } finally {
      setPendingUsername('')
    }
  }

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar title={t('ranking.title')} hideActions />

      <section className="profile-edit-card ranking-card">
        <div className="ranking-header-row">
          <div className="profile-edit-header">
            <h2>{t('ranking.subtitle')}</h2>
            <p>{t('ranking.description')}</p>
          </div>
        </div>

        <div className="ranking-filters-container">
          <div className="ranking-scope-tabs" role="tablist" aria-label={t('ranking.scopeLabel')}>
            <button
              type="button"
              className={`ranking-tab ${scope === 'global' ? 'ranking-tab--active' : ''}`}
              onClick={() => handleScopeChange('global')}
            >
              {t('ranking.globalTab')}
            </button>
            <button
              type="button"
              className={`ranking-tab ${scope === 'following' ? 'ranking-tab--active' : ''}`}
              onClick={() => handleScopeChange('following')}
            >
              {t('ranking.followingTab')}
            </button>
          </div>

          <div className="ranking-scope-tabs ranking-timeframe-tabs" role="tablist" aria-label={t('ranking.timeframeLabel')}>
            <button
              type="button"
              className={`ranking-tab ${timeframe === 'all_time' ? 'ranking-tab--active' : ''}`}
              onClick={() => handleTimeframeChange('all_time')}
            >
              {t('ranking.allTimeTab')}
            </button>
            <button
              type="button"
              className={`ranking-tab ${timeframe === 'weekly' ? 'ranking-tab--active' : ''}`}
              onClick={() => handleTimeframeChange('weekly')}
            >
              {t('ranking.weeklyTab')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-loading-container">
            <LoadingSpinner size="large" />
            <p className="loading-text">{t('common.loading')}</p>
          </div>
        ) : errorMessage ? (
          <div className="profile-edit-actions">
            <p className="profile-edit-message error">{errorMessage}</p>
            <button type="button" className="profile-cancel-btn" onClick={() => loadLeaderboard(true)}>
              {t('common.retry')}
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="ranking-empty-state">
            <p>{scope === 'following' ? t('ranking.emptyFollowing') : t('ranking.emptyGlobal')}</p>
          </div>
        ) : (
          <>
            <div className="ranking-list" role="list">
              {entries.map((entry) => (
                <article key={`${scope}-${timeframe}-${entry.id}`} className="ranking-item" role="listitem">
                  <div className="ranking-rank-badge">#{entry.rank}</div>

                  <div className="ranking-item-main">
                    <div className="ranking-item-title-row">
                      <span className="navbar-avatar ranking-inline-avatar" aria-hidden="true">
                        {String(entry.avatar || '🙂')}
                      </span>
                      <div>
                        <h3>@{entry.username}</h3>
                        <p>{entry.nombre || t('nav.defaultName')}</p>
                      </div>
                    </div>

                    <div className="ranking-item-meta">
                      <span>{t('ranking.xpLabel', { value: entry.totalXp || 0 })}</span>
                      <span>{t('ranking.levelLabel', { value: entry.currentLevel || 1 })}</span>
                      <span>{countryNameFromCode(entry.countryCode, locale, t('profile.notSet'))}</span>
                    </div>
                  </div>

                  {scope === 'global' ? (
                    <button
                      type="button"
                      className={entry.isFollowing ? 'profile-cancel-btn' : 'profile-save-btn'}
                      onClick={() => handleToggleFollow(entry)}
                      disabled={pendingUsername === entry.username}
                    >
                      {pendingUsername === entry.username
                        ? t('common.loading')
                        : entry.isFollowing
                          ? t('social.unfollowAction')
                          : t('social.followAction')}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>

            {hasMore && (
              <div className="ranking-load-more">
                <button 
                  type="button" 
                  className="profile-save-btn" 
                  onClick={() => loadLeaderboard(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? t('common.loading') : t('ranking.loadMore')}
                </button>
              </div>
            )}
          </>
        )}

        {me && (
          <div className="ranking-my-anchor">
            <div className="ranking-item">
              <div className="ranking-rank-badge">#{me.rank}</div>
              <div className="ranking-item-main">
                <div className="ranking-item-title-row">
                  <strong>{t('ranking.myPosition')}</strong>
                </div>
                <div className="ranking-item-meta">
                  <span>{t('ranking.xpLabel', { value: me.totalXp || 0 })}</span>
                  <span>{t('ranking.levelLabel', { value: me.currentLevel || 1 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default RankingPage