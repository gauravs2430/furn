import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { signOut, useAuthStore } from '../../auth/session.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { cx } from '../../utils/cx.ts'
import { Toasts } from '../ui/Toast.tsx'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/orders', label: 'Orders', end: false },
  { to: '/account', label: 'Account', end: false },
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const pricingStatus = useAppStore((state) => state.pricingStatus)
  const pricingNotice = useAppStore((state) => state.pricingNotice)
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = profile?.role === 'admin' ? [...links, { to: '/admin/users', label: 'Admin', end: false }] : links

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  async function logOut() {
    setMenuOpen(false)
    await signOut()
    navigate('/login', { replace: true })
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
          {nav.map((link) => (
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
          <div className="nav-side">
            {profile?.email ? <span className="nav-email">{profile.email}</span> : null}
            <button type="button" className="nav-link" onClick={() => void logOut()}>
              Log out
            </button>
          </div>
        </nav>
      </header>
      <main className="app-main">
        {pricingNotice ? (
          <p className="form-error prices-banner" role="alert">
            {pricingNotice}
          </p>
        ) : null}
        {pricingStatus === 'loading' ? <p className="boot">Loading prices…</p> : <Outlet />}
      </main>
      <Toasts />
    </div>
  )
}
