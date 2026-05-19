import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import LoadingSpinner from '../components/LoadingSpinner'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'
import { getLeaderboard } from '../services/socialApi'
import { notifyError } from '../utils/notify'

function parseScopeParam(value) {
  return value === 'following' ? 'following' : 'global'
}

function RankingPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [scope, setScope] = useState(() => parseScopeParam(searchParams.get('scope')))
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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

  const handleOpenProfile = (entry) => {
    if (!entry?.username) {
      return
    }

    if (Number(entry.id) === Number(user?.id)) {
      navigate('/profile')
      return
    }

    navigate(`/users/${encodeURIComponent(entry.username)}`)
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
                <article
                  key={`${scope}-${entry.id}`}
                  className={`ranking-item${entry.rank <= 3 ? ` ranking-item--top ranking-item--top-${entry.rank}` : ''}`}
                  role="listitem"
                >
                  <button
                    type="button"
                    className="ranking-item-summary"
                    onClick={() => handleOpenProfile(entry)}
                  >
                    <div className="ranking-rank-badge">#{entry.rank}</div>

                    <div className="ranking-item-main">
                      <div className="ranking-item-title-row">
                        <span className="navbar-avatar ranking-inline-avatar" aria-hidden="true">
                          {String(entry.avatar || '🙂')}
                        </span>
                        <div>
                          <h3>{entry.username}</h3>
                        </div>
                      </div>
                    </div>

                    <strong className="ranking-item-xp">
                      {t('ranking.xpLabel', { value: entry.totalXp || 0 })}
                    </strong>
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default RankingPage
