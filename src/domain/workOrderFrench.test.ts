import { describe, expect, it } from 'vitest'
import type { OpeningLayout, PanelKind } from './models.ts'
import { createQuoteItem, withLayout } from './factories.ts'
import { buildWorkOrder } from './workOrder.ts'
import { mirrorLayout } from './layout.ts'

// Expected figures are copied from the factory work orders for job 340 (French doors).
type Cells = [PanelKind, number][]
const layout = (split: 'cols' | 'rows', sections: [number, Cells][]): OpeningLayout => ({
  split,
  sections: sections.map(([sizeMm, cells], i) => ({
    id: `s${i}`,
    sizeMm,
    cells: cells.map(([kind, size], j) => ({ id: `c${i}-${j}`, sizeMm: size, kind })),
  })),
})

function workOrder(widthMm: number, heightMm: number, shape: OpeningLayout) {
  return buildWorkOrder(withLayout({ ...createQuoteItem('door'), widthMm, heightMm }, shape))
}

const rows = (data: ReturnType<typeof workOrder>, description: string) =>
  data.sections.filter((row) => row.description === description).map((row) => `${row.qty}×${row.length}`)
const accessory = (data: ReturnType<typeof workOrder>, name: string) => data.accessories.find((row) => row.item === name)?.qty

describe('French door work order', () => {
  it('matches page 1: the plain pair', () => {
    const data = workOrder(1200, 1800, layout('cols', [[1200, [['french-left', 1800]]]]))
    expect(rows(data, 'Door Sash T').sort()).toEqual(['4×1725', '4×559'])
    expect(rows(data, 'French Mullion')).toEqual(['1×1638'])
    expect(data.glass.map((row) => [row.width, row.length])).toEqual([
      [374, 1540],
      [374, 1540],
    ])
    expect(data.glass[0]?.reference).toContain('Clear Tuff Low E')
    expect(accessory(data, 'Gasket 01')).toBe('18.192')
    expect(accessory(data, 'Gasket 02')).toBe('7.656')
    expect(accessory(data, 'Flag Hinge White')).toBe('6')
    expect(accessory(data, 'L/H Keep Set')).toBe('1')
    expect(data.mainOptions.find((row) => row.label === 'Master Leaf')?.value).toBe('Left')
  })

  it('matches page 6: side light with unequal leaves', () => {
    const data = workOrder(2100, 1900, layout('cols', [[400, [['fixed', 1900]]], [1700, [['french-left', 1900]]]]))
    expect(rows(data, 'Door Sash T').sort()).toEqual(['2×821.5', '2×825.5', '4×1825'])
    expect(rows(data, '')).toEqual(['1×1909'])
    expect(accessory(data, 'Glazing Bridge Packer')).toBe('21')
  })

  it('matches page 22: side lights and four top lights, cut like the factory', () => {
    const data = workOrder(
      1800,
      2100,
      layout('rows', [
        [300, [['fixed', 300], ['fixed', 600], ['fixed', 600], ['fixed', 300]]],
        [1800, [['fixed', 300], ['french-left', 1200], ['fixed', 300]]],
      ]),
    )
    expect(rows(data, '').sort()).toEqual(['1×1275', '1×1805', '1×1807'])
    expect(rows(data, 'T Transom/Mullion').sort()).toEqual(['1×315', '1×317', '3×354'])
    expect(data.glass).toHaveLength(8)
  })

  it('flips the master leaf with the layout', () => {
    const shape = mirrorLayout(layout('cols', [[400, [['fixed', 1900]]], [1700, [['french-left', 1900]]]]))
    const data = workOrder(2100, 1900, shape)
    expect(data.mainOptions.find((row) => row.label === 'Master Leaf')?.value).toBe('Right')
    expect(accessory(data, 'R/H Keep Set')).toBe('1')
  })
})
