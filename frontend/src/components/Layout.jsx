import { NavLink, Outlet } from 'react-router-dom'
import Icon from './Icon.jsx'
import Badge from './Badge.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useStore } from '../hooks/useStore.js'
import { fullName, notificationsFor } from '../data/mockStore.js'

const REQUESTER_NAV = [
  { to: '/rooms', label: 'Rooms', icon: 'rooms' },
  { to: '/bookings', label: 'Bookings', icon: 'bookings' },
  { to: '/alerts', label: 'Alerts', icon: 'alerts', alerts: true },
  { to: '/profile', label: 'Profile', icon: 'profile' },
]

const ADMIN_NAV = [
  { to: '/admin/requests', label: 'Requests', icon: 'requests' },
  { to: '/admin/rooms', label: 'Rooms', icon: 'manage' },
  { to: '/admin/verify', label: 'Verify', icon: 'verify' },
  { to: '/alerts', label: 'Alerts', icon: 'alerts', alerts: true },
  { to: '/profile', label: 'Profile', icon: 'profile' },
]

export default function Layout() {
  useStore()
  const { user } = useAuth()
  const items = user.role === 'ADMIN' ? ADMIN_NAV : REQUESTER_NAV
  const unread = notificationsFor(user.uid).filter((n) => !n.isRead).length

  const link = (item) => (
    <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
      <span className="nav-icon">
        <Icon name={item.icon} />
        {item.alerts && unread > 0 && <span className="nav-count">{unread}</span>}
      </span>
      <span>{item.label}</span>
    </NavLink>
  )

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src="/logo.svg" alt="" width="34" height="34" />
            <span>Reserba</span>
          </div>
          <nav className="topnav" aria-label="Main">{items.map(link)}</nav>
          <div className="topbar-user">
            <span className="topbar-name">{fullName(user)}</span>
            {user.role === 'ADMIN' && <Badge tone="blue">Admin</Badge>}
          </div>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <nav className="bottomnav" aria-label="Main">{items.map(link)}</nav>
    </div>
  )
}
