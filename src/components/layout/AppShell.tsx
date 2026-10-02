import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.ts'
import { ThemeToggle } from './ThemeToggle.tsx'
import { Toasts } from '../ui/Toast.tsx'

export function AppShell() {
  const theme = useAppStore((state) => state.theme)
  const location = useLocation()
  const printing = location.pathname.includes('/print/')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

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
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <rect x="3" y="5" width="26" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 5 L16 16 L3 27" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M29 5 L16 16 L29 27" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M16 5 V27" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
          <span>
            <span className="brand-name">Measure & Order</span>
            <span className="brand-sub">Doors and windows</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <Toasts />
    </div>
  )
}
