import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { reloadProfile, signOut, useAuthStore } from '../../auth/session.ts'
import { company } from '../../data/company.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { cx } from '../../utils/cx.ts'
import { Toasts } from '../ui/Toast.tsx'

type NavLinkItem = { type: 'link'; to: string; label: string }
type NavQuoteItem = { type: 'quote'; label: string }
type NavGroup = { type: 'group'; id: string; label: string; to?: string; admin?: boolean; items: NavNode[] }
type NavNode = NavLinkItem | NavQuoteItem | NavGroup

const navigation: NavGroup[] = [
  {
    type: 'group',
    id: 'home',
    label: 'Home',
    to: '/',
    items: [{ type: 'quote', label: 'New quote' }],
  },
  {
    type: 'group',
    id: 'orders',
    label: 'Orders and quotes',
    items: [
      { type: 'link', to: '/orders?status=draft', label: 'Drafts' },
      { type: 'link', to: '/orders?status=quoted', label: 'Quotes' },
      { type: 'link', to: '/orders?status=booked', label: 'Booked' },
    ],
  },
  {
    type: 'group',
    id: 'admin',
    label: 'Admin Panel',
    admin: true,
    items: [
      { type: 'link', to: '/admin/orders', label: 'All orders' },
      { type: 'link', to: '/admin/users', label: 'Users & admins' },
      { type: 'link', to: '/admin/users#new-user', label: 'Add new user' },
      {
        type: 'group',
        id: 'manage',
        label: 'Manage',
        items: [
          { type: 'link', to: '/admin/prices', label: 'Prices' },
          { type: 'link', to: '/admin/catalog', label: 'Catalogue' },
        ],
      },
    ],
  },
]

function visibleNavigation(nodes: NavNode[], isAdmin: boolean): NavNode[] {
  const visible: NavNode[] = []
  for (const node of nodes) {
    if (node.type !== 'group') {
      visible.push(node)
      continue
    }
    if (node.admin && !isAdmin) continue
    visible.push({ ...node, items: visibleNavigation(node.items, isAdmin) })
  }
  return visible
}

function linkActive(to: string, location: { pathname: string; search: string; hash: string }) {
  const hashIndex = to.indexOf('#')
  const hash = hashIndex >= 0 ? to.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? to.slice(0, hashIndex) : to
  const queryIndex = withoutHash.indexOf('?')
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex) : ''
  if (location.pathname !== path) return false
  const wantedStatus = new URLSearchParams(search).get('status') ?? ''
  const currentStatus = new URLSearchParams(location.search).get('status') ?? ''
  if (wantedStatus !== currentStatus) return false
  if (hash) return location.hash === hash
  if (path === '/admin/users' && location.hash === '#new-user') return false
  return true
}

