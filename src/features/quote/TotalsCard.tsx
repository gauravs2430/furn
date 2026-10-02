import type { Quote, QuoteTotals } from '../../domain/models.ts'
import { LIMITS } from '../../data/pricingDefaults.ts'
import { formatMoney } from '../../utils/money.ts'
import { NumberField } from '../../components/ui/Field.tsx'

interface TotalsCardProps {
  quote: Quote
  totals: QuoteTotals
  onDiscount: (value: number) => void
  onTax: (value: number) => void
}

export function TotalsCard({ quote, totals, onDiscount, onTax }: TotalsCardProps) {
  return (
    <aside className="card totals-card">
      <h2>Order total</h2>
      <div className="total-row">
        <span>Subtotal</span>
        <span>{formatMoney(totals.subtotal)}</span>
      </div>
      <div className="total-row total-input">
        <NumberField
          label="Discount"
          suffix="%"
          value={quote.discountPercent}
          min={LIMITS.discountMin}
          max={LIMITS.discountMax}
          onChange={onDiscount}
        />
        <span>{formatMoney(totals.discountAmount)}</span>
      </div>
      <div className="total-row total-input">
        <NumberField label="VAT" suffix="%" value={quote.taxPercent} min={LIMITS.taxMin} max={LIMITS.taxMax} onChange={onTax} />
        <span>{formatMoney(totals.taxAmount)}</span>
      </div>
      <div className="total-grand">
        <span>Total</span>
        <strong>{formatMoney(totals.grandTotal)}</strong>
      </div>
    </aside>
  )
}
