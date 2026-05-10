import LoadingSpinner from './LoadingSpinner'
import './LoadingOverlay.css'


function LoadingOverlay({ message = 'Cargando...', show = false, transparent = false }) {
  if (!show) return null

  return (
    <div className={`loading-overlay ${transparent ? 'loading-overlay--transparent' : ''}`}>
      <div className="loading-overlay__content">
        <LoadingSpinner size="medium" />
        {message && <p className="loading-overlay__message">{message}</p>}
      </div>
    </div>
  )
}

export default LoadingOverlay
