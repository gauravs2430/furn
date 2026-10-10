import { useState } from 'react'
import type { CatalogPart } from '../../domain/catalogue.ts'
import type { ItemPricing, PartLine, QuoteItem } from '../../domain/models.ts'
import type { ValidationIssue } from '../../domain/validation.ts'
import { findColour, findGlazing, findMaterial, findProduct } from '../../domain/catalogue.ts'
import { isDrawingFamily, itemProductId } from '../../domain/models.ts'
import { addPartToItem, partUnitPrice, removePartFromItem } from '../../domain/parts.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { describeConfiguration } from '../../domain/factories.ts'
import { formatMoney } from '../../utils/money.ts'
import { Button } from '../../components/ui/Button.tsx'
import { NumberField } from '../../components/ui/Field.tsx'
import { ConfirmDialog, Modal } from '../../components/ui/Dialog.tsx'
import { OpeningDrawing } from '../drawing/OpeningDrawing.tsx'
import { matchesQuery } from '../admin/filters.ts'

interface PreviewCardProps {
  item: QuoteItem
  pricing: ItemPricing
  issues: ValidationIssue[]
  editing: boolean
  onChange: (item: QuoteItem) => void
  onAdd: () => void
  onUpdate: () => void
  onCancel: () => void
}

export function PreviewCard({ item, pricing, issues, editing, onChange, onAdd, onUpdate, onCancel }: PreviewCardProps) {
  const catalogue = useAppStore((state) => state.catalogue)
  const markupPercent = useAppStore((state) => state.pricingConfig.markupPercent)
  const [large, setLarge] = useState(false)
  const [partsOpen, setPartsOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<PartLine | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [fixedPartId, setFixedPartId] = useState<string | null>(null)
  const [fixedQty, setFixedQty] = useState(1)
  const colour = findColour(item.externalColourId, catalogue)
  const product = findProduct(itemProductId(item), catalogue)
  const drawing = isDrawingFamily(item.productType) ? item.productType : null
  const blocked = issues.length > 0

  return (
    <aside className="card preview-card">
      <div className="preview-kicker">
        <span>{product.name}</span>
        <span>{drawing ? describeConfiguration(item.panels) : 'Accessory'}</span>
      </div>
      <p className="preview-size">
        {item.widthMm} × {item.heightMm} <span>mm</span>
      </p>
      <p className="preview-price" aria-live="polite">
        {formatMoney(pricing.unitPrice)}
        <small>each · {pricing.areaM2.toFixed(2)} m² · line {formatMoney(pricing.lineTotal)}</small>
      </p>
      {issues[0] ? (
        <p className="form-error" role="alert">
          {issues[0].message}
        </p>
      ) : null}
      {drawing ? (
        <div className="preview-sheet">
          <OpeningDrawing
            widthMm={item.widthMm}
            heightMm={item.heightMm}
            panels={item.panels}
            frameColor={colour.hex}
            finish={colour.finish}
            showCill={item.technical.cill !== 'None'}
            productType={drawing}
            title={`${product.name}, ${item.widthMm} by ${item.heightMm} millimetres`}
          />
        </div>
      ) : null}
      <div className="preview-actions">
        {editing ? (
          <>
            <Button onClick={onUpdate} disabled={blocked}>
              Update opening
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              Cancel edit
            </Button>
          </>
        ) : (
          <Button onClick={onAdd} disabled={blocked}>
            Add to order
          </Button>
        )}
        {drawing ? (
          <Button variant="secondary" onClick={() => setLarge(true)}>
            Enlarge drawing
          </Button>
        ) : null}
      </div>
      <ul className="spec-chips">
        <li>{findMaterial(item.materialId, catalogue).name}</li>
        <li>{findGlazing(item.glazingId, catalogue).name}</li>
        <li>{colour.name}</li>
        <li>Qty {item.quantity}</li>
      </ul>
      <button type="button" className="text-link" aria-expanded={partsOpen} onClick={() => setPartsOpen((open) => !open)}>
        {partsOpen ? 'Hide price build-up' : 'How this price is built'}
      </button>
      {partsOpen ? (
        <div className="parts-build">
          <div className="parts-scroll">
            <table className="parts-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Amount</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pricing.parts.map((part) => (
                  <tr key={part.id}>
                    <td>{part.name}</td>
                    <td className="num">{part.quantity}</td>
                    <td>{part.unit}</td>
                    <td className="num">{formatMoney(part.unitPrice)}</td>
                    <td className="num">{formatMoney(part.quantity * part.unitPrice)}</td>
                    <td className="part-action">
                      <Button size="sm" variant="danger" onClick={() => setPendingRemove(part)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tbody className="parts-summary">
                <tr>
                  <td colSpan={4}>Parts cost</td>
                  <td className="num">{formatMoney(pricing.partsCost)}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={4}>Markup</td>
                  <td className="num">{markupPercent}%</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={4}>Price for one</td>
                  <td className="num">{formatMoney(pricing.unitPrice)}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={4}>Opening quantity</td>
                  <td className="num">{item.quantity}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={4}>Line total</td>
                  <td className="num">{formatMoney(pricing.lineTotal)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <div className="parts-add">
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
              Add from inventory
            </Button>
          </div>
        </div>
      ) : null}
      {drawing ? (
        <Modal open={large} title="Technical drawing" onOpenChange={setLarge}>
          <div className="enlarge-sheet">
            <OpeningDrawing
              widthMm={item.widthMm}
              heightMm={item.heightMm}
              panels={item.panels}
              frameColor={colour.hex}
              finish={colour.finish}
              showCill={item.technical.cill !== 'None'}
              productType={drawing}
            />
          </div>
        </Modal>
      ) : null}
      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove this part?"
        description={pendingRemove ? `${pendingRemove.name} will be left off this opening. It stays in the catalogue.` : ''}
        confirmLabel="Remove part"
        tone="danger"
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
        onConfirm={() => {
          if (!pendingRemove) return
          onChange(removePartFromItem(item, pendingRemove.id))
          setPendingRemove(null)
        }}
      />
      <Modal
        open={addOpen}
        title="Add from inventory"
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) {
            setQuery('')
            setFixedPartId(null)
            setFixedQty(1)
          }
        }}
      >
        <InventoryPicker
          item={item}
          onBill={new Set(pricing.parts.map((part) => part.id))}
          query={query}
          onQuery={setQuery}
          fixedPartId={fixedPartId}
          fixedQty={fixedQty}
          onFixedQty={setFixedQty}
          onChoose={(part) => {
            if (part.quantityRule === 'fixed') {
              setFixedPartId(part.id)
              setFixedQty(1)
              return
            }
            onChange(addPartToItem(item, part, 1, catalogue))
            setAddOpen(false)
            setQuery('')
          }}
          onAddFixed={(part) => {
            onChange(addPartToItem(item, part, fixedQty, catalogue))
            setAddOpen(false)
            setQuery('')
            setFixedPartId(null)
            setFixedQty(1)
          }}
        />
      </Modal>
    </aside>
  )
}

