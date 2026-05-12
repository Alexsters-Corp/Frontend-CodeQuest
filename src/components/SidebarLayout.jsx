import PropTypes from 'prop-types'
import Sidebar from './Sidebar'

function SidebarLayout({ children }) {
  return (
    <div className="sidebar-layout">
      <div className="sidebar-layout__sidebar">
        <Sidebar />
      </div>
      <div className="sidebar-layout__content">
        {children}
      </div>
    </div>
  )
}

SidebarLayout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default SidebarLayout
