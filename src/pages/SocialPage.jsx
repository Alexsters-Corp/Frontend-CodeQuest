import MotionPage from '../components/MotionPage'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SocialPanel from '../components/SocialPanel'
import { useLanguage } from '../context/useLanguage'

function SocialPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <MotionPage className="dashboard-page" delay={0.06}>
      <Sidebar />
      <Navbar title={t('social.title')} hideActions />

      <section className="profile-edit-card">
        <div className="profile-header-row" style={{ marginBottom: '16px' }}>
          <div className="profile-header-actions" style={{ marginLeft: 'auto' }}>
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
