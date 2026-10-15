import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Search, X, Printer, FileText, CheckCircle2, Clock, FileEdit, Mail } from 'lucide-react'
import { useAuthStore } from '../../auth/session.ts'
import { StatusBadge } from '../../components/ui/Badge.tsx'
import { calculateQuoteTotals } from '../../domain/pricing.ts'
import { supabase } from '../../lib/supabase.ts'
import type { QuoteStatus } from '../../domain/models.ts'
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || 'SP'
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
  if (!userId) return <Navigate to="/admin/orders/users" replace />

  const ready = loadedFor === userId
  const shownPerson = ready ? person : null
  const shownRows = ready ? rows : null
  const shownError = ready ? error : null
  const visible = (shownRows ?? []).filter((row) => matchesQuery(query, row.quote.jobNo, row.quote.customer.name, row.quote.reference ?? ''))
  const searching = query.trim().length > 0

  const personName = shownPerson ? shownPerson.full_name.trim() || shownPerson.email : 'Staff Member'

  return (
    <div className="page">
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/admin/orders/users"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--muted)',
            textDecoration: 'none',
            padding: '6px 10px',
            borderRadius: '6px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--line)',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to staff directory</span>
        </Link>
      </div>

      {shownPerson ? (
        <div className="card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'rgba(14, 165, 233, 0.12)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px',
              border: '1px solid rgba(14, 165, 233, 0.25)',
            }}>
              {initials(personName)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{personName}</h1>
                <span className="badge" style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent)', fontSize: '11px', fontWeight: 600 }}>
                  Staff Account
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--muted)' }}>
                  <Mail size={13} />
                  <span>{shownPerson.email}</span>
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: 'var(--muted)', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                  {userId}
                </span>
              </div>
            </div>
          </div>

          {shownRows ? (
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Jobs</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', fontFamily: 'ui-monospace, monospace' }}>{shownRows.length}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Booked</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ok)', fontFamily: 'ui-monospace, monospace' }}>
                  {shownRows.filter((r) => r.quote.status === 'booked').length}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {shownError ? <p className="form-error">{shownError}</p> : null}
      {!shownError && shownRows === null ? <p className="boot">Loading orders…</p> : null}

      {shownRows ? (
        <div className="toolbar" style={{ marginBottom: '16px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: '1 1 360px',
            maxWidth: '480px',
          }}>
            <Search
              size={15}
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
              placeholder="Search job number, customer or reference…"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              style={{
                width: '100%',
                paddingLeft: '34px',
                paddingRight: query ? '34px' : '12px',
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
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {shownRows && shownRows.length === 0 ? <p style={{ color: 'var(--muted)', padding: '20px 0' }}>No orders recorded for this user yet.</p> : null}

      {shownRows && shownRows.length > 0
        ? sections.map((section) => {
            const items = visible.filter((row) => row.quote.status === section.status)
            const SectionIcon = section.icon
            return (
              <section key={section.status} className="people-section" aria-labelledby={`user-orders-${section.status}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SectionIcon size={17} style={{ color: section.status === 'booked' ? 'var(--ok)' : section.status === 'quoted' ? 'var(--accent)' : 'var(--warn)' }} />
                    <h2 id={`user-orders-${section.status}`} style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>{section.title}</h2>
                  </div>
                  <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-soft)', border: '1px solid var(--line)', fontWeight: 600, fontSize: '11px' }}>
                    {items.length} {items.length === 1 ? 'order' : 'orders'}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: '13.5px' }}>
                    {searching ? 'Nothing matches that search in this section.' : section.empty}
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
                          <th>Last Updated</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                          <th style={{ textAlign: 'right' }}>Print Documents</th>
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
                                    state={{ from: `/admin/orders/users/${userId}` }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  >
                                    <Printer size={13} />
                                    <span>Quote</span>
                                  </Link>
                                  <Link
                                    className="btn btn-sm btn-secondary"
                                    to={`/quote/${row.quote.id}/print/work-order`}
                                    state={{ from: `/admin/orders/users/${userId}` }}
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
