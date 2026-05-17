import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import SocialPanel from '../components/SocialPanel'
import { useLanguage } from '../context/useLanguage'

function SocialPage() {
  const { t } = useLanguage()

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
      <Navbar title={t('social.title')} hideActions />

      <section className="profile-edit-card">
        <SocialPanel />
      </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default SocialPage