const SIDEBAR_KEY = 'furn.sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return `${first}${last}`.toUpperCase()
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const pricingStatus = useAppStore((state) => state.pricingStatus)
  const pricingNotice = useAppStore((state) => state.pricingNotice)
  const createQuote = useAppStore((state) => state.createQuote)
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 860px)').matches)
  const [open, setOpen] = useState<Record<string, boolean>>({
    home: true,
    orders: true,
    admin: true,
    manage: true,
  })
  const routeKey = `${location.pathname}${location.search}${location.hash}`
  const [tracked, setTracked] = useState({ routeKey, narrow })
  if (tracked.routeKey !== routeKey || tracked.narrow !== narrow) {
    setTracked({ routeKey, narrow })
    if (tracked.routeKey !== routeKey || !narrow) setDrawer(false)
    if (tracked.routeKey !== routeKey) {
      setOpen((current) => ({
        ...current,
        ...(location.pathname === '/' ? { home: true } : null),
        ...(location.pathname.startsWith('/orders') || location.pathname.startsWith('/quote') ? { orders: true } : null),
        ...(location.pathname.startsWith('/admin') ? { admin: true } : null),
        ...(location.pathname.startsWith('/admin/prices') || location.pathname.startsWith('/admin/catalog')
          ? { manage: true }
          : null),
      }))
    }
  }
  const [starting, setStarting] = useState(false)
  const startingRef = useRef(false)
  const skipProfileReload = useRef(true)
  const isAdmin = profile?.role === 'admin'
  const nodes = visibleNavigation(navigation, isAdmin)
  const accountName = profile?.full_name.trim() || profile?.email || 'Account'
  const sideHidden = narrow && !drawer
  const menuOpen = narrow ? drawer : !collapsed

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      // Private browsing can block storage. The sidebar still toggles for this visit.
    }
  }, [collapsed])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 860px)')
    function onChange() {
      setNarrow(query.matches)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return
      startingRef.current = false
      setStarting(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  useEffect(() => {
    if (!profile?.id) return
    if (skipProfileReload.current) {
      skipProfileReload.current = false
      return
    }
    void reloadProfile()
  }, [location.pathname, profile?.id])

  useEffect(() => {
    if (!drawer) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  useEffect(() => {
    if (!drawer || !narrow) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawer, narrow])

  function toggle(id: string) {
    setOpen((current) => ({ ...current, [id]: !current[id] }))
  }

  async function startQuote() {
    if (startingRef.current) return
    startingRef.current = true
    setStarting(true)
    try {
      const quote = await createQuote()
      if (quote) navigate(`/quote/${quote.id}`)
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'Could not start a quote.'
      useAppStore.getState().pushToast(message, 'danger')
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }

  async function logOut() {
    setDrawer(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  function toggleSidebar() {
    if (narrow) setDrawer((current) => !current)
    else setCollapsed((current) => !current)
  }

  return (
    <div className={cx('app-shell', !narrow && collapsed && 'is-sidebar-collapsed')}>
      <header className="topbar shell-top">
        <div className="shell-top-start">
          <button
            type="button"
            className="shell-menu shell-menu-bar"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={toggleSidebar}
          >
            {menuOpen ? <X size={18} strokeWidth={1.75} aria-hidden="true" /> : <Menu size={18} strokeWidth={1.75} aria-hidden="true" />}
            <span className="sr-only">{menuOpen ? 'Hide sidebar' : 'Show sidebar'}</span>
          </button>
          <div className="shell-brand-slot">
            <Link to="/" className="shell-brand">
              <img className="shell-logo" src="/favicon.svg" alt="" width="36" height="36" />
              <span className="shell-brand-copy">
                <span className="shell-brand-name">{company.name}</span>
                <span className="shell-brand-tag">{company.tagline}</span>
              </span>
            </Link>
          </div>
        </div>
        <button type="button" className="shell-logout" onClick={() => void logOut()}>
          Log out
        </button>
      </header>
      <div className="shell-body">
        <div className={cx('shell-scrim', drawer && narrow && 'is-open')} onClick={() => setDrawer(false)} />
        <nav
          id="site-nav"
          className={cx('shell-side', drawer && 'is-open')}
          aria-label="Primary"
          aria-hidden={sideHidden || undefined}
          inert={sideHidden ? true : undefined}
        >
          {narrow ? null : (
            <div className="shell-rail">
              <button
                type="button"
                className="shell-menu"
                aria-expanded={menuOpen}
                aria-controls="site-nav"
                onClick={toggleSidebar}
              >
                {menuOpen ? <X size={18} strokeWidth={1.75} aria-hidden="true" /> : <Menu size={18} strokeWidth={1.75} aria-hidden="true" />}
                <span className="sr-only">{menuOpen ? 'Hide sidebar' : 'Show sidebar'}</span>
              </button>
            </div>
          )}
          <div className="shell-nav">
            {nodes.map((node) => (
              <SideBranch
                key={node.type === 'group' ? node.id : node.label}
                node={node}
                open={open}
                location={location}
                starting={starting}
                onToggle={toggle}
                onNewQuote={startQuote}
              />
            ))}
          </div>
          <div className="shell-account-wrap">
            <Link
              to="/account"
              className={cx('shell-account', location.pathname === '/account' && 'is-active')}
              aria-current={location.pathname === '/account' ? 'page' : undefined}
            >
              <span className="shell-avatar" aria-hidden="true">
                {initials(accountName)}
              </span>
              <span className="shell-account-copy">
                <span className="shell-account-name">{accountName}</span>
                <span className="shell-account-role">{isAdmin ? 'Admin' : 'Account'}</span>
              </span>
            </Link>
          </div>
        </nav>
        <main className="app-main">
          {pricingNotice ? (
            <p className="form-error prices-banner" role="alert">
              {pricingNotice}
            </p>
          ) : null}
          {pricingStatus === 'loading' ? <p className="boot">Loading prices…</p> : <Outlet />}
        </main>
      </div>
      <Toasts />
    </div>
  )
}

function SideBranch({
  node,
  open,
  location,
  starting,
  onToggle,
  onNewQuote,
}: {
  node: NavNode
  open: Record<string, boolean>
  location: { pathname: string; search: string; hash: string }
  starting: boolean
  onToggle: (id: string) => void
  onNewQuote: () => void
}) {
  if (node.type === 'quote') {
    return (
      <button type="button" className="side-link" disabled={starting} aria-busy={starting} onClick={onNewQuote}>
        <span>{starting ? 'Starting…' : node.label}</span>
        <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    )
  }

  if (node.type === 'link') {
    const active = linkActive(node.to, location)
    return (
      <Link to={node.to} className={cx('side-link', active && 'is-active')} aria-current={active ? 'page' : undefined}>
        <span>{node.label}</span>
        <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    )
  }

  const isOpen = open[node.id] ?? false
  const panelId = `side-panel-${node.id}`
  const current = node.to ? linkActive(node.to, location) : false

  return (
    <div className={cx('side-group', isOpen && 'is-open', current && 'is-current')}>
      {node.to ? (
        <div className="side-group-head">
          <Link to={node.to} className={cx('side-group-link', current && 'is-active')} aria-current={current ? 'page' : undefined}>
            {node.label}
          </Link>
          <button
            type="button"
            className="side-chevron"
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-label={`${isOpen ? 'Hide' : 'Show'} ${node.label}`}
            onClick={() => onToggle(node.id)}
          >
            <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button type="button" className="side-group-toggle" aria-expanded={isOpen} aria-controls={panelId} onClick={() => onToggle(node.id)}>
          <span>{node.label}</span>
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
      <div className="side-panel" id={panelId}>
        <div className="side-panel-inner">
          {node.items.map((item) => (
            <SideBranch
              key={item.type === 'group' ? item.id : item.label}
              node={item}
              open={open}
              location={location}
              starting={starting}
              onToggle={onToggle}
              onNewQuote={onNewQuote}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
