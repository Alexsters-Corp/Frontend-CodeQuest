import PropTypes from 'prop-types'
import { motion, useReducedMotion } from 'framer-motion'

const MotionDiv = motion.div

function MotionPage({ children, className, delay }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <MotionDiv
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </MotionDiv>
  )
}

MotionPage.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  delay: PropTypes.number,
}

MotionPage.defaultProps = {
  className: '',
  delay: 0,
}

export default MotionPage
