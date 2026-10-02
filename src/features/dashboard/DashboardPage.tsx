import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Plus, Printer, Trash2 } from 'lucide-react'
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
  const createQuote = useAppStore((state) => state.createQuote)
  const duplicateQuote = useAppStore((state) => state.duplicateQuote)
  const deleteQuote = useAppStore((state) => state.deleteQuote)
  const pushToast = useAppStore((state) => state.pushToast)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...quotes]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((quote) => {
        if (!needle) return true
        const haystack = `${quote.customer.name} ${quote.reference} ${quote.jobNo} ${quote.status}`.toLowerCase()
        return haystack.includes(needle)
      })
  }, [quotes, query])

  const bookedValue = quotes
    .filter((quote) => quote.status === 'booked')
    .reduce((sum, quote) => sum + calculateQuoteTotals(quote, pricingConfig).grandTotal, 0)

  if (!hydrated) return <p className="boot">Opening the workspace…</p>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Sales workspace</p>
          <h1>Quotes & orders</h1>
          <p className="lede">Configure an opening with the customer, price it, and print the work order or the quote.</p>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => {
            const quote = createQuote()
            navigate(`/quote/${quote.id}`)
          }}
        >
          New quote
        </Button>
      </div>

      <div className="stat-row">
        <article>
          <span>Drafts</span>
          <strong>{quotes.filter((quote) => quote.status === 'draft').length}</strong>
        </article>
        <article>
          <span>Quoted</span>
          <strong>{quotes.filter((quote) => quote.status === 'quoted').length}</strong>
        </article>
        <article>
          <span>Booked value</span>
          <strong>{formatMoney(bookedValue)}</strong>
        </article>
      </div>

      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Search quotes</span>
          <input
            value={query}
            placeholder="Search customer, reference or job number"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {quotes.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No saved jobs yet</p>
          <p>Start a quote, add a window or door, and it will stay in this browser.</p>
          <Button
            onClick={() => {
              const quote = createQuote()
              navigate(`/quote/${quote.id}`)
            }}
          >
            New quote
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Nothing matches that search</p>
          <p>Try the customer name, the reference, or the job number.</p>
        </div>
      ) : (
        <ul className="job-grid">
          {visible.map((quote) => {
            const totals = calculateQuoteTotals(quote, pricingConfig)
            return (
              <li key={quote.id} className="job-card">
                <div className="job-top">
                  <StatusBadge status={quote.status} />
                  <span className="job-no">Job {quote.jobNo}</span>
                </div>
                <h2>{quote.customer.name.trim() || 'Unnamed customer'}</h2>
                <p className="job-ref">{quote.reference.trim() || 'No reference'}</p>
                <dl className="job-meta">
                  <div>
                    <dt>Openings</dt>
                    <dd>{quote.items.length}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{formatMoney(totals.grandTotal)}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatDateTime(quote.updatedAt)}</dd>
                  </div>
                </dl>
                <div className="job-actions">
                  <Button size="sm" onClick={() => navigate(`/quote/${quote.id}`)}>
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Copy size={15} />}
                    onClick={() => {
                      const copy = duplicateQuote(quote.id)
                      if (copy) {
                        pushToast('Quote duplicated')
                        navigate(`/quote/${copy.id}`)
                      }
                    }}
                  >
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Printer size={15} />}
                    onClick={() => (quote.items.length ? navigate(`/quote/${quote.id}/print/quote`) : pushToast('This quote has no openings to print.', 'danger'))}
                  >
                    Print
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => setPendingDelete(quote.id)}>
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
        description="It will be removed from this browser. This demo has no server copy."
        confirmLabel="Delete quote"
        tone="danger"
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        onConfirm={() => {
          if (pendingDelete) {
            deleteQuote(pendingDelete)
            pushToast('Quote deleted', 'info')
          }
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
