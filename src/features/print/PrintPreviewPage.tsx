import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import type { Quote } from '../../domain/models.ts'
import { quoteRepository, useAppStore } from '../../store/useAppStore.ts'
import { Button } from '../../components/ui/Button.tsx'
import { WorkOrderDocument } from './WorkOrderPrint.tsx'
import { InvoiceDocument } from './InvoicePrint.tsx'

interface PrintPreviewPageProps {
  kind: 'work-order' | 'quote'
}

export function PrintPreviewPage({ kind }: PrintPreviewPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const hydrated = useAppStore((state) => state.hydrated)
  const stored = useAppStore((state) => state.quotes.find((entry) => entry.id === id))
  const pricingConfig = useAppStore((state) => state.pricingConfig)
  const [fetched, setFetched] = useState<{ id: string; quote: Quote | null } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [printedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    if (!hydrated || !id || stored) return
    let cancelled = false
    setFetched(null)
    void quoteRepository
      .read(id)
      .then((row) => {
        if (!cancelled) setFetched({ id, quote: row?.quote ?? null })
      })
      .catch(() => {
        if (!cancelled) setFetched({ id, quote: null })
      })
    return () => {
      cancelled = true
    }
  }, [hydrated, id, stored])

  const quote = stored ?? (fetched && fetched.id === id ? fetched.quote : null)
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: quote ? `${kind === 'work-order' ? 'Work Order' : 'Quotation'} ${quote.jobNo}` : 'Document',
  })

  if (!hydrated || (!stored && fetched?.id !== id)) return <p className="boot">Preparing the document…</p>
  if (!quote) {
    return (
      <div className="empty">
        <p className="empty-title">This quote is not on this device</p>
        <Button onClick={() => navigate('/orders')}>Orders</Button>
      </div>
    )
  }

  const title = kind === 'work-order' ? 'Work order' : quote.status === 'booked' ? 'Invoice' : 'Quotation'

  return (
    <div className="print-stage">
      <div className="print-toolbar no-print">
        <Button variant="ghost" onClick={() => navigate(`/quote/${quote.id}`)}>
          Back to quote
        </Button>
        <div>
          <p className="eyebrow">{title}</p>
          <strong>
            Job {quote.jobNo}
            {quote.customer.name ? ` · ${quote.customer.name}` : ''}
          </strong>
        </div>
        <Button onClick={() => handlePrint()}>Print / Save as PDF</Button>
      </div>
      <div ref={contentRef}>
        {kind === 'work-order' ? (
          <WorkOrderDocument quote={quote} printedAt={printedAt} />
        ) : (
          <InvoiceDocument quote={quote} pricingConfig={pricingConfig} />
        )}
      </div>
    </div>
  )
}
