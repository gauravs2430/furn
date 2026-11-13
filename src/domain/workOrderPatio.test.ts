import { describe, expect, it } from 'vitest'
import type { OpeningLayout, PanelKind } from './models.ts'
import { createQuoteItem, withLayout } from './factories.ts'
import { buildWorkOrder } from './workOrder.ts'
import { formatMm } from '../utils/money.ts'
import sheets from './fixtures/patioWorkOrders.json'

// Every sheet of the factory work orders for job 316 (sliding patio doors), as printed.
type Sheet = {
  page: number
  name: string
  w: number
  h: number
  kinds: PanelKind[]
  options: string[]
  sections: string[]
  accessories: string[]
  glass: [number, number][]
}

const panes = (width: number, height: number, kinds: PanelKind[]): OpeningLayout => ({
  split: 'cols',
  sections: kinds.map((kind, i) => ({ id: `s${i}`, sizeMm: width / kinds.length, cells: [{ id: `c${i}`, sizeMm: height, kind }] })),
})

const patio = (width: number, height: number, kinds: PanelKind[]) =>
  buildWorkOrder(withLayout({ ...createQuoteItem('patio'), widthMm: width, heightMm: height }, panes(width, height, kinds)))

describe('sliding patio work order', () => {
  for (const sheet of sheets as Sheet[]) {
    it(`matches page ${sheet.page}: ${sheet.name}`, () => {
      const data = patio(sheet.w, sheet.h, sheet.kinds)
      const sections = data.sections.map((row) =>
        [row.orientation, row.section, row.description, row.qty, formatMm(row.length), row.endPrep, row.reinforcing, row.reinforcingLength]
          .filter((part) => part !== '')
          .join(' '),
      )
      expect(sections).toEqual(sheet.sections)
      expect(data.accessories.map((row) => `${row.item} ${row.qty} ${row.unit}`)).toEqual(sheet.accessories)
      expect(data.glass.map((row) => [row.width, row.length])).toEqual(sheet.glass)
      // The first colour line sits on the label line of the extracted text.
      expect(data.mainOptions.slice(1).map((row) => row.value)).toEqual(sheet.options)
    })
  }

  it('cuts unequal panels from their own widths', () => {
    const layout: OpeningLayout = {
      split: 'cols',
      sections: [
        { id: 'a', sizeMm: 1000, cells: [{ id: 'a1', sizeMm: 2100, kind: 'fixed' }] },
        { id: 'b', sizeMm: 1400, cells: [{ id: 'b1', sizeMm: 2100, kind: 'slide-left' }] },
      ],
    }
    const data = buildWorkOrder(withLayout({ ...createQuoteItem('patio'), widthMm: 2400, heightMm: 2100 }, layout))
    const across = data.sections.filter((row) => row.section === 'Sash' && row.orientation === 'Hor').map((row) => row.length)
    expect(across.sort()).toEqual([1007, 1407])
  })
})
