import { describe, expect, it } from 'vitest'
import type { OpeningLayout, PanelKind } from './models.ts'
import { createQuoteItem, layoutForPreset, withLayout } from './factories.ts'
import { buildWorkOrder } from './workOrder.ts'
import { mirrorLayout } from './layout.ts'
import { formatMm } from '../utils/money.ts'
import sheets from './fixtures/singleDoorWorkOrders.json'

// Every sheet of the factory work orders for job 341 (single doors), as printed.
type Sheet = {
  page: number
  name: string
  w: number
  h: number
  secs: [number, [PanelKind, number][]][]
  sections: string[]
  accessories: string[]
  glass: [number, number][]
}

const layoutOf = (secs: Sheet['secs']): OpeningLayout => ({
  split: 'cols',
  sections: secs.map(([sizeMm, cells], i) => ({
    id: `s${i}`,
    sizeMm,
    cells: cells.map(([kind, size], j) => ({ id: `c${i}-${j}`, sizeMm: size, kind })),
  })),
})

const door = (widthMm: number, heightMm: number, layout: OpeningLayout) =>
  buildWorkOrder(withLayout({ ...createQuoteItem('door'), widthMm, heightMm }, layout))

describe('single door work order', () => {
  for (const sheet of sheets as Sheet[]) {
    it(`matches page ${sheet.page}: ${sheet.name}`, () => {
      const data = door(sheet.w, sheet.h, layoutOf(sheet.secs))
      const sections = data.sections.map((row) =>
        [row.orientation, row.section, row.description, row.qty, formatMm(row.length), row.endPrep, row.reinforcing, row.reinforcingLength]
          .filter((part) => part !== '')
          .join(' '),
      )
      expect(sections).toEqual(sheet.sections)
      expect(data.accessories.map((row) => `${row.item} ${row.qty}`)).toEqual(sheet.accessories)
      expect(data.glass.map((row) => [row.width, row.length])).toEqual(sheet.glass)
      const option = (label: string) => data.mainOptions.find((row) => row.label === label)?.value
      expect(option('Sash Type')).toBe(sheet.secs.flatMap(([, cells]) => cells).some(([kind]) => kind === 'door-right') ? 'Door right hung' : 'Door left hung')
      expect(option('Opening Direction')).toBe('Open In')
    })
  }

  it('builds every single door layout at its sample size, and its flipped twin', () => {
    for (const id of ['single-door', 'single-door-side-light', 'single-door-two-side-lights-top-lights']) {
      const layout = layoutForPreset(id, 1400, 2100)
      const left = door(1400, 2100, layout)
      const right = door(1400, 2100, mirrorLayout(layout))
      expect(left.accessories.some((row) => row.item === 'L/H Keep Set')).toBe(true)
      expect(right.accessories.some((row) => row.item === 'R/H Keep Set')).toBe(true)
    }
  })
})
