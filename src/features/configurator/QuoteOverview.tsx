import { Pencil } from 'lucide-react'
import type { Quote, QuoteTotals } from '../../domain/models.ts'
import { Button } from '../../components/ui/Button.tsx'
import { formatMoney } from '../../utils/money.ts'
import { formatDate } from '../../utils/dates.ts'

interface QuoteOverviewProps {
  quote: Quote
  totals: QuoteTotals
  quotedBy: string
  onEditCustomer: () => void
  onEditProducts: () => void
}

function NoteCard({ title }: { title: string }) {
  return (
    <section className="quote-note-card" aria-label={title}>
      <div className="quote-note-head">
        <h2>{title}</h2>
        <button className="quote-note-edit" type="button" aria-label={`Edit ${title}`}>
          <Pencil size={15} />
        </button>
      </div>
    </section>
  )
}

export function QuoteOverview({ quote, totals, quotedBy, onEditCustomer, onEditProducts }: QuoteOverviewProps) {
  const hasCustomer = Boolean(quote.customer.name.trim())

  return (
    <div className="page quote-overview-page">
      <button className="quote-customer-strip" type="button" onClick={onEditCustomer}>
        <span>
          <strong>{hasCustomer ? quote.customer.name : 'No customer'}</strong>
          <span>{hasCustomer ? 'Click to edit details' : 'Click to add details'}</span>
        </span>
        <Pencil size={17} aria-hidden="true" />
      </button>

      <div className="quote-summary-grid">
        <section className="quote-summary-card">
          <h2>Quote details</h2>
          <dl className="quote-detail-list">
            <div>
              <dt>Quote number</dt>
              <dd>{quote.jobNo}</dd>
            </div>
            <div>
              <dt>Created at</dt>
              <dd>{formatDate(quote.createdAt)}</dd>
            </div>
            <div>
              <dt>Fitting</dt>
              <dd>{quote.supply}</dd>
            </div>
            <div>
              <dt>Quoted by</dt>
              <dd>{quotedBy}</dd>
            </div>
          </dl>
        </section>

        <section className="quote-summary-card">
          <h2>Cost</h2>
          <dl className="quote-detail-list quote-cost-list">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(totals.subtotal)}</dd>
            </div>
          </dl>
        </section>

        <section className="quote-summary-card">
          <h2>Price</h2>
          <dl className="quote-detail-list quote-price-list">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(totals.subtotal - totals.discountAmount)}</dd>
            </div>
            <div>
              <dt>VAT</dt>
              <dd>{formatMoney(totals.taxAmount)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatMoney(totals.grandTotal)}</dd>
            </div>
          </dl>
          <Button className="quote-price-button">Adjust price</Button>
        </section>
      </div>

      <div className="quote-notes-grid">
        <NoteCard title="Customer notes" />
        <NoteCard title="Internal notes" />
        <NoteCard title="Supplier notes" />
      </div>

      <section className="quote-products-placeholder" aria-labelledby="quote-products-heading">
        <h2 id="quote-products-heading">Products</h2>
        <Button onClick={onEditProducts}>Edit products</Button>
      </section>
    </div>
  )
}
