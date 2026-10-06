import { Copy, Pencil, Trash2 } from 'lucide-react'
import type { PricingConfig, QuoteItem } from '../../domain/models.ts'
import { findColour, findGlazing, findMaterial, findProduct } from '../../data/productCatalog.ts'
import { describeConfiguration } from '../../domain/factories.ts'
import { calculateItemPrice } from '../../domain/pricing.ts'
import { formatMoney } from '../../utils/money.ts'
import { Button } from '../../components/ui/Button.tsx'
import { OpeningDrawing } from '../drawing/OpeningDrawing.tsx'

interface OrderListProps {
  items: QuoteItem[]
  pricingConfig: PricingConfig
  editingId: string | null
  onEdit: (item: QuoteItem) => void
  onDuplicate: (id: string) => void
  onDelete: (item: QuoteItem) => void
}

export function OrderList({ items, pricingConfig, editingId, onEdit, onDuplicate, onDelete }: OrderListProps) {
  if (items.length === 0) {
    return (
      <div className="empty">
        <p>No openings on this order yet.</p>
      </div>
    )
  }

  return (
    <ul className="order-list">
      {items.map((item, index) => {
        const price = calculateItemPrice(item, pricingConfig)
        const colour = findColour(item.externalColourId)
        return (
          <li key={item.id} className={editingId === item.id ? 'order-item is-editing' : 'order-item'}>
            <div className="order-thumb">
              <OpeningDrawing
                widthMm={item.widthMm}
                heightMm={item.heightMm}
                panels={item.panels}
                frameColor={colour.hex}
                finish={colour.finish}
                showDimensions={false}
                showCill={item.technical.cill !== 'None'}
                productType={item.productType}
              />
            </div>
            <div className="order-copy">
              <p className="order-location">{item.location.trim() || 'No location'}</p>
              <p className="order-title">
                {index + 1}. {findProduct(item.productType).name}
                <span> · {describeConfiguration(item.panels)}</span>
              </p>
              <p className="order-spec">
                {item.widthMm} × {item.heightMm} mm · Qty {item.quantity} · {findMaterial(item.materialId).name} ·{' '}
                {findGlazing(item.glazingId).name} · {colour.name}
              </p>
              {item.notes ? <p className="order-notes">{item.notes}</p> : null}
            </div>
            <div className="order-money">
              <span>{formatMoney(price.unitPrice)} each</span>
              <strong>{formatMoney(price.lineTotal)}</strong>
            </div>
            <div className="order-actions">
              <Button size="sm" variant="secondary" icon={<Pencil size={15} />} onClick={() => onEdit(item)}>
                Edit
              </Button>
              <Button size="sm" variant="secondary" icon={<Copy size={15} />} onClick={() => onDuplicate(item.id)}>
                Duplicate
              </Button>
              <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => onDelete(item)}>
                Delete
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
