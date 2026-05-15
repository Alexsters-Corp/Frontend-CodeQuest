import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const MOBILE_QUERY = '(max-width: 767px)'

function hasOpenModal() {
  return Boolean(document.querySelector('[aria-modal="true"], [role="dialog"], .modal, .ai-guide-modal'))
}

export function useToastPosition() {
  const { pathname } = useLocation()
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [modalOpen, setModalOpen] = useState(() => hasOpenModal())

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY)
    const handleChange = () => setIsMobile(mediaQuery.matches)

    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => setModalOpen(hasOpenModal()))
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal', 'role', 'class'],
    })
    const syncTimer = window.setTimeout(() => setModalOpen(hasOpenModal()), 0)
    return () => {
      window.clearTimeout(syncTimer)
      observer.disconnect()
    }
  }, [pathname])

  if (isMobile) {
    return 'bottom-center'
  }

  if (modalOpen) {
    return 'top-center'
  }

  return 'top-center'
}
