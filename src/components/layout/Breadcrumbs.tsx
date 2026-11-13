import { useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.ts'
import type { QuoteStatus } from '../../domain/models.ts'

/*
 * Where you are, in the same names and order as the sidebar (and the account menu),
 * e.g. Admin Panel > Manage > Catalogue. It is a label only, never a link.
 */

const ORDERS = 'Orders and quotes'
const ADMIN = 'Admin Panel'
const MANAGE = 'Manage'

const LIST_FOR_STATUS: Record<QuoteStatus, string> = {
  draft: 'Drafts',
  quoted: 'Quotation',
  booked: 'Bookings',
}

export function useBreadcrumbs(): string[] {
  const { pathname, search, hash } = useLocation()
  const quotes = useAppStore((state) => state.quotes)

  if (pathname === '/') return ['Home']
  if (pathname === '/account') return ['Account']
  if (pathname === '/reset-password') return ['Reset password']

  if (pathname === '/orders') {
    const status = new URLSearchParams(search).get('status') as QuoteStatus | null
    return status && LIST_FOR_STATUS[status] ? [ORDERS, LIST_FOR_STATUS[status]] : [ORDERS]
  }

  // A quote sits under the list it belongs to (Drafts, Quotation or Bookings).
  const quoteMatch = pathname.match(/^\/quote\/([^/]+)(?:\/print\/(work-order|quote))?$/)
  if (quoteMatch) {
    const quote = quotes.find((entry) => entry.id === quoteMatch[1])
    const trail = [ORDERS]
    if (quote) trail.push(LIST_FOR_STATUS[quote.status])
    trail.push(quote?.jobNo ? `Quote ${quote.jobNo}` : 'Quote')
    if (quoteMatch[2] === 'work-order') trail.push('Work order')
    if (quoteMatch[2] === 'quote') trail.push('Print quote')
    return trail
  }

  if (pathname === '/admin' || pathname === '/admin/orders') return [ADMIN, 'All orders']
  if (pathname === '/admin/orders/users') return [ADMIN, 'Orders per user']
  if (/^\/admin\/orders\/users\/[^/]+$/.test(pathname)) return [ADMIN, 'Orders per user', 'User orders']
  if (pathname === '/admin/users') return [ADMIN, MANAGE, hash === '#new-user' ? 'Add new user' : 'Users & admins']
  if (/^\/admin\/users\/[^/]+\/orders$/.test(pathname)) return [ADMIN, MANAGE, 'Users & admins', 'User orders']
  if (pathname === '/admin/prices') return [ADMIN, MANAGE, 'Prices']
  if (pathname === '/admin/catalog') return [ADMIN, MANAGE, 'Catalogue']
  if (pathname.startsWith('/admin')) return [ADMIN]

  return ['Home']
}

export function Breadcrumbs() {
  const crumbs = useBreadcrumbs()
  if (!crumbs.length) return null

  return (
    <nav className="shell-breadcrumbs" aria-label="You are here">
      <ol className="shell-breadcrumbs-list">
        {crumbs.map((label, index) => (
          <li key={index} className="shell-breadcrumb-item">
            {index > 0 ? (
              <span className="shell-breadcrumb-sep" aria-hidden="true">
                &gt;
              </span>
            ) : null}
            <span className="shell-breadcrumb-current" aria-current={index === crumbs.length - 1 ? 'page' : undefined}>
              {label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