function InventoryPicker({
  item,
  onBill,
  query,
  onQuery,
  fixedPartId,
  fixedQty,
  onFixedQty,
  onChoose,
  onAddFixed,
}: {
  item: QuoteItem
  onBill: Set<string>
  query: string
  onQuery: (value: string) => void
  fixedPartId: string | null
  fixedQty: number
  onFixedQty: (value: number) => void
  onChoose: (part: CatalogPart) => void
  onAddFixed: (part: CatalogPart) => void
}) {
  const catalogue = useAppStore((state) => state.catalogue)
  const productId = itemProductId(item)
  const choices = catalogue.parts
    .filter((part) => part.active && !onBill.has(part.id))
    .filter((part) => matchesQuery(query, part.name))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
  const searching = query.trim().length > 0

  return (
    <div>
      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Search parts</span>
          <input
            value={query}
            placeholder="Search parts"
            autoComplete="off"
            onChange={(event) => onQuery(event.target.value)}
          />
        </label>
      </div>
      {choices.length === 0 ? (
        <p>{searching ? 'Nothing matches that search.' : 'No other parts to add.'}</p>
      ) : (
        <ul className="catalog-attach">
          {choices.map((part) => {
            const link = catalogue.links.find((entry) => entry.productId === productId && entry.partId === part.id)
            const product = catalogue.products.find((entry) => entry.id === productId)
            const price = partUnitPrice(
              part,
              link?.priceOverride ?? null,
              catalogue.materials.find((entry) => entry.id === item.materialId)?.factor ?? 1,
              product?.factor ?? 1,
              catalogue.glazing.find((entry) => entry.id === item.glazingId)?.addonPerM2 ?? 0,
            )
            return (
              <li key={part.id}>
                <span>
                  {part.name} · {part.unit} · {formatMoney(price)}
                </span>
                {part.quantityRule === 'fixed' && fixedPartId === part.id ? (
                  <div className="fixed-qty">
                    <NumberField label="Quantity" value={fixedQty} min={0} onChange={onFixedQty} />
                    <Button size="sm" onClick={() => onAddFixed(part)}>
                      Add part
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => onChoose(part)}>
                    Add
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
