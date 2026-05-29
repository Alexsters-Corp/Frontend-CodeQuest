import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import MotionPage from '../components/MotionPage'
import Navbar from '../components/Navbar'
import SidebarLayout from '../components/SidebarLayout'
import { useLanguage } from '../context/useLanguage'
import { listGeneratedContent } from '../services/aiAdminApi'
import { notifyError } from '../utils/notify'

const MotionDiv = motion.div

function InstructorAiContentPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [contents, setContents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadContent() {
      try {
        const data = await listGeneratedContent()
        setContents(Array.isArray(data) ? data : [])
      } catch (error) {
        notifyError(error.message || 'Error al cargar contenidos')
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [])

  return (
    <SidebarLayout>
      <MotionPage className="dashboard-page" delay={0.06}>
        <Navbar title={t('instructor.viewGeneratedContent')} hideActions />

        <section className="rbac-page">
          <div className="rbac-header">
            <div>
              <p className="rbac-kicker">{t('route.rolePanel')}</p>
              <h1>{t('instructor.viewGeneratedContent')}</h1>
              <p className="rbac-subtitle">
                Consulta el historial de lecciones y ejercicios generados por IA.
              </p>
            </div>
            <div className="rbac-actions-inline">
              <button type="button" onClick={() => navigate('/instructor')}>
                {t('common.back')}
              </button>
            </div>
          </div>

          <div className="rbac-card">
            {loading ? (
              <p className="rbac-muted">{t('common.loading')}</p>
            ) : contents.length === 0 ? (
              <p className="rbac-muted">No se ha generado contenido aún.</p>
            ) : (
              <div className="rbac-table-wrap">
                <table className="rbac-table compact">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tema</th>
                      <th>Lenguaje</th>
                      <th className="rbac-center">Validado</th>
                      <th className="rbac-center">Score</th>
                      <th className="rbac-center">Dificultad</th>
                      <th>Modelo</th>
                      <th className="rbac-center">Judge0</th>
                      <th className="rbac-center">Publicado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contents.map((item) => (
                      <tr key={item.id}>
                        <td title={item.id}>
                          <code>{item.id.substring(0, 8)}...</code>
                        </td>
                        <td>{item.topic}</td>
                        <td>{item.language}</td>
                        <td className="rbac-center">
                          <span className={`ai-model-badge ai-model-badge--${item.validated_by}`}>
                            {item.validated_by}
                          </span>
                        </td>
                        <td className="rbac-center">
                          <strong>{Math.round(item.quality_score * 100)}%</strong>
                        </td>
                        <td className="rbac-center">
                          <span className={`ai-level-badge ai-level-badge--${item.difficulty_level}`}>
                            {item.difficulty_level}
                          </span>
                        </td>
                        <td>
                          <small>{item.ai_model_used}</small>
                        </td>
                        <td className="rbac-center">
                          {item.judge0_validated ? '✅' : '❌'}
                        </td>
                        <td className="rbac-center">
                          {item.published ? '✅' : '❌'}
                        </td>
                        <td>
                          {new Date(item.generated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </MotionPage>
    </SidebarLayout>
  )
}

export default InstructorAiContentPage
