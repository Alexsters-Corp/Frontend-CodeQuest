import { toast } from 'sonner'

export function notifySuccess(message, options = {}) {
  toast.success(message, {
    duration: 2600,
    ...options,
  })
}

export function notifyError(message, options = {}) {
  toast.error(message, {
    duration: 3400,
    ...options,
  })
}

export function notifyInfo(message, options = {}) {
  toast.info(message, {
    duration: 2600,
    ...options,
  })
}

export function notifyPending(message, options = {}) {
  toast.warning(message, {
    duration: 2900,
    ...options,
  })
}
