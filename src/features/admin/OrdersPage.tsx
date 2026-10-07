import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { calculateQuoteTotals } from '../../domain/pricing.ts'
import type { QuoteAccessRow } from '../../repositories/SupabaseQuoteRepository.ts'
import { quoteRepository, useAppStore } from '../../store/useAppStore.ts'
import { formatDateTime } from '../../utils/dates.ts'
import { formatMoney } from '../../utils/money.ts'
import { StatusBadge } from '../../components/ui/Badge.tsx'
import { matchesQuery } from './filters.ts'

function messageFrom(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message.trim()
    if (message) return message
  }
  return 'Could not load orders.'
}

export function AdminOrdersPage() {
  const profile = useAuthStore((state) => state.profile)
  const pricingConfig = useAppStore((state) => state.pricingConfig)
  const catalogue = useAppStore((state) => state.catalogue)
  const [rows, setRows] = useState<QuoteAccessRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (profile?.role !== 'admin') return
    let cancelled = false
    void quoteRepository
      .listAll()
      .then((list) => {
        if (!cancelled) setRows(list)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(messageFrom(loadError))
      })
    return () => {
      cancelled = true
    }
  }, [profile?.role])

  if (!profile) return <p className="boot">Checking login…</p>
  if (profile.role !== 'admin') return <Navigate to="/" replace />

  const visible = (rows ?? []).filter((row) =>
    matchesQuery(query, row.quote.jobNo, row.quote.customer.name, row.ownerEmail, row.quote.status),
  )

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>All orders</h1>
          <p className="lede">Every staff job. Print only.</p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {!error && rows === null ? <p className="boot">Loading orders…</p> : null}
      {rows ? (
        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Search orders</span>
            <input
              value={query}
              placeholder="Search job number, customer, email or status"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      ) : null}
      {rows && rows.length === 0 ? <p>No orders yet.</p> : null}
      {rows && rows.length > 0 && visible.length === 0 ? <p>Nothing matches that search.</p> : null}
      {visible.length > 0 ? (
        <div className="table-scroll">
          <table className="admin-orders">
            <thead>
              <tr>
                <th>Job</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Owner</th>
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
                    <td>{row.ownerEmail || '—'}</td>
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
