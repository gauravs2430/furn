import { describe, expect, it } from 'vitest'
import type { OpeningLayout, PanelKind } from './models.ts'
import { createQuoteItem, withLayout } from './factories.ts'
import { buildWorkOrder } from './workOrder.ts'
import { espagSize, hingeSize, usesLayoutEngine } from './workOrderLayout.ts'

// Expected figures are copied from the factory work orders for job 347.
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
  const item = withLayout({ ...createQuoteItem('window'), widthMm, heightMm }, shape)
  item.technical = { ...item.technical, cill: 'None' }
  return buildWorkOrder(item)
}

const accessory = (data: ReturnType<typeof workOrder>, name: string) => data.accessories.find((row) => row.item === name)?.qty

describe('window work order from the layout', () => {
  it('matches page 1: side-hung top light over fixed', () => {
    const data = workOrder(700, 1600, layout('cols', [[700, [['casement-right', 400], ['fixed', 1200]]]]))
    expect(data.glass.map((row) => [row.width, row.length])).toEqual([
      [492, 226],
      [594, 1128],
    ])
    expect(data.sections.find((row) => row.description === 'Chasement Z Sash')?.length).toBe(703)
    const frames = data.sections.filter((row) => row.section === 'Frame' && row.description === 'Frame 6 Chamber')
    expect(frames.map((row) => `${row.qty}×${row.length}`).sort()).toEqual(['2×1205', '2×405', '2×705'])
    expect(accessory(data, 'Gasket 02')).toBe('4.882')
    expect(accessory(data, 'Gasket 01')).toBe('3.898')
    expect(accessory(data, 'Glazing Bridge Packer')).toBe('13')
    expect(accessory(data, '200mm Espagnolette')).toBe('1')
    expect(accessory(data, '16” Friction Hinge')).toBe('1')
  })

  it('matches page 16: top hung and fixed top lights over a fixed light', () => {
    const data = workOrder(1200, 1100, layout('rows', [[450, [['top-hung', 600], ['fixed', 600]]], [650, [['fixed', 1200]]]]))
    const bars = data.sections.filter((row) => row.description.startsWith('Chasement'))
    expect(bars.map((row) => `${row.description} ${row.length} ${row.reinforcingLength}`).sort()).toEqual([
      'Chasement T Sash 604 1064',
      'Chasement Z Sash 487.5 ',
      'Chasement Z Sash 604 1064',
    ])
    expect(data.glass.map((row) => [row.width, row.length])).toEqual([
      [426, 276],
      [528, 378],
      [1094, 578],
    ])
    expect(accessory(data, 'Gasket 02')).toBe('6.565')
    expect(accessory(data, '10” Friction Hinge')).toBe('1')
  })

  it('matches page 36: five columns with opening top lights', () => {
    const data = workOrder(
      2000,
      1200,
      layout('cols', [
        [500, [['top-hung', 450], ['casement-left', 750]]],
        [300, [['fixed', 450], ['fixed', 750]]],
        [500, [['top-hung', 450], ['top-hung', 750]]],
        [200, [['fixed', 450], ['fixed', 750]]],
        [500, [['top-hung', 450], ['casement-right', 750]]],
      ]),
    )
    expect(data.glass).toHaveLength(10)
    expect(data.sections.find((row) => row.description === 'Chasement Z Sash')?.qty).toBe(4)
    expect(accessory(data, 'Mushroom Striker')).toBe('12')
    expect(accessory(data, 'Run Up Block')).toBe('10')
    expect(accessory(data, 'Glazing Bridge Packer')).toBe('68')
    expect(accessory(data, 'Gasket 01')).toBe('24.492')
    expect(accessory(data, '400mm Espagnolette')).toBe('4')
    expect(accessory(data, '600mm Espagnolette')).toBe('2')
    expect(accessory(data, '10” Friction Hinge')).toBe('3')
    expect(accessory(data, '12” Friction Hinge')).toBe('2')
    expect(accessory(data, '20” Friction Hinge')).toBe('1')
  })

  it('leaves narrow side-hung sashes without a friction hinge, as page 27 does', () => {
    expect(hingeSize(409.5, false)).toBeNull()
    expect(hingeSize(409.5, true)).toBe(10)
    expect(hingeSize(809.5, true)).toBe(24)
    expect(espagSize(1109.5)).toBe(1000)
    expect(espagSize(359.5)).toBe(200)
  })

  it('multiplies by the opening quantity', () => {
    const shape = layout('cols', [[800, [['fixed', 1000]]]])
    const item = withLayout({ ...createQuoteItem('window'), widthMm: 800, heightMm: 1000, quantity: 3 }, shape)
    item.technical = { ...item.technical, cill: 'None' }
    const data = buildWorkOrder(item)
    expect(data.sections.find((row) => row.section === 'Bead' && row.orientation === 'Hor')?.qty).toBe(6)
    expect(accessory(data, 'Glazing Bridge Packer')).toBe('15')
  })

  it('keeps the older builder for tilt and turn, sliding and doors', () => {
    const tilt = withLayout(createQuoteItem('window'), layout('cols', [[1000, [['tilt-turn-left', 1200]]]]))
    expect(usesLayoutEngine(tilt)).toBe(false)
    expect(usesLayoutEngine(createQuoteItem('door'))).toBe(false)
  })
})
