import type { Quote } from '../../domain/models.ts'
import { isDrawingFamily, itemProductId } from '../../domain/models.ts'
import { findColour, findProduct } from '../../domain/catalogue.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { buildWorkOrder } from '../../domain/workOrder.ts'
import { formatMm } from '../../utils/money.ts'
import { formatPrintDate } from '../../utils/dates.ts'
import { OpeningDrawing } from '../drawing/OpeningDrawing.tsx'

export function WorkOrderDocument({ quote, printedAt }: { quote: Quote; printedAt: string }) {
  const catalogue = useAppStore((state) => state.catalogue)
  const printed = formatPrintDate(printedAt)
  return (
    <div className="print-stack">
      {quote.items.map((item, index) => {
        const data = buildWorkOrder(item)
        const colour = findColour(item.externalColourId, catalogue)
        const drawing = isDrawingFamily(item.productType) ? item.productType : null
        return (
          <article key={item.id} className="print-sheet">
            <h1 className="wo-banner">WORK ORDER</h1>
            <table className="wo-meta">
              <tbody>
                <tr>
                  <th>Customer</th>
                  <td>{quote.customer.name || '—'}</td>
                  <th>Input date</th>
                  <td>{formatPrintDate(quote.createdAt)}</td>
                </tr>
                <tr>
                  <th>Reference</th>
                  <td>{quote.reference || '—'}</td>
                  <th>Supply</th>
                  <td>{quote.supply}</td>
                </tr>
                <tr>
                  <th>Job No</th>
                  <td>{quote.jobNo}</td>
                  <th>Print date</th>
                  <td>
                    {printed} · Page {index + 1} of {quote.items.length}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="wo-top">
              <table className="wo-options">
                <caption>Main Options</caption>
                <tbody>
                  {data.mainOptions.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="wo-drawing">
                <p className="wo-drawing-caption">
                  {findProduct(itemProductId(item), catalogue).name}
                  {item.location ? ` · ${item.location}` : ''} · {item.widthMm} × {item.heightMm} mm
                </p>
                {drawing ? (
                  <OpeningDrawing
                    widthMm={item.widthMm}
                    heightMm={item.heightMm}
                    panels={item.panels}
                    frameColor={colour.hex}
                    finish={colour.finish}
                    showCill={item.technical.cill !== 'None'}
                    productType={drawing}
                  />
                ) : null}
              </div>
            </div>

            <table className="wo-grid">
              <caption>Sections Required</caption>
              <thead>
                <tr>
                  <th> </th>
                  <th> </th>
                  <th> </th>
                  <th>Qty</th>
                  <th>Length</th>
                  <th>End Prep</th>
                  <th>Reinforcing</th>
                  <th>Length</th>
                </tr>
              </thead>
              <tbody>
                {data.sections.map((row, rowIndex) => (
                  <tr key={`${row.section}-${rowIndex}`}>
                    <td>{row.orientation}</td>
                    <td>{row.section}</td>
                    <td>{row.description}</td>
                    <td className="num">{row.qty}</td>
                    <td className="num">{formatMm(row.length)}</td>
                    <td>{row.endPrep}</td>
                    <td>{row.reinforcing}</td>
                    <td className="num">{row.reinforcingLength}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="wo-grid">
              <caption>Accessories Required</caption>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit Of Measurement</th>
                </tr>
              </thead>
              <tbody>
                {data.accessories.map((row) => (
                  <tr key={row.item}>
                    <td>{row.item}</td>
                    <td className="num">{row.qty}</td>
                    <td>{row.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="wo-grid">
              <caption>Glass Required</caption>
              <thead>
                <tr>
                  <th>Glass</th>
                  <th>Qty</th>
                  <th>Width</th>
                  <th>Length</th>
                </tr>
              </thead>
              <tbody>
                {data.glass.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No glass on this opening.</td>
                  </tr>
                ) : (
                  data.glass.map((row) => (
                    <tr key={row.reference}>
                      <td>{row.reference}</td>
                      <td className="num">{row.qty}</td>
                      <td className="num">{row.width}</td>
                      <td className="num">{row.length}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </article>
        )
      })}
    </div>
  )
}
