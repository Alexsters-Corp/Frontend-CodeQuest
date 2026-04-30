import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useLanguage } from '../context/useLanguage'
import {
  getFavoritesUpdatedEventName,
  listFavoriteLessons,
  toggleLessonFavorite,
} from '../services/learningApi'
import { notifyError, notifySuccess } from '../utils/notify'

function FavoritesPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [favorites, setFavorites] = useState([])

  const loadFavorites = useCallback(async () => {
    try {
      const items = await listFavoriteLessons()
      setFavorites(Array.isArray(items) ? items : [])
    } catch (error) {
      notifyError(error.message || t('favorites.toggleError'))
      setFavorites([])
    }
  }, [t])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadFavorites()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadFavorites])

  useEffect(() => {
    const eventName = getFavoritesUpdatedEventName()
    const onUpdate = () => {
      loadFavorites()
    }

    window.addEventListener(eventName, onUpdate)
    return () => {
      window.removeEventListener(eventName, onUpdate)
    }
  }, [loadFavorites])

  const handleRemoveFavorite = async (favorite) => {
    try {
      await toggleLessonFavorite({
        lessonId: favorite.lessonId,
        lessonTitle: favorite.lessonTitle,
        lessonDescription: favorite.lessonDescription,
        moduleId: favorite.moduleId,
        moduleName: favorite.moduleName,
        xpReward: favorite.xpReward,
      })

      notifySuccess(t('favorites.removedToast', { lesson: favorite.lessonTitle }))
      await loadFavorites()
    } catch (error) {
      notifyError(error.message || t('favorites.toggleError'))
    }
  }

  return (
    <MotionPage className="dashboard-page" delay={0.06}>
      <Sidebar />
      <Navbar title={t('favorites.title')} hideActions />

      <section className="profile-edit-card favorites-card">
        <div className="favorites-header-row">
          <h2>{t('favorites.title')}</h2>
          <button type="button" className="profile-back-btn" onClick={() => navigate('/dashboard')}>
            {t('favorites.backDashboard')}
          </button>
        </div>

        {favorites.length === 0 ? (
          <div className="favorites-empty">
            <p>{t('favorites.empty')}</p>
            <button type="button" className="profile-cancel-btn" onClick={() => navigate('/modules')}>
              {t('favorites.goModules')}
            </button>
          </div>
        ) : (
          <div className="favorites-list">
            {favorites.map((item) => (
              <article key={item.lessonId} className="favorite-item">
                <div className="favorite-item-main">
                  <h3>{item.lessonTitle || t('lesson.notFound')}</h3>
                  {item.lessonDescription ? <p>{item.lessonDescription}</p> : null}
                  <div className="favorite-item-meta">
                    {item.moduleName ? <span>{item.moduleName}</span> : null}
                    <span>+{Number(item.xpReward || 0)} XP</span>
                  </div>
                </div>
                <div className="favorite-item-actions">
                  <button
                    type="button"
                    className="lesson-go-btn"
                    onClick={() => navigate(`/lesson/${item.lessonId}`)}
                  >
                    {t('favorites.openLesson')}
                  </button>
                  <button
                    type="button"
                    className="profile-cancel-btn"
                    onClick={() => handleRemoveFavorite(item)}
                  >
                    {t('favorites.remove')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </MotionPage>
  )
}

export default FavoritesPage
