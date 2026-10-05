import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { cx } from '../../utils/cx.ts'
import { Toasts } from '../ui/Toast.tsx'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/orders', label: 'Orders', end: false },
  { to: '/account', label: 'Account', end: false },
  { to: '/admin/users', label: 'Admin', end: false },
]

export function AppShell() {
  const location = useLocation()
  const printing = location.pathname.includes('/print/')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  if (printing) {
    return (
      <div className="print-route">
        <Outlet />
        <Toasts />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-bar">
          <Link to="/" className="brand">
            <span className="brand-name">SunnyPlast</span>
          </Link>
          <button
            type="button"
            className="menu-button"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
        </div>
        <nav id="site-nav" className={cx('nav-links', menuOpen && 'is-open')} aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => cx('nav-link', isActive && 'is-active')}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <Toasts />
    </div>
  )
}
