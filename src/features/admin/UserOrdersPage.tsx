import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { StatusBadge } from '../../components/ui/Badge.tsx'
import { calculateQuoteTotals } from '../../domain/pricing.ts'
import { supabase } from '../../lib/supabase.ts'
import type { QuoteAccessRow } from '../../repositories/SupabaseQuoteRepository.ts'
import { quoteRepository, useAppStore } from '../../store/useAppStore.ts'
import { formatDateTime } from '../../utils/dates.ts'
import { formatMoney } from '../../utils/money.ts'
import { matchesQuery } from './filters.ts'

interface ListedPerson {
  email: string
  full_name: string
}

function listedPerson(value: unknown): ListedPerson | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.email !== 'string' || !row.email.trim()) return null
  return {
    email: row.email,
    full_name: typeof row.full_name === 'string' ? row.full_name : '',
  }
}

function messageFrom(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message.trim()
    if (message) return message
  }
  return 'Could not load orders.'
}

export function UserOrdersPage() {
  const { id: userId } = useParams()
  const profile = useAuthStore((state) => state.profile)
  const pricingConfig = useAppStore((state) => state.pricingConfig)
  const catalogue = useAppStore((state) => state.catalogue)
  const [person, setPerson] = useState<ListedPerson | null>(null)
  const [rows, setRows] = useState<QuoteAccessRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [queryFor, setQueryFor] = useState(userId ?? '')
  if ((userId ?? '') !== queryFor) {
    setQueryFor(userId ?? '')
    setQuery('')
  }

  useEffect(() => {
    if (profile?.role !== 'admin' || !userId) return
    let cancelled = false
    void (async () => {
      try {
        if (!supabase) throw new Error('Supabase is not configured.')
        const [list, profileResult] = await Promise.all([
          quoteRepository.listForUser(userId),
          supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle(),
        ])
        if (cancelled) return
        if (profileResult.error) {
          setPerson(null)
          setRows(null)
          setError(profileResult.error.message)
          setLoadedFor(userId)
          return
        }
        const next = listedPerson(profileResult.data)
        if (!next) {
          setPerson(null)
          setRows(null)
          setError('That person is not listed.')
          setLoadedFor(userId)
          return
        }
        setPerson(next)
        setRows(list)
        setError(null)
        setLoadedFor(userId)
      } catch (loadError: unknown) {
        if (!cancelled) {
          setPerson(null)
          setRows(null)
          setError(messageFrom(loadError))
          setLoadedFor(userId)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.role, userId])

  if (!profile) return <p className="boot">Checking login…</p>
  if (profile.role !== 'admin') return <Navigate to="/" replace />
  if (!userId) return <Navigate to="/admin/users" replace />

  const ready = loadedFor === userId
  const shownPerson = ready ? person : null
  const shownRows = ready ? rows : null
  const shownError = ready ? error : null
  const visible = (shownRows ?? []).filter((row) => matchesQuery(query, row.quote.jobNo, row.quote.customer.name, row.quote.reference ?? ''))
  const searching = query.trim().length > 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Orders</p>
          <h1>{shownPerson ? shownPerson.full_name.trim() || '—' : 'Orders'}</h1>
          {shownPerson ? <p className="lede">{shownPerson.email}</p> : null}
          <nav className="page-links" aria-label="Admin">
            <Link to="/admin/users">People</Link>
          </nav>
        </div>
      </div>

      {shownError ? <p className="form-error">{shownError}</p> : null}
      {!shownError && shownRows === null ? <p className="boot">Loading orders…</p> : null}

      {shownRows ? (
        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Search orders</span>
            <input
              value={query}
              placeholder="Search job number, customer or reference"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {shownRows && shownRows.length === 0 ? <p>No orders yet.</p> : null}
      {shownRows && shownRows.length > 0 && visible.length === 0 ? <p>{searching ? 'Nothing matches that search.' : 'No orders yet.'}</p> : null}
      {visible.length > 0 ? (
        <div className="table-scroll">
          <table className="admin-orders">
            <thead>
              <tr>
                <th>Job</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Total</th>
                <th>
                  <span className="sr-only">Print</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const total = calculateQuoteTotals(row.quote, pricingConfig, catalogue).grandTotal
                return (
                  <tr key={row.quote.id}>
                    <td>{row.quote.jobNo}</td>
                    <td>{row.quote.customer.name.trim() || 'Unnamed customer'}</td>
                    <td>
                      <StatusBadge status={row.quote.status} />
                    </td>
                    <td>{formatDateTime(row.updatedAt)}</td>
                    <td className="num">{formatMoney(total)}</td>
                    <td>
                      <div className="page-links">
                        <Link className="btn btn-sm btn-secondary" to={`/quote/${row.quote.id}/print/quote`}>
                          Print quote
                        </Link>
                        <Link className="btn btn-sm btn-secondary" to={`/quote/${row.quote.id}/print/work-order`}>
                          Print work order
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
