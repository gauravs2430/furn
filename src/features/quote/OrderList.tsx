import { useState } from 'react'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import type { PricingConfig, QuoteItem } from '../../domain/models.ts'
import { isDrawingFamily, itemProductId } from '../../domain/models.ts'
import { findColour, findGlazing, findMaterial, findProduct } from '../../domain/catalogue.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { describeConfiguration } from '../../domain/factories.ts'
import { calculateItemPrice } from '../../domain/pricing.ts'
import { formatMoney } from '../../utils/money.ts'
import { Button } from '../../components/ui/Button.tsx'
import { OpeningDrawing } from '../drawing/OpeningDrawing.tsx'
import { matchesQuery } from '../admin/filters.ts'

interface OrderListProps {
  items: QuoteItem[]
  pricingConfig: PricingConfig
  editingId: string | null
  onEdit: (item: QuoteItem) => void
  onDuplicate: (id: string) => void
  onDelete: (item: QuoteItem) => void
}

export function OrderList({ items, pricingConfig, editingId, onEdit, onDuplicate, onDelete }: OrderListProps) {
  const catalogue = useAppStore((state) => state.catalogue)
  const [query, setQuery] = useState('')
  const showSearch = items.length > 1
  if (!showSearch && query) setQuery('')

  if (items.length === 0) {
    return (
      <div className="empty">
        <p>No openings on this order yet.</p>
      </div>
    )
  }

  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => matchesQuery(showSearch ? query : '', item.location, findProduct(itemProductId(item), catalogue).name))

  return (
    <div>
      {showSearch ? (
        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Search openings</span>
            <input
              value={query}
              placeholder="Search location or product"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      ) : null}
      {visible.length === 0 ? (
        <div className="empty">
          <p>Nothing matches that search.</p>
        </div>
      ) : (
        <ul className="order-list">
          {visible.map(({ item, index }) => {
            const price = calculateItemPrice(item, pricingConfig, catalogue)
            const colour = findColour(item.externalColourId, catalogue)
            const drawing = isDrawingFamily(item.productType) ? item.productType : null
            return (
              <li key={item.id} className={editingId === item.id ? 'order-item is-editing' : 'order-item'}>
                <div className="order-thumb">
                  {drawing ? (
                    <OpeningDrawing
                      widthMm={item.widthMm}
                      heightMm={item.heightMm}
                      panels={item.panels}
                      frameColor={colour.hex}
                      finish={colour.finish}
                      showDimensions={false}
                      showCill={item.technical.cill !== 'None'}
                      productType={drawing}
                    />
                  ) : null}
                </div>
                <div className="order-copy">
                  <p className="order-location">{item.location.trim() || 'No location'}</p>
                  <p className="order-title">
                    {index + 1}. {findProduct(itemProductId(item), catalogue).name}
                    <span> · {drawing ? describeConfiguration(item.panels) : 'Accessory'}</span>
                  </p>
                  <p className="order-spec">
                    {item.widthMm} × {item.heightMm} mm · Qty {item.quantity} · {findMaterial(item.materialId, catalogue).name} ·{' '}
                    {findGlazing(item.glazingId, catalogue).name} · {colour.name}
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
      )}
    </div>
  )
}
