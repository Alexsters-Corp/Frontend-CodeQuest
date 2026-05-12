import MotionPage from '../components/MotionPage'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import SocialPanel from '../components/SocialPanel'
import { useLanguage } from '../context/useLanguage'

function SocialPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
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
    </SidebarLayout>
  )
}

export default SocialPage
