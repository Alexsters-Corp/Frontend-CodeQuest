import { createElement } from 'react'
import { toast } from 'sonner'
import ToastContent from '../components/ToastContent'

const DURATIONS = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000,
  loading: Infinity,
}

const recentToastByKey = new Map()
const activeToastByMessage = new Map()

let notificationLabels = {
  close: 'Cerrar',
  closeAria: 'Cerrar notificación',
}

export function configureNotifications(labels = {}) {
  notificationLabels = {
    ...notificationLabels,
    ...labels,
  }
}

function showToast(type, title, options = {}) {
  const {
    description,
    icon,
    message: optionMessage,
    rateLimitKey,
    rateLimitMs = 1600,
    title: optionTitle,
    groupKey,
    ...toastOptions
  } = options

  // Deduplication: explicit groupKey or the message title itself
  const dedupeKey = groupKey || title

  if (rateLimitKey) {
    const now = Date.now()
    const lastShownAt = recentToastByKey.get(rateLimitKey) || 0
    if (now - lastShownAt < rateLimitMs) {
      return null
    }
    recentToastByKey.set(rateLimitKey, now)
  }

  // If a toast with the same key exists, dismiss it first
  if (dedupeKey && activeToastByMessage.has(dedupeKey)) {
    toast.dismiss(activeToastByMessage.get(dedupeKey))
  }

  const duration = toastOptions.duration ?? DURATIONS[type]
  const toastTitle = optionTitle || title
  const message = description || optionMessage || ''

  const newToastId = toast.custom(
    (toastId) => {
      if (dedupeKey) {
        activeToastByMessage.set(dedupeKey, toastId)
      }
      return createElement(ToastContent, {
        type,
        title: toastTitle,
        message,
        duration,
        closeLabel: notificationLabels.close,
        closeAriaLabel: notificationLabels.closeAria,
        icon,
        onClose: () => {
          if (dedupeKey) {
            activeToastByMessage.delete(dedupeKey)
          }
          toast.dismiss(toastId)
        },
      })
    },
    {
      duration,
      className: 'cq-toast',
      ...toastOptions,
    }
  )

  return newToastId
}

export function notifySuccess(message, options = {}) {
  return showToast('success', message, options)
}

export function notifyError(message, options = {}) {
  return showToast('error', message, options)
}

export function notifyInfo(message, options = {}) {
  return showToast('info', message, options)
}

export function notifyPending(message, options = {}) {
  return showToast('warning', message, options)
}

export function notifyLoading(message, options = {}) {
  return showToast('loading', message, options)
}
