import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const MOBILE_QUERY = '(max-width: 767px)'
const SHELL_ROUTE_PREFIXES = [
  '/dashboard',
  '/favorites',
  '/profile',
  '/ranking',
  '/social',
  '/users',
  '/instructor',
  '/admin',
  '/modules',
  '/lesson',
  '/diagnostic',
  '/onboarding',
]

function hasOpenModal() {
  return Boolean(document.querySelector('[aria-modal="true"], [role="dialog"], .modal, .ai-guide-modal'))
}

function matchesRoutePrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
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

  const isShellRoute = SHELL_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix))
  const hasFixedHeader = pathname === '/demo' || (isMobile && isShellRoute)

  let topOffset = '24px'

  if (modalOpen) {
    topOffset = isMobile ? '16px' : '20px'
  } else if (hasFixedHeader) {
    topOffset = isMobile ? '84px' : '88px'
  } else if (isShellRoute) {
    topOffset = isMobile ? '18px' : '28px'
  } else if (isMobile) {
    topOffset = '16px'
  }

  return {
    position: 'top-center',
    topOffset,
    bottomOffset: '24px',
  }
}
