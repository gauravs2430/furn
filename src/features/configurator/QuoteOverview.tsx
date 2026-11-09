import { useState } from 'react'
import { Pencil } from 'lucide-react'
import type { Quote, QuoteTotals } from '../../domain/models.ts'
import { Button } from '../../components/ui/Button.tsx'
import { formatMoney } from '../../utils/money.ts'
import { formatDate } from '../../utils/dates.ts'
import { NoteEditDialog, type NoteType } from './NoteEditDialog.tsx'
import { useAppStore } from '../../store/useAppStore.ts'

export interface QuoteOverviewProps {
  quote: Quote
  totals: QuoteTotals
  quotedBy: string
  onEditCustomer: () => void
  onEditProducts: () => void
  onSaveNotes?: (patch: Partial<Quote>) => Promise<boolean>
}

interface NoteCardProps {
  title: string
  content?: string
  onEdit: () => void
}

function NoteCard({ title, content, onEdit }: NoteCardProps) {
  return (
    <section className="quote-note-card" aria-label={title}>
      <div className="quote-note-head">
        <h2>{title}</h2>
        <button
          className="quote-note-edit"
          type="button"
          aria-label={`Edit ${title}`}
          onClick={onEdit}
        >
          <Pencil size={15} />
        </button>
      </div>
      {content?.trim() ? (
        <div className="quote-note-body">
          <p>{content}</p>
        </div>
      ) : null}
    </section>
  )
}

export function QuoteOverview({ quote, totals, quotedBy, onEditCustomer, onEditProducts, onSaveNotes }: QuoteOverviewProps) {
  const [activeNoteType, setActiveNoteType] = useState<NoteType | null>(null)
  const storeUpdateQuote = useAppStore((state) => state.updateQuote)
  const pushToast = useAppStore((state) => state.pushToast)

  async function handleSaveNote(type: NoteType, noteValue: string) {
    const patch = { [type]: noteValue }
    if (onSaveNotes) {
      return await onSaveNotes(patch)
    }
    const saved = await storeUpdateQuote(quote.id, patch)
    if (saved) pushToast('Notes saved', 'success')
    return saved
  }

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
        <NoteCard
          title="Customer notes"
          content={quote.customerNotes}
          onEdit={() => setActiveNoteType('customerNotes')}
        />
        <NoteCard
          title="Internal notes"
          content={quote.internalNotes}
          onEdit={() => setActiveNoteType('internalNotes')}
        />
        <NoteCard
          title="Supplier notes"
          content={quote.supplierNotes}
          onEdit={() => setActiveNoteType('supplierNotes')}
        />
      </div>

      <NoteEditDialog
        open={activeNoteType !== null}
        noteType={activeNoteType}
        currentValue={activeNoteType ? (quote[activeNoteType] ?? '') : ''}
        onOpenChange={(open) => {
          if (!open) setActiveNoteType(null)
        }}
        onSave={handleSaveNote}
      />

      <section className="quote-products-placeholder" aria-labelledby="quote-products-heading">
        <h2 id="quote-products-heading">Products</h2>
        <Button onClick={onEditProducts}>Edit products</Button>
      </section>
    </div>
  )
}
