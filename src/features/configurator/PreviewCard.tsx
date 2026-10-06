import { useState } from 'react'
import type { ItemPricing, QuoteItem } from '../../domain/models.ts'
import type { ValidationIssue } from '../../domain/validation.ts'
import { findColour, findGlazing, findMaterial, findProduct } from '../../domain/catalogue.ts'
import { isDrawingFamily, itemProductId } from '../../domain/models.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { describeConfiguration } from '../../domain/factories.ts'
import { formatMoney } from '../../utils/money.ts'
import { Button } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Dialog.tsx'
import { OpeningDrawing } from '../drawing/OpeningDrawing.tsx'

interface PreviewCardProps {
  item: QuoteItem
  pricing: ItemPricing
  issues: ValidationIssue[]
  editing: boolean
  onAdd: () => void
  onUpdate: () => void
  onCancel: () => void
}

export function PreviewCard({ item, pricing, issues, editing, onAdd, onUpdate, onCancel }: PreviewCardProps) {
  const catalogue = useAppStore((state) => state.catalogue)
  const [large, setLarge] = useState(false)
  const [partsOpen, setPartsOpen] = useState(false)
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
        <table className="parts-table">
          <tbody>
            {pricing.parts.map((part) => (
              <tr key={part.id}>
                <td>{part.name}</td>
                <td>
                  {part.quantity} {part.unit}
                </td>
                <td>{formatMoney(part.quantity * part.unitPrice)}</td>
              </tr>
            ))}
            <tr>
              <td>Parts cost</td>
              <td />
              <td>{formatMoney(pricing.partsCost)}</td>
            </tr>
          </tbody>
        </table>
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
    </aside>
  )
}
