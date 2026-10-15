import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Copy,
  Plus,
  Printer,
  Trash2,
  Search,
  X,
  FileEdit,
  FileCheck2,
  TrendingUp,
  Layers,
  Clock,
  ArrowUpRight,
  SearchX,
  Receipt,
} from 'lucide-react'
import { calculateQuoteTotals } from '../../domain/pricing.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { formatDateTime } from '../../utils/dates.ts'
import { formatMoney } from '../../utils/money.ts'
import { Button } from '../../components/ui/Button.tsx'
import { StatusBadge } from '../../components/ui/Badge.tsx'
import { ConfirmDialog } from '../../components/ui/Dialog.tsx'

export function DashboardPage() {
  const navigate = useNavigate()
  const hydrated = useAppStore((state) => state.hydrated)
  const quotes = useAppStore((state) => state.quotes)
  const pricingConfig = useAppStore((state) => state.pricingConfig)
  const catalogue = useAppStore((state) => state.catalogue)
  const createQuote = useAppStore((state) => state.createQuote)
  const duplicateQuote = useAppStore((state) => state.duplicateQuote)
  const deleteQuote = useAppStore((state) => state.deleteQuote)
  const pushToast = useAppStore((state) => state.pushToast)
  const [params] = useSearchParams()
  const statusParam = params.get('status')
  const statusFilter = statusParam === 'draft' || statusParam === 'quoted' || statusParam === 'booked' ? statusParam : null
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const startingRef = useRef(false)

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return
      startingRef.current = false
      setStarting(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  async function startQuote() {
    if (startingRef.current) return
    startingRef.current = true
    setStarting(true)
    try {
      const quote = await createQuote()
      if (quote) navigate(`/quote/${quote.id}`)
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'Could not start a quote.'
      pushToast(message, 'danger')
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...quotes]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((quote) => {
        if (statusFilter && quote.status !== statusFilter) return false
        if (!needle) return true
        const haystack = `${quote.customer.name} ${quote.reference} ${quote.jobNo} ${quote.status}`.toLowerCase()
        return haystack.includes(needle)
      })
  }, [quotes, query, statusFilter])

  const bookedValue = quotes
    .filter((quote) => quote.status === 'booked')
    .reduce((sum, quote) => sum + calculateQuoteTotals(quote, pricingConfig, catalogue).grandTotal, 0)

  if (!statusFilter) return <Navigate to="/orders?status=quoted" replace />
  if (!hydrated) return <p className="boot">Loading your orders…</p>

  const title = statusFilter === 'draft' ? 'Drafts' : statusFilter === 'booked' ? 'Bookings' : 'Quotation'
  const lede =
    statusFilter === 'draft'
      ? 'Jobs currently being drafted and priced.'
      : statusFilter === 'booked'
        ? 'Confirmed orders booked for factory production.'
        : 'Priced quotations ready to send or awaiting client approval.'

  return (
    <div className="page dashboard-page">
      <div className="page-head dashboard-head">
        <div>
          <p className="eyebrow">Sales workspace</p>
          <h1>{title}</h1>
          <p className="lede">{lede}</p>
        </div>
        <Button
          icon={<Plus size={18} strokeWidth={2.2} />}
          disabled={starting}
          aria-busy={starting}
          onClick={startQuote}
          className="dashboard-new-btn"
        >
          {starting ? 'Starting…' : 'New quote'}
        </Button>
      </div>

      <div className="stat-row dashboard-stats">
        <article className="stat-card stat-card-draft">
          <div className="stat-card-head">
            <span className="stat-card-label">Drafts</span>
            <div className="stat-card-icon-wrap draft-icon">
              <FileEdit size={18} />
            </div>
          </div>
          <strong className="stat-card-value">{quotes.filter((quote) => quote.status === 'draft').length}</strong>
          <span className="stat-card-sub">In-progress estimates</span>
        </article>

        <article className="stat-card stat-card-quoted">
          <div className="stat-card-head">
            <span className="stat-card-label">Quotations</span>
            <div className="stat-card-icon-wrap quoted-icon">
              <FileCheck2 size={18} />
            </div>
          </div>
          <strong className="stat-card-value">{quotes.filter((quote) => quote.status === 'quoted').length}</strong>
          <span className="stat-card-sub">Sent & pending approval</span>
        </article>

        <article className="stat-card stat-card-booked">
          <div className="stat-card-head">
            <span className="stat-card-label">Booked Value</span>
            <div className="stat-card-icon-wrap booked-icon">
              <TrendingUp size={18} />
            </div>
          </div>
          <strong className="stat-card-value">{formatMoney(bookedValue)}</strong>
          <span className="stat-card-sub">Confirmed production revenue</span>
        </article>
      </div>

      <div className="toolbar dashboard-toolbar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            className="input search-input"
            value={query}
            placeholder="Search by customer, reference, job # or status…"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query.trim() ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>
        <div className="toolbar-count">
          Showing <strong>{visible.length}</strong> {visible.length === 1 ? 'job' : 'jobs'}
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="empty dashboard-empty">
          <div className="empty-icon-wrap">
            <SearchX size={36} />
          </div>
          <h3>No saved jobs yet</h3>
          <p>Create your first quote with our parametric joinery configurator.</p>
          <Button disabled={starting} aria-busy={starting} onClick={startQuote}>
            {starting ? 'Starting…' : 'New quote'}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty dashboard-empty">
          <div className="empty-icon-wrap">
            <SearchX size={36} />
          </div>
          <h3>No matching jobs</h3>
          <p>
            {query.trim()
              ? `No orders matching "${query}". Try searching by customer name or job number.`
              : statusFilter === 'draft'
                ? 'No drafts yet in your workspace.'
                : statusFilter === 'booked'
                  ? 'No booked orders yet in your workspace.'
                  : 'No active quotations yet in your workspace.'}
          </p>
          {query.trim() ? (
            <Button size="sm" variant="secondary" onClick={() => setQuery('')}>
              Clear search filter
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="job-grid">
          {visible.map((quote) => {
            const totals = calculateQuoteTotals(quote, pricingConfig, catalogue)
            return (
              <li key={quote.id} className={`job-card job-card-${quote.status}`}>
                <div className="job-top">
                  <span className="job-no">#{quote.jobNo}</span>
                  <StatusBadge status={quote.status} />
                </div>
                <div className="job-title-row">
                  <h2 className="job-customer-name">{quote.customer.name.trim() || 'Unnamed customer'}</h2>
                  {quote.reference.trim() ? (
                    <p className="job-ref">{quote.reference.trim()}</p>
                  ) : (
                    <p className="job-ref is-empty">No reference</p>
                  )}
                </div>
                <dl className="job-meta">
                  <div className="job-meta-item">
                    <dt>
                      <Layers size={13} className="job-meta-icon" />
                      <span>Openings</span>
                    </dt>
                    <dd>{quote.items.length}</dd>
                  </div>
                  <div className="job-meta-item">
                    <dt>
                      <Receipt size={13} className="job-meta-icon" />
                      <span>Total</span>
                    </dt>
                    <dd className="job-meta-total">{formatMoney(totals.grandTotal)}</dd>
                  </div>
                  <div className="job-meta-item job-meta-time">
                    <dt>
                      <Clock size={13} className="job-meta-icon" />
                      <span>Updated</span>
                    </dt>
                    <dd>{formatDateTime(quote.updatedAt)}</dd>
                  </div>
                </dl>
                <div className="job-actions">
                  <Button size="sm" onClick={() => navigate(`/quote/${quote.id}`)} className="job-open-btn">
                    <span>Open</span>
                    <ArrowUpRight size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Copy size={14} />}
                    disabled={duplicatingId === quote.id}
                    aria-busy={duplicatingId === quote.id}
                    onClick={() => {
                      if (duplicatingId) return
                      setDuplicatingId(quote.id)
                      void duplicateQuote(quote.id).then((copy) => {
                        setDuplicatingId(null)
                        if (!copy) return
                        pushToast('Quote duplicated')
                        navigate(`/quote/${copy.id}`)
                      })
                    }}
                  >
                    {duplicatingId === quote.id ? 'Duplicating…' : 'Duplicate'}
                  </Button>
                  {quote.status === 'draft' ? null : (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Printer size={14} />}
                      onClick={() => {
                        if (!quote.items.length) {
                          pushToast('This quote has no openings to print.', 'danger')
                          return
                        }
                        const printPath = quote.status === 'booked' ? 'work-order' : 'quote'
                        navigate(`/quote/${quote.id}/print/${printPath}`, { state: { from: `/orders?status=${statusFilter}` } })
                      }}
                    >
                      Print
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={14} />}
                    disabled={quote.status === 'booked'}
                    title={quote.status === 'booked' ? 'Booked orders cannot be changed.' : undefined}
                    onClick={() => setPendingDelete(quote.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this quote?"
        description="It will be removed from your orders."
        confirmLabel="Delete quote"
        tone="danger"
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        onConfirm={() => {
          const id = pendingDelete
          setPendingDelete(null)
          if (!id) return
          void deleteQuote(id).then((ok) => {
            if (ok) pushToast('Quote deleted', 'info')
          })
        }}
      />
    </div>
  )
}
