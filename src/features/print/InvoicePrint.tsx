import type { PricingConfig, Quote } from '../../domain/models.ts'
import { isDrawingFamily, itemProductId } from '../../domain/models.ts'
import { company } from '../../data/company.ts'
import { findColour, findGlazing, findMaterial, findProduct } from '../../domain/catalogue.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { describeConfiguration } from '../../domain/factories.ts'
import { calculateItemPrice, calculateQuoteTotals } from '../../domain/pricing.ts'
import { formatMoney } from '../../utils/money.ts'
import { formatPrintDate } from '../../utils/dates.ts'
import { OpeningDrawing } from '../drawing/OpeningDrawing.tsx'

export function InvoiceDocument({ quote, pricingConfig }: { quote: Quote; pricingConfig: PricingConfig }) {
  const catalogue = useAppStore((state) => state.catalogue)
  const totals = calculateQuoteTotals(quote, pricingConfig, catalogue)
  const booked = quote.status === 'booked'
  const title = booked ? 'BOOKING' : 'QUOTATION'
  const address = quote.customer.address.split('\n').filter(Boolean)

  return (
    <article className="print-sheet invoice-sheet">
      <header className="inv-head">
        <div>
          <p className="inv-brand">{company.name}</p>
          <p className="inv-tag">{company.tagline}</p>
          {company.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>
            {company.phone} · {company.email}
          </p>
        </div>
        <div className="inv-title-block">
          <h1>{title}</h1>
          <p>No. {quote.jobNo}</p>
          <p>{formatPrintDate(quote.updatedAt)}</p>
          <p>{quote.supply}</p>
        </div>
      </header>

      <div className="inv-parties">
        <div>
          <h2>Customer</h2>
          <p>{quote.customer.name || '—'}</p>
          {quote.customer.phone ? <p>{quote.customer.phone}</p> : null}
          {quote.customer.email ? <p>{quote.customer.email}</p> : null}
        </div>
        <div>
          <h2>Site</h2>
          {address.length > 0 ? address.map((line) => <p key={line}>{line}</p>) : <p>—</p>}
          <p>Reference: {quote.reference || '—'}</p>
        </div>
        <div>
          <h2>Prepared by</h2>
          <p>{quote.customer.salesperson.trim() || 'Sales consultant'}</p>
          {quote.requestedDate ? <p>Requested {formatPrintDate(quote.requestedDate)}</p> : null}
          {quote.bookedAt ? <p>Booked {formatPrintDate(quote.bookedAt)}</p> : null}
        </div>
      </div>

      <table className="inv-table">
        <thead>
          <tr>
            <th>Opening</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Line</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, index) => {
            const price = calculateItemPrice(item, pricingConfig, catalogue)
            const colour = findColour(item.externalColourId, catalogue)
            const drawing = isDrawingFamily(item.productType) ? item.productType : null
            return (
              <tr key={item.id} className="avoid-break">
                <td>
                  <div className="inv-thumb">
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
                </td>
                <td>
                  <strong>
                    {index + 1}. {item.location.trim() || 'Opening'} — {findProduct(itemProductId(item), catalogue).name}
                  </strong>
                  <p>
                    {drawing ? describeConfiguration(item.panels) : 'Accessory'} · {item.widthMm} × {item.heightMm} mm
                  </p>
                  <p>
                    {findMaterial(item.materialId, catalogue).name} · {findGlazing(item.glazingId, catalogue).name} · {colour.name} outside /{' '}
                    {findColour(item.internalColourId, catalogue).name} inside
                  </p>
                  <p>
                    {item.technical.glassType} · {item.technical.gasFill}
                  </p>
                  {item.notes ? <p>{item.notes}</p> : null}
                </td>
                <td className="num">{item.quantity}</td>
                <td className="num">{formatMoney(price.unitPrice)}</td>
                <td className="num">{formatMoney(price.lineTotal)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="inv-totals">
        <div>
          <span>Subtotal</span>
          <span>{formatMoney(totals.subtotal)}</span>
        </div>
        <div>
          <span>Discount {totals.discountPercent}%</span>
          <span>{formatMoney(totals.discountAmount)}</span>
        </div>
        <div>
          <span>VAT {totals.taxPercent}%</span>
          <span>{formatMoney(totals.taxAmount)}</span>
        </div>
        <div className="inv-grand">
          <span>Total</span>
          <strong>{formatMoney(totals.grandTotal)}</strong>
        </div>
      </div>

      <footer className="inv-foot">
        <p>{booked ? 'This order is booked.' : company.terms}</p>
      </footer>
    </article>
  )
}
