import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import type { QuoteItem } from '../../domain/models.ts'
import { createQuoteItem } from '../../domain/factories.ts'
import { calculateItemPrice, calculateQuoteTotals } from '../../domain/pricing.ts'
import { validateCustomer, validateItem, clampPercent } from '../../domain/validation.ts'
import { LIMITS } from '../../data/pricingDefaults.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { createId } from '../../utils/ids.ts'
import { formatMoney } from '../../utils/money.ts'
import { Button } from '../../components/ui/Button.tsx'
import { StatusBadge } from '../../components/ui/Badge.tsx'
import { ConfirmDialog } from '../../components/ui/Dialog.tsx'
import { CustomerForm } from './CustomerForm.tsx'
import { OpeningForm } from './OpeningForm.tsx'
import { AppearanceForm } from './AppearanceForm.tsx'
import { TechnicalForm } from './TechnicalForm.tsx'
import { PreviewCard } from './PreviewCard.tsx'
import { PricingSetupDialog } from './PricingSetupDialog.tsx'
import { OrderList } from '../quote/OrderList.tsx'
import { TotalsCard } from '../quote/TotalsCard.tsx'

export function ConfiguratorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const hydrated = useAppStore((state) => state.hydrated)
  const quote = useAppStore((state) => state.quotes.find((entry) => entry.id === id))
  const pricingConfig = useAppStore((state) => state.pricingConfig)
  const updateQuote = useAppStore((state) => state.updateQuote)
  const addItem = useAppStore((state) => state.addItem)
  const updateItem = useAppStore((state) => state.updateItem)
  const removeItem = useAppStore((state) => state.removeItem)
  const duplicateItem = useAppStore((state) => state.duplicateItem)
  const setStatus = useAppStore((state) => state.setStatus)
  const pushToast = useAppStore((state) => state.pushToast)

  const [item, setItem] = useState<QuoteItem | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QuoteItem | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [ratesOpen, setRatesOpen] = useState(false)
  const booted = useRef(false)

  useEffect(() => {
    booted.current = false
  }, [id])

  useEffect(() => {
    if (!hydrated || !quote || booted.current) return
    booted.current = true
    setItem(quote.configDraft ?? createQuoteItem('window'))
    setEditingId(quote.editingItemId)
  }, [hydrated, quote])

  useEffect(() => {
    if (!booted.current || !id || !item) return
    updateQuote(id, { configDraft: item, editingItemId: editingId }, { touch: false })
  }, [item, editingId, id, updateQuote])

  if (!hydrated) return <p className="boot">Opening the workspace…</p>
  if (!quote) {
    return (
      <div className="empty">
        <p className="empty-title">This quote is not on this device</p>
        <Button onClick={() => navigate('/orders')}>Orders</Button>
      </div>
    )
  }
  if (!item) return <p className="boot">Preparing the opening…</p>

  const activeQuote = quote
  const draft = item
  const issues = validateItem(draft)
  const pricing = calculateItemPrice(draft, pricingConfig)
  const totals = calculateQuoteTotals(activeQuote, pricingConfig)

  function freshCopy(source: QuoteItem): QuoteItem {
    return {
      ...source,
      id: createId(),
      location: '',
      panels: source.panels.map((panel) => ({ ...panel, id: createId() })),
    }
  }

  function addOpening() {
    if (issues.length > 0) {
      pushToast(issues[0]?.message ?? 'Check the opening.', 'danger')
      return
    }
    addItem(activeQuote.id, draft)
    pushToast('Opening added to the order')
    setEditingId(null)
    setItem(freshCopy(draft))
  }

  function saveOpening() {
    if (!editingId) return
    if (issues.length > 0) {
      pushToast(issues[0]?.message ?? 'Check the opening.', 'danger')
      return
    }
    updateItem(activeQuote.id, { ...draft, id: editingId })
    pushToast('Opening updated')
    setEditingId(null)
    setItem(freshCopy(draft))
  }

  function quoteReady(action: string): boolean {
    if (activeQuote.items.length === 0) {
      pushToast(`Add an opening before you ${action}.`, 'danger')
      return false
    }
    const customerIssues = validateCustomer(activeQuote.customer)
    if (customerIssues[0]) {
      pushToast(customerIssues[0].message, 'danger')
      return false
    }
    return true
  }

  return (
    <div className="page quote-page">
      <div className="quote-bar">
        <div className="quote-identity">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/orders')}>
            Orders
          </Button>
          <div>
            <p className="eyebrow">Job {activeQuote.jobNo}</p>
            <h1>{activeQuote.customer.name.trim() || 'New quote'}</h1>
          </div>
          <StatusBadge status={activeQuote.status} />
        </div>
        <div className="quote-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              pushToast('Draft saved in this browser')
            }}
          >
            Save draft
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!quoteReady('mark it as quoted')) return
              setStatus(activeQuote.id, 'quoted')
              pushToast('Marked as quoted')
            }}
          >
            Mark quoted
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (!quoteReady('book it')) return
              setBookOpen(true)
            }}
          >
            Book order
          </Button>
          <Button variant="secondary" size="sm" icon={<Printer size={15} />} onClick={() => (activeQuote.items.length ? navigate(`/quote/${activeQuote.id}/print/quote`) : pushToast('Add an opening before printing.', 'danger'))}>
            Print quote
          </Button>
          <Button variant="secondary" size="sm" icon={<Printer size={15} />} onClick={() => (activeQuote.items.length ? navigate(`/quote/${activeQuote.id}/print/work-order`) : pushToast('Add an opening before printing.', 'danger'))}>
            Print work order
          </Button>
        </div>
      </div>

      <div className="config-layout">
        <div className="config-forms">
          <CustomerForm quote={activeQuote} onChange={(patch) => updateQuote(activeQuote.id, patch)} />
          <OpeningForm item={draft} onChange={setItem} />
          <AppearanceForm item={draft} onChange={setItem} />
          <TechnicalForm item={draft} onChange={setItem} />
        </div>
        <div className="preview-column">
          <div className="preview-sticky">
            <PreviewCard
              item={draft}
              pricing={pricing}
              issues={issues}
              editing={editingId !== null}
              onAdd={addOpening}
              onUpdate={saveOpening}
              onCancel={() => {
                setEditingId(null)
                setItem(createQuoteItem(draft.productType))
                pushToast('Edit cancelled', 'info')
              }}
            />
          </div>
        </div>
      </div>

      <section className="card order-card" aria-labelledby="order-heading">
        <div className="card-head">
          <h2 id="order-heading">Order</h2>
          <p>
            {activeQuote.items.length} {activeQuote.items.length === 1 ? 'opening' : 'openings'}
            {activeQuote.reference ? ` · ${activeQuote.reference}` : ''}
          </p>
        </div>
        <div className="order-layout">
          <OrderList
            items={activeQuote.items}
            pricingConfig={pricingConfig}
            editingId={editingId}
            onEdit={(entry) => {
              setItem(structuredClone(entry))
              setEditingId(entry.id)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onDuplicate={(itemId) => {
              duplicateItem(activeQuote.id, itemId)
              pushToast('Opening duplicated')
            }}
            onDelete={setDeleteTarget}
          />
          <TotalsCard
            quote={activeQuote}
            totals={totals}
            onDiscount={(value) => updateQuote(activeQuote.id, { discountPercent: clampPercent(value, LIMITS.discountMax) })}
            onTax={(value) => updateQuote(activeQuote.id, { taxPercent: clampPercent(value, LIMITS.taxMax) })}
          />
        </div>
      </section>

      <div className="page-links">
        <button type="button" className="text-link" onClick={() => setRatesOpen(true)}>
          Pricing setup
        </button>
        <span>Saved in this browser</span>
      </div>

      <div className="bottom-bar">
        <div>
          <strong>{formatMoney(pricing.lineTotal)}</strong>
          <span>{editingId ? 'Editing opening' : 'Current opening'}</span>
        </div>
        {editingId ? (
          <Button onClick={saveOpening} disabled={issues.length > 0}>
            Update opening
          </Button>
        ) : (
          <Button onClick={addOpening} disabled={issues.length > 0}>
            Add to order
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove this opening?"
        description={deleteTarget ? `${deleteTarget.location || 'This opening'} will be taken off the order.` : ''}
        confirmLabel="Delete opening"
        tone="danger"
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => {
          if (deleteTarget) {
            removeItem(activeQuote.id, deleteTarget.id)
            if (editingId === deleteTarget.id) {
              setEditingId(null)
              setItem(createQuoteItem('window'))
            }
            pushToast('Opening removed', 'info')
          }
          setDeleteTarget(null)
        }}
      />
      <ConfirmDialog
        open={bookOpen}
        title="Book this order?"
        description="The status becomes Booked and the date is stored on this device. You can still print the work order and the invoice."
        confirmLabel="Book order"
        onOpenChange={setBookOpen}
        onConfirm={() => {
          setStatus(activeQuote.id, 'booked')
          setBookOpen(false)
          pushToast('Order booked')
        }}
      />
      <PricingSetupDialog open={ratesOpen} onOpenChange={setRatesOpen} />
    </div>
  )
}
