import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Search, X, Printer, FileText, CheckCircle2, Clock, FileEdit, FolderKanban } from 'lucide-react'
import { useAuthStore } from '../../auth/session.ts'
import { calculateQuoteTotals } from '../../domain/pricing.ts'
import type { QuoteStatus } from '../../domain/models.ts'
import type { QuoteAccessRow } from '../../repositories/SupabaseQuoteRepository.ts'
import { quoteRepository, useAppStore } from '../../store/useAppStore.ts'
import { formatDateTime } from '../../utils/dates.ts'
import { formatMoney } from '../../utils/money.ts'
import { StatusBadge } from '../../components/ui/Badge.tsx'
import { matchesQuery } from './filters.ts'

const sections: { status: QuoteStatus; title: string; empty: string; icon: typeof CheckCircle2 }[] = [
  { status: 'booked', title: 'Booked Orders', empty: 'No booked orders.', icon: CheckCircle2 },
  { status: 'quoted', title: 'Quotations Sent', empty: 'No quotations sent.', icon: Clock },
  { status: 'draft', title: 'Active Drafts', empty: 'No draft orders.', icon: FileEdit },
]

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

  const bookedCount = (rows ?? []).filter((r) => r.quote.status === 'booked').length
  const quotedCount = (rows ?? []).filter((r) => r.quote.status === 'quoted').length
  const draftCount = (rows ?? []).filter((r) => r.quote.status === 'draft').length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="eyebrow">
            <FolderKanban size={13} style={{ color: 'var(--accent)' }} />
            <span>Master Job Registry</span>
          </div>
          <h1>All Company Orders</h1>
          <p className="lede">Complete organization overview across all sales representatives and estimators. Print-ready documentation access.</p>
        </div>
      </div>

      {/* Summary Stat Bar */}
      {rows && rows.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}>
          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booked</span>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>{bookedCount}</p>
            </div>
          </div>

          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.12)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quotations</span>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>{quotedCount}</p>
            </div>
          </div>

          <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileEdit size={20} />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drafts</span>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>{draftCount}</p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {!error && rows === null ? <p className="boot">Loading orders…</p> : null}

      {rows ? (
        <div className="toolbar" style={{ marginBottom: '16px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: '1 1 360px',
            maxWidth: '520px',
          }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={query}
              placeholder="Search job number, customer, staff email, or status…"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: query ? '36px' : '12px',
              }}
              className="input"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {rows && rows.length === 0 ? <p>No orders yet.</p> : null}

      {rows && rows.length > 0
        ? sections.map((section) => {
            const items = visible.filter((row) => row.quote.status === section.status)
            const SectionIcon = section.icon
            return (
              <section key={section.status} className="people-section" aria-labelledby={`orders-${section.status}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SectionIcon size={18} style={{ color: section.status === 'booked' ? 'var(--ok)' : section.status === 'quoted' ? 'var(--accent)' : 'var(--warn)' }} />
                    <h2 id={`orders-${section.status}`} style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{section.title}</h2>
                  </div>
                  <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-soft)', border: '1px solid var(--line)', fontWeight: 600, fontSize: '12px' }}>
                    {items.length} {items.length === 1 ? 'order' : 'orders'}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: '14px' }}>
                    {query.trim() ? 'Nothing matches that search in this section.' : section.empty}
                  </p>
                ) : null}

                {items.length > 0 ? (
                  <div className="table-scroll">
                    <table className="admin-orders">
                      <thead>
                        <tr>
                          <th>Job #</th>
                          <th>Customer</th>
                          <th>Status</th>
                          <th>Staff Owner</th>
                          <th>Last Updated</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                          <th style={{ textAlign: 'right' }}>
                            <span>Print Documents</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => {
                          const total = calculateQuoteTotals(row.quote, pricingConfig, catalogue).grandTotal
                          return (
                            <tr key={row.quote.id}>
                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  fontFamily: 'ui-monospace, monospace',
                                  fontWeight: 600,
                                  fontSize: '12.5px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: 'var(--bg-subtle)',
                                  border: '1px solid var(--line)',
                                  color: 'var(--ink)',
                                }}>
                                  #{row.quote.jobNo}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                                  {row.quote.customer.name.trim() || 'Unnamed customer'}
                                </span>
                              </td>
                              <td>
                                <StatusBadge status={row.quote.status} />
                              </td>
                              <td>
                                <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                                  {row.ownerEmail || '—'}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                                  {formatDateTime(row.updatedAt)}
                                </span>
                              </td>
                              <td className="num" style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: 'var(--ink)' }}>
                                {formatMoney(total)}
                              </td>
                              <td>
                                <div className="page-links" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                  <Link
                                    className="btn btn-sm btn-secondary"
                                    to={`/quote/${row.quote.id}/print/quote`}
                                    state={{ from: '/admin/orders' }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  >
                                    <Printer size={13} />
                                    <span>Quote</span>
                                  </Link>
                                  <Link
                                    className="btn btn-sm btn-secondary"
                                    to={`/quote/${row.quote.id}/print/work-order`}
                                    state={{ from: '/admin/orders' }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  >
                                    <FileText size={13} />
                                    <span>Work order</span>
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
              </section>
            )
          })
        : null}
    </div>
  )
}
