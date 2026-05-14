import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IoMdArrowUp } from 'react-icons/io'
import { useLanguage } from '../context/useLanguage'

const MotionButton = motion.button

function ScrollToTopButton() {
  const { t } = useLanguage()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY >= 400)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <MotionButton
      type="button"
      className="scroll-to-top-btn"
      aria-label={t('home.scrollToTop')}
      title={t('home.scrollToTop')}
      onClick={scrollToTop}
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 12,
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
    >
      <IoMdArrowUp aria-hidden="true" />
    </MotionButton>
  )
}

export default ScrollToTopButton
