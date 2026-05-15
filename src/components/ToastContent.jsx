import {
  IoCheckmarkCircle,
  IoClose,
  IoCloseCircle,
  IoInformationCircle,
  IoRefresh,
  IoWarning,
} from 'react-icons/io5'

const ICONS = {
  success: IoCheckmarkCircle,
  error: IoCloseCircle,
  warning: IoWarning,
  info: IoInformationCircle,
  loading: IoRefresh,
}

function ToastContent({
  type = 'info',
  title,
  message,
  duration,
  closeLabel,
  closeAriaLabel,
  onClose,
  icon,
}) {
  const Icon = ICONS[type] || ICONS.info
  const hasProgress = type !== 'loading' && Number.isFinite(duration) && duration > 0

  return (
    <div className={`cq-toast-content cq-toast-content--${type}`}>
      <div className="cq-toast-icon" aria-hidden="true">
        {icon || <Icon />}
      </div>

      <div className="cq-toast-copy">
        <p className="cq-toast-title">{title}</p>
        {message && <p className="cq-toast-message">{message}</p>}
      </div>

      <button
        type="button"
        className="cq-toast-close"
        aria-label={closeAriaLabel}
        title={closeLabel}
        onClick={onClose}
      >
        <IoClose aria-hidden="true" />
      </button>

      {hasProgress && (
        <div className="cq-toast-progress" aria-hidden="true">
          <span
            className="cq-toast-progress__bar"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  )
}

export default ToastContent
