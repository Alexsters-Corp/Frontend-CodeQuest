import './LoadingSpinner.css'


function LoadingSpinner({ size = 'medium', color = 'primary', className = '' }) {
  const sizeClass = `spinner--${size}`
  const colorClass = `spinner--${color}`

  return (
    <div 
      className={`spinner-container ${className}`} 
      role="progressbar" 
      aria-busy="true" 
      aria-live="polite"
    >
      <div className={`loading-spinner ${sizeClass} ${colorClass}`}>
        <div className="spinner-dot"></div>
        <div className="spinner-dot"></div>
        <div className="spinner-dot"></div>
        <div className="spinner-dot"></div>
      </div>
    </div>
  )
}

export default LoadingSpinner
