import MotionPage from '../components/MotionPage'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SocialPanel from '../components/SocialPanel'
import { useLanguage } from '../context/useLanguage'

function SocialPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar title={t('social.title')} />

      <section className="profile-edit-card">
        <div className="profile-header-row">
          <div className="profile-edit-header">
            <h2>{t('social.title')}</h2>
          </div>
          <div className="profile-header-actions">
            <button
              type="button"
              className="profile-back-btn"
              onClick={() => navigate('/dashboard')}
            >
              {t('profile.backDashboard')}
            </button>
          </div>
        </div>
        <SocialPanel />
      </section>
    </MotionPage>
  )
}

export default SocialPage
