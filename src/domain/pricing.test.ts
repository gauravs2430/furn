import { describe, expect, it } from 'vitest'
import { pricingDefaults } from '../data/pricingDefaults.ts'
import { fallbackCatalogue } from './catalogue.ts'
import type { CatalogPart, CatalogProduct } from './catalogue.ts'
import { createQuoteItem } from './factories.ts'
import { addPartToItem, removePartFromItem } from './parts.ts'
import { calculateDiscount, calculateItemPrice, calculateQuoteTotals, calculateTax } from './pricing.ts'
import { buildWorkOrder } from './workOrder.ts'
import type { Quote } from './models.ts'

describe('pricing', () => {
  it('prices a window from parts plus markup, then applies discount and tax', () => {
    const item = createQuoteItem('window')
    expect(item.productId).toBe('window')
    expect(item.productType).toBe('window')
    expect(item.widthMm).toBe(1815)
    expect(item.heightMm).toBe(1130)
    item.quantity = 2
    const price = calculateItemPrice(item, pricingDefaults)
    expect(price.partsCost).toBe(515.01)
    expect(price.unitPrice).toBe(669.51)
    expect(price.lineTotal).toBe(1339.02)
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

  it('replaces the part price for that product when price_override is set', () => {
    const catalogue = fallbackCatalogue()
    const windowHandle = catalogue.links.find((link) => link.productId === 'window' && link.partId === 'handle')
    const windowFrame = catalogue.links.find((link) => link.productId === 'window' && link.partId === 'frame')
    const windowGlass = catalogue.links.find((link) => link.productId === 'window' && link.partId === 'glass')
    if (!windowHandle || !windowFrame || !windowGlass) throw new Error('missing link')
    windowHandle.priceOverride = 40
    windowFrame.priceOverride = 10
    windowGlass.priceOverride = 20

    const window = createQuoteItem('window')
    window.materialId = 'aluminium'
    window.glazingId = 'acoustic'
    const price = calculateItemPrice(window, pricingDefaults, catalogue)
    expect(price.parts.find((part) => part.id === 'handle')?.unitPrice).toBe(40)
    expect(price.parts.find((part) => part.id === 'frame')?.unitPrice).toBe(18)
    expect(price.parts.find((part) => part.id === 'glass')?.unitPrice).toBe(80)

    const door = calculateItemPrice(createQuoteItem('door'), pricingDefaults, catalogue)
    expect(door.parts.find((part) => part.id === 'handle')?.unitPrice).toBe(18)
  })

  it('uses a new company part price on the next window', () => {
    const before = calculateItemPrice(createQuoteItem('window'), pricingDefaults, fallbackCatalogue())
    const catalogue = fallbackCatalogue()
    const frame = catalogue.parts.find((part) => part.id === 'frame')
    if (!frame) throw new Error('missing part')
    frame.price += 10
    const after = calculateItemPrice(createQuoteItem('window'), pricingDefaults, catalogue)
    const beforeFrame = before.parts.find((part) => part.id === 'frame')?.unitPrice ?? 0
    expect(after.parts.find((part) => part.id === 'frame')?.unitPrice).toBeCloseTo(beforeFrame + 10, 2)
    expect(after.partsCost).toBeGreaterThan(before.partsCost)
  })

  it('drops a part when the product link is not included', () => {
    const catalogue = fallbackCatalogue()
    const seal = catalogue.links.find((link) => link.productId === 'window' && link.partId === 'seal')
    if (!seal) throw new Error('missing link')
    seal.included = false
    const price = calculateItemPrice(createQuoteItem('window'), pricingDefaults, catalogue)
    const full = calculateItemPrice(createQuoteItem('window'), pricingDefaults, fallbackCatalogue())
    expect(price.parts.some((part) => part.id === 'seal')).toBe(false)
    expect(full.parts.some((part) => part.id === 'seal')).toBe(true)
    expect(price.partsCost).toBeLessThan(full.partsCost)
    const door = calculateItemPrice(createQuoteItem('door'), pricingDefaults, catalogue)
    expect(door.parts.some((part) => part.id === 'seal')).toBe(true)
  })

  it('uses a quantity rule for a new part and a fixed quantity on an accessory', () => {
    const catalogue = fallbackCatalogue()
    const fixings = catalogue.parts.find((part) => part.id === 'fixings')
    if (!fixings) throw new Error('missing part')
    fixings.quantityRule = 'per-panel'
    const ruled = calculateItemPrice(createQuoteItem('window'), pricingDefaults, catalogue)
    expect(ruled.parts.find((part) => part.id === 'fixings')?.quantity).toBe(3)

    const accessory: CatalogProduct = {
      id: 'handle-pack',
      name: 'Handle pack',
      family: 'accessory',
      summary: 'Extra handles',
      factor: 1,
      defaultWidth: 1000,
      defaultHeight: 1000,
      defaultPreset: '',
      active: true,
      sortOrder: 5,
    }
    catalogue.products.push(accessory)
    catalogue.parts.push({
      id: 'extra-handle',
      name: 'Extra handle',
      unit: 'each',
      price: 18,
      quantityRule: 'area',
      appliesMaterialFactor: false,
      appliesProductFactor: false,
      appliesGlazingAddon: false,
      active: true,
      sortOrder: 18,
    })
    catalogue.links.push({
      productId: 'handle-pack',
      partId: 'extra-handle',
      priceOverride: null,
      fixedQty: 4,
      included: true,
    })
    const item = createQuoteItem('handle-pack', catalogue)
    expect(item.productType).toBe('accessory')
    expect(item.productId).toBe('handle-pack')
    expect(item.panels).toEqual([])
    const price = calculateItemPrice(item, pricingDefaults, catalogue)
    expect(price.parts.map((part) => [part.id, part.quantity, part.unitPrice])).toEqual([['extra-handle', 4, 18]])
    const link = catalogue.links.find((entry) => entry.partId === 'extra-handle')
    if (!link) throw new Error('missing link')
    link.fixedQty = null
    item.widthMm = 2500
    expect(calculateItemPrice(item, pricingDefaults, catalogue).parts[0]?.quantity).toBe(1)
  })

  it('leaves a removed part out of the total and includes an added part', () => {
    const catalogue = fallbackCatalogue()
    const lining: CatalogPart = {
      id: 'lining',
      name: 'Lining',
      unit: 'm',
      price: 10,
      quantityRule: 'perimeter',
      appliesMaterialFactor: false,
      appliesProductFactor: false,
      appliesGlazingAddon: false,
      active: true,
      sortOrder: 30,
    }
    catalogue.parts.push(lining)
    catalogue.links.push({
      productId: 'window',
      partId: 'lining',
      priceOverride: 25,
      fixedQty: null,
      included: false,
    })
    const bracket: CatalogPart = {
      id: 'bracket',
      name: 'Bracket',
      unit: 'each',
      price: 4,
      quantityRule: 'fixed',
      appliesMaterialFactor: false,
      appliesProductFactor: false,
      appliesGlazingAddon: false,
      active: true,
      sortOrder: 31,
    }
    catalogue.parts.push(bracket)

    const full = calculateItemPrice(createQuoteItem('window'), pricingDefaults, catalogue)
    const handle = full.parts.find((part) => part.id === 'handle')
    if (!handle) throw new Error('missing handle')
    const handleLine = handle.quantity * handle.unitPrice

    const withoutHandle = removePartFromItem(createQuoteItem('window'), 'handle')
    const removed = calculateItemPrice(withoutHandle, pricingDefaults, catalogue)
    expect(removed.parts.some((part) => part.id === 'handle')).toBe(false)
    expect(removed.partsCost).toBeCloseTo(full.partsCost - handleLine, 2)

    const adjusted = addPartToItem(addPartToItem(withoutHandle, lining, 1, catalogue), bracket, 3, catalogue)
    const price = calculateItemPrice(adjusted, pricingDefaults, catalogue)
    const liningLine = price.parts.find((part) => part.id === 'lining')
    const bracketLine = price.parts.find((part) => part.id === 'bracket')
    expect(price.parts.some((part) => part.id === 'handle')).toBe(false)
    expect(liningLine?.unitPrice).toBe(25)
    expect(bracketLine?.quantity).toBe(3)
    expect(price.partsCost).toBeCloseTo(removed.partsCost + (liningLine?.quantity ?? 0) * 25 + 3 * 4, 2)

    const wider = calculateItemPrice({ ...adjusted, widthMm: adjusted.widthMm + 1000 }, pricingDefaults, catalogue)
    expect(wider.parts.some((part) => part.id === 'handle')).toBe(false)
    expect(wider.parts.find((part) => part.id === 'lining')?.quantity).toBeGreaterThan(liningLine?.quantity ?? 0)
    expect(wider.parts.find((part) => part.id === 'bracket')?.quantity).toBe(3)

    const other = calculateItemPrice(createQuoteItem('window'), pricingDefaults, catalogue)
    expect(other.parts.some((part) => part.id === 'handle')).toBe(true)
    expect(other.parts.some((part) => part.id === 'lining')).toBe(false)
    expect(catalogue.links.find((link) => link.productId === 'window' && link.partId === 'handle')?.included).toBe(true)

    const cleared = removePartFromItem(adjusted, 'lining')
    expect(calculateItemPrice(cleared, pricingDefaults, catalogue).parts.some((part) => part.id === 'lining')).toBe(false)

    let empty = createQuoteItem('window')
    for (const part of full.parts) empty = removePartFromItem(empty, part.id)
    const bare = calculateItemPrice(empty, pricingDefaults, catalogue)
    expect(bare.parts).toEqual([])
    expect(bare.partsCost).toBe(0)
    expect(bare.lineTotal).toBe(0)
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
