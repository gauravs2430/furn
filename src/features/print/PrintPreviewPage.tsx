import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import { useAppStore } from '../../store/useAppStore.ts'
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
  const quote = useAppStore((state) => state.quotes.find((entry) => entry.id === id))
  const pricingConfig = useAppStore((state) => state.pricingConfig)
  const contentRef = useRef<HTMLDivElement>(null)
  const [printedAt] = useState(() => new Date().toISOString())
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: quote ? `${kind === 'work-order' ? 'Work Order' : 'Quotation'} ${quote.jobNo}` : 'Document',
  })

  if (!hydrated) return <p className="boot">Preparing the document…</p>
  if (!quote) {
    return (
      <div className="empty">
        <p className="empty-title">This quote is not on this device</p>
        <Button onClick={() => navigate('/')}>Back to dashboard</Button>
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
