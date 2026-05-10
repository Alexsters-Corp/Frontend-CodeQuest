import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import LoadingSpinner from '../components/LoadingSpinner'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useLanguage } from '../context/useLanguage'
import { followUserByUsername, getLeaderboard, unfollowUserByUsername } from '../services/socialApi'
import { countryNameFromCode } from '../utils/countries'
import { notifyError, notifySuccess } from '../utils/notify'

function parseScopeParam(value) {
  return value === 'following' ? 'following' : 'global'
}

function RankingPage() {
  const { t, language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const [searchParams, setSearchParams] = useSearchParams()
  const [scope, setScope] = useState(() => parseScopeParam(searchParams.get('scope')))
  const [entries, setEntries] = useState([])
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [pendingUsername, setPendingUsername] = useState('')

  useEffect(() => {
    const parsedScope = parseScopeParam(searchParams.get('scope'))
    setScope((currentScope) => (currentScope === parsedScope ? currentScope : parsedScope))
  }, [searchParams])

  const handleScopeChange = (nextScope) => {
    const resolvedScope = parseScopeParam(nextScope)
    setScope(resolvedScope)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('scope', resolvedScope)
    setSearchParams(nextParams, { replace: true })
  }

  const loadLeaderboard = useCallback(async (currentScope = scope) => {
    setLoading(true)
    setErrorMessage('')

    try {
      const data = await getLeaderboard(currentScope)
      setEntries(Array.isArray(data.entries) ? data.entries : [])
      setCounts(data.counts || { followers: 0, following: 0 })
    } catch (error) {
      const message = error.message || t('ranking.loadError')
      setErrorMessage(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [scope, t])

  useEffect(() => {
    loadLeaderboard(scope)
  }, [scope, loadLeaderboard])

  const handleToggleFollow = async (entry) => {
    const username = String(entry.username || '').trim()
    if (!username) {
      return
    }

    setPendingUsername(username)
    try {
      if (entry.isFollowing) {
        await unfollowUserByUsername(username)
        notifySuccess(t('social.unfollowSuccess', { username }))
      } else {
        await followUserByUsername(username)
        notifySuccess(t('social.followSuccess', { username }))
      }

      await loadLeaderboard(scope)
    } catch (error) {
      notifyError(error.message || t('ranking.actionError'))
    } finally {
      setPendingUsername('')
    }
  }

  return (
    <MotionPage className="dashboard-page" delay={0.06}>
      <Sidebar />
      <Navbar title={t('ranking.title')} hideActions />

      <section className="profile-edit-card ranking-card">
        <div className="ranking-header-row">
          <div className="profile-edit-header">
            <h2>{t('ranking.subtitle')}</h2>
            <p>{t('ranking.description')}</p>
          </div>

          <div className="ranking-chip-group">
            <span className="ranking-chip">{t('social.followingCount', { count: counts.following || 0 })}</span>
            <span className="ranking-chip">{t('social.followersCount', { count: counts.followers || 0 })}</span>
          </div>
        </div>

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

        {loading ? (
          <div className="dashboard-loading-container">
            <LoadingSpinner size="large" />
            <p className="loading-text">{t('common.loading')}</p>
          </div>
        ) : errorMessage ? (
          <div className="profile-edit-actions">
            <p className="profile-edit-message error">{errorMessage}</p>
            <button type="button" className="profile-cancel-btn" onClick={() => loadLeaderboard(scope)}>
              {t('common.retry')}
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="ranking-empty-state">
            <p>{scope === 'following' ? t('ranking.emptyFollowing') : t('ranking.emptyGlobal')}</p>
          </div>
        ) : (
          <div className="ranking-list" role="list">
            {entries.map((entry) => (
              <article key={`${scope}-${entry.id}`} className="ranking-item" role="listitem">
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
        )}
      </section>
    </MotionPage>
  )
}

export default RankingPage