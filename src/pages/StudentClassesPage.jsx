import { useCallback, useEffect, useState } from 'react'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import StudentClassesGrid from '../components/StudentClassesGrid'
import { useLanguage } from '../context/useLanguage'
import { joinClassWithCode, listStudentClasses } from '../services/learningApi'
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify'

export default function StudentClassesPage() {
  const { t } = useLanguage()
  const [studentClasses, setStudentClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [recentJoinedClass, setRecentJoinedClass] = useState(null)
  const [focusedClassId, setFocusedClassId] = useState(null)

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true)
    try {
      const data = await listStudentClasses()
      setStudentClasses(Array.isArray(data) ? data : (data?.classes || []))
    } catch (error) {
      console.error('Error loading student classes:', error)
      notifyError(error?.message || t('dashboard.classes.loadError'))
    } finally {
      setLoadingClasses(false)
    }
  }, [t])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const handleJoinClass = async (event) => {
    event.preventDefault()
    const code = String(inviteCode || '').trim().toUpperCase()
    if (!code) {
      notifyInfo(t('dashboard.joinClassPlaceholder'))
      return
    }

    setJoining(true)
    try {
      const result = await joinClassWithCode(code)
      notifySuccess(t('dashboard.joinSuccess', { name: result.className }))
      setInviteCode('')
      setShowJoinModal(false)
      setRecentJoinedClass({
        id: Number(result.classId || 0),
        name: result.className,
      })
      setFocusedClassId(Number(result.classId || 0) || null)
      await loadClasses()
    } catch (requestError) {
      notifyError(requestError.message || t('dashboard.joinError'))
    } finally {
      setJoining(false)
    }
  }

  const handleViewJoinedClass = () => {
    setRecentJoinedClass(null)
    const target = document.getElementById('dashboard-my-classes')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
        <Navbar title={t('dashboard.sidebar.myClasses')} hideActions />

        <div className="dashboard-content-layout dashboard-content-layout--single">
          <div className="dashboard-main">
            <div id="dashboard-languages">
              <div className="section-header">
                <h2>{t('dashboard.sidebar.myClasses')}</h2>
                <div className="section-actions">
                  <button
                    className="join-class-btn"
                    onClick={() => setShowJoinModal(true)}
                    type="button"
                  >
                    {t('dashboard.joinClass')}
                  </button>
                </div>
              </div>

              {recentJoinedClass ? (
                <div className="classes-joined-banner" role="status" aria-live="polite">
                  <p className="classes-joined-banner__text">
                    {t('dashboard.classes.joinedBannerTitle', { name: recentJoinedClass.name })}
                  </p>
                  <button
                    type="button"
                    className="classes-joined-banner__action"
                    onClick={handleViewJoinedClass}
                  >
                    {t('dashboard.classes.viewMyClass')}
                  </button>
                </div>
              ) : null}

              <StudentClassesGrid classes={studentClasses} loading={loadingClasses} focusClassId={focusedClassId} />
            </div>
          </div>
        </div>

        {showJoinModal && (
          <div className="language-delete-overlay" role="dialog" aria-modal="true">
            <div className="language-delete-modal join-class-modal">
              <h3>{t('dashboard.joinClassTitle')}</h3>
              <p>{t('dashboard.joinClassDescription')}</p>

              <form onSubmit={handleJoinClass}>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12)
                    setInviteCode(val)
                  }}
                  placeholder={t('dashboard.joinClassPlaceholder')}
                  disabled={joining}
                  autoFocus
                />

                <div className="language-delete-actions">
                  <button
                    className="language-delete-cancel"
                    onClick={() => setShowJoinModal(false)}
                    type="button"
                    disabled={joining}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    className="language-delete-confirm join-confirm-btn"
                    type="submit"
                    disabled={joining || !inviteCode.trim()}
                  >
                    {joining ? t('common.loading') : t('dashboard.joinAction')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </MotionPage>
    </SidebarLayout>
  )
}
