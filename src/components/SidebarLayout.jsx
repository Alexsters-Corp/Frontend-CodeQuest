import PropTypes from 'prop-types'
import Sidebar from './Sidebar'

function SidebarLayout({ children, immersive = false }) {
  return (
    <div className={`sidebar-layout${immersive ? ' sidebar-layout--immersive' : ''}`}>
      {!immersive && (
        <div className="sidebar-layout__sidebar">
          <Sidebar />
        </div>
      )}
      <div className="sidebar-layout__content">
        {children}
      </div>
    </div>
  )
}

SidebarLayout.propTypes = {
  children: PropTypes.node.isRequired,
  immersive: PropTypes.bool,
}

export default SidebarLayout
