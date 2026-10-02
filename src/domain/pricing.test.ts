import { describe, expect, it } from 'vitest'
import { pricingDefaults } from '../data/pricingDefaults.ts'
import { createQuoteItem } from './factories.ts'
import { calculateDiscount, calculateItemPrice, calculateQuoteTotals, calculateTax } from './pricing.ts'
import { buildWorkOrder } from './workOrder.ts'
import type { Quote } from './models.ts'

describe('pricing', () => {
  it('prices a window from parts plus markup, then applies discount and tax', () => {
    const item = createQuoteItem('window')
    item.quantity = 2
    const price = calculateItemPrice(item, pricingDefaults)
    expect(price.areaM2).toBeCloseTo((1815 * 1130) / 1_000_000, 4)
    expect(price.parts.some((part) => part.id === 'glass')).toBe(true)
    expect(price.parts.some((part) => part.id === 'cill')).toBe(true)
    expect(price.unitPrice).toBeGreaterThan(price.partsCost)
    expect(price.lineTotal).toBeCloseTo(price.unitPrice * 2, 2)

    const quote: Quote = {
      id: 'q',
      jobNo: '1',
      reference: '',
      supply: 'Supply & fit',
      requestedDate: '',
      customer: { name: 'A', phone: '', email: '', address: '', salesperson: '' },
      status: 'draft',
      createdAt: '',
      updatedAt: '',
      items: [item],
      discountPercent: 10,
      taxPercent: 20,
      configDraft: null,
      editingItemId: null,
    }
    const totals = calculateQuoteTotals(quote, pricingDefaults)
    expect(totals.subtotal).toBeCloseTo(price.lineTotal, 2)
    expect(totals.discountAmount).toBeCloseTo(calculateDiscount(totals.subtotal, 10), 2)
    const net = totals.subtotal - totals.discountAmount
    expect(totals.taxAmount).toBeCloseTo(calculateTax(net, 20), 2)
    expect(totals.grandTotal).toBeCloseTo(net + totals.taxAmount, 2)
  })

  it('omits glass for a solid door', () => {
    const item = createQuoteItem('door')
    item.panels = [{ id: 'leaf', widthMm: item.widthMm, kind: 'solid' }]
    item.technical.cill = 'None'
    item.technical.glassType = 'None'
    const price = calculateItemPrice(item, pricingDefaults)
    expect(price.parts.some((part) => part.id === 'glass')).toBe(false)
    expect(price.parts.some((part) => part.id === 'leaf')).toBe(true)
  })
})

describe('work order cut list', () => {
  it('matches the reference window glass and frame lengths', () => {
    const item = createQuoteItem('window')
    const order = buildWorkOrder(item)
    expect(order.glass.map((row) => [row.width, row.length])).toEqual([
      [426, 892],
      [578, 994],
      [426, 892],
    ])
    const horizontalFrames = order.sections.filter((row) => row.section === 'Frame' && row.orientation === 'Hor' && row.description === 'Frame 6 Chamber')
    expect(horizontalFrames.map((row) => row.length)).toEqual([605, 620, 605])
    const verticalFrame = order.sections.find((row) => row.section === 'Frame' && row.orientation === 'Vert')
    expect(verticalFrame?.length).toBe(1105)
    const cill = order.sections.find((row) => row.section === 'Cill')
    expect(cill?.length).toBe(1915)
  })
})
