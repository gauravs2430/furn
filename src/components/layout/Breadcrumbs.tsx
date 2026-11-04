import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.ts'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation()
  const quotes = useAppStore((state) => state.quotes)

  const { pathname, search, hash } = location
  const searchParams = new URLSearchParams(search)

  // 1. Home
  if (pathname === '/') {
    return [{ label: 'Home' }]
  }

  // 2. Orders & Quotes
  if (pathname === '/orders') {
    const status = searchParams.get('status')
    if (status === 'draft') {
      return [
        { label: 'Orders', to: '/orders' },
        { label: 'Drafts' },
      ]
    }
    if (status === 'quoted') {
      return [
        { label: 'Orders', to: '/orders' },
        { label: 'Quotation' },
      ]
    }
    if (status === 'booked') {
      return [
        { label: 'Orders', to: '/orders' },
        { label: 'Bookings' },
      ]
    }
    return [{ label: 'Orders' }]
  }

  // 3. Quote configurator: /quote/:id and print pages
  const quoteMatch = pathname.match(/^\/quote\/([^/]+)(?:\/(print\/(work-order|quote)))?$/)
  if (quoteMatch) {
    const quoteId = quoteMatch[1]
    const printType = quoteMatch[3]
    const quote = quotes.find((q) => q.id === quoteId)
    const quoteNumber = quote?.jobNo ? `#${quote.jobNo}` : `#${quoteId}`

    const base: BreadcrumbItem[] = [
      { label: 'Quotes', to: '/orders' },
    ]

    if (!printType) {
      base.push({ label: quoteNumber })
    } else {
      base.push({ label: quoteNumber, to: `/quote/${quoteId}` })
      base.push({
        label: printType === 'work-order' ? 'Work Order' : 'Print Quote',
      })
    }
    return base
  }

  

  // 4. Admin routes: /admin/...
  if (pathname.startsWith('/admin')) {
    // Manage subgroup routes
    if (pathname === '/admin/prices') {
      return [
        { label: 'Admin', to: '/admin/orders' },
        { label: 'Manage', to: '/admin/users' },
        { label: 'Prices' },
      ]
    }

    if (pathname === '/admin/catalog') {
      return [
        { label: 'Admin', to: '/admin/orders' },
        { label: 'Manage', to: '/admin/users' },
        { label: 'Catalogue' },
      ]
    }

    if (pathname === '/admin/users') {
      if (hash === '#new-user') {
        return [
          { label: 'Admin', to: '/admin/orders' },
          { label: 'Manage', to: '/admin/users' },
          { label: 'Add new user' },
        ]
      }
      return [
        { label: 'Admin', to: '/admin/orders' },
        { label: 'Manage', to: '/admin/users' },
        { label: 'Users & admins' },
      ]
    }

    const userOrdersMatch = pathname.match(/^\/admin\/users\/([^/]+)\/orders$/)
    if (userOrdersMatch) {
      return [
        { label: 'Admin', to: '/admin/orders' },
        { label: 'Manage', to: '/admin/users' },
        { label: 'Users & admins', to: '/admin/users' },
        { label: 'User orders' },
      ]
    }

    // Orders per user
    if (pathname === '/admin/orders/users') {
      return [
        { label: 'Admin', to: '/admin/orders' },
        { label: 'Orders per user' },
      ]
    }

    const ordersUserMatch = pathname.match(/^\/admin\/orders\/users\/([^/]+)$/)
    if (ordersUserMatch) {
      return [
        { label: 'Admin', to: '/admin/orders' },
        { label: 'Orders per user', to: '/admin/orders/users' },
        { label: 'User orders' },
      ]
    }

    // Default admin /admin/orders or /admin
    if (pathname === '/admin/orders' || pathname === '/admin') {
      return [
        { label: 'Admin', to: '/admin/orders' },
        { label: 'All orders' },
      ]
    }

    return [{ label: 'Admin', to: '/admin/orders' }]
  }

  // 5. Account
  if (pathname === '/account') {
    return [{ label: 'Account' }]
  }

  if (pathname === '/reset-password') {
    return [{ label: 'Reset password' }]
  }

  // Fallback
  return [{ label: 'Home', to: '/' }]
}

export function Breadcrumbs() {
  const crumbs = useBreadcrumbs()

  if (!crumbs.length) return null

  return (
    <nav className="shell-breadcrumbs" aria-label="Breadcrumbs">
      <ol className="shell-breadcrumbs-list">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <li key={idx} className="shell-breadcrumb-item">
              {idx > 0 && (
                <span className="shell-breadcrumb-sep" aria-hidden="true">
                  &gt;
                </span>
              )}
              {crumb.to && !isLast ? (
                <Link to={crumb.to} className="shell-breadcrumb-link">
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="shell-breadcrumb-current"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
