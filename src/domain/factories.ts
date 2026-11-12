import type { Catalogue } from './catalogue.ts'
import { currentCatalogue, findProduct } from './catalogue.ts'
import type { OpeningLayout, Panel, Quote, QuoteItem } from './models.ts'
import { isDrawingFamily, itemProductId } from './models.ts'
import { findPreset, groupOf, matchPreset, presetLayout, technicalDefaults } from '../data/technicalPresets.ts'
import { cloneLayout, flatPanels, layoutKinds, layoutOf, resizeLayout, rowLayout } from './layout.ts'
import { panelKindLabels } from '../data/productCatalog.ts'
import { pricingDefaults } from '../data/pricingDefaults.ts'
import { createId } from '../utils/ids.ts'
import { nowIso } from '../utils/dates.ts'

export function equalPanelWidths(total: number, count: number): number[] {
  const safeCount = Math.max(1, count)
  const safeTotal = Math.max(0, Math.round(total))
  const base = Math.floor(safeTotal / safeCount)
  const remainder = safeTotal - base * safeCount
  const widths = Array.from({ length: safeCount }, () => base)
  if (safeCount === 3) widths[1] += remainder
  else widths[safeCount - 1] += remainder
  return widths
}

/** A preset's layout scaled to the given overall size, with fresh ids. */
export function layoutForPreset(presetId: string, widthMm: number, heightMm: number): OpeningLayout {
  const preset = findPreset(presetId)
  const layout = preset ? presetLayout(preset) : rowLayout(['fixed'], [widthMm], heightMm)
  return resizeLayout(cloneLayout(layout), widthMm, heightMm)
}

/**
 * Sets the layout and keeps everything that depends on it in step: the flat
 * panel list (pricing) and the technical options that follow the layout.
 */
export function withLayout(item: QuoteItem, layout: OpeningLayout): QuoteItem {
  const family = isDrawingFamily(item.productType) ? item.productType : 'window'
  const kinds = layoutKinds(layout)
  const defaults = technicalDefaults(family, item.materialId, item.glazingId, kinds)
  return {
    ...item,
    layout,
    panels: flatPanels(layout, item.widthMm, item.heightMm),
    technical: {
      ...item.technical,
      mullion: kinds.length > 1 ? defaults.mullion : 'None',
      sashType: defaults.sashType,
      locking: defaults.locking,
      handle: defaults.handle,
      hinge: defaults.hinge,
      glazingMethod: defaults.glazingMethod,
      glassType: defaults.glassType === 'None' ? defaults.glassType : item.technical.glassType || defaults.glassType,
      gasFill: defaults.gasFill === 'None' ? defaults.gasFill : item.technical.gasFill || defaults.gasFill,
    },
  }
}

export function createQuoteItem(productId = 'window', catalogue: Catalogue = currentCatalogue()): QuoteItem {
  const product = findProduct(productId, catalogue)
  const family = product.family
  const drawing = isDrawingFamily(family) ? family : null
  const layout = drawing ? layoutForPreset(product.defaultPreset, product.defaultWidth, product.defaultHeight) : undefined
  const panels = layout ? flatPanels(layout, product.defaultWidth, product.defaultHeight) : []
  return {
    id: createId(),
    location: '',
    productId: product.id,
    productType: family,
    widthMm: product.defaultWidth,
    heightMm: product.defaultHeight,
    quantity: 1,
    materialId: 'upvc',
    externalColourId: 'white',
    internalColourId: 'white',
    glazingId: 'double',
    panels,
    ...(layout ? { layout } : {}),
    technical: technicalDefaults(drawing ?? 'window', 'upvc', 'double', layout ? layoutKinds(layout) : []),
    notes: '',
  }
}

export function applyProductType(item: QuoteItem, productId: string): QuoteItem {
  const next = createQuoteItem(productId)
  const family = isDrawingFamily(next.productType) ? next.productType : 'window'
  return {
    ...next,
    id: item.id,
    location: item.location,
    quantity: item.quantity,
    notes: item.notes,
    externalColourId: item.externalColourId,
    internalColourId: item.internalColourId,
    materialId: item.materialId,
    technical: technicalDefaults(family, item.materialId, next.glazingId, next.layout ? layoutKinds(next.layout) : []),
  }
}

export function emptyCustomer(): Quote['customer'] {
  return { name: '', phone: '', email: '', address: '', salesperson: '' }
}

export function createQuote(jobNo: string, taxPercent = pricingDefaults.taxPercent): Quote {
  const now = nowIso()
  return {
    id: createId(),
    jobNo,
    reference: '',
    supply: 'Supply & fit',
    requestedDate: '',
    customer: emptyCustomer(),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    items: [],
    discountPercent: 0,
    taxPercent,
    configDraft: createQuoteItem('window'),
    editingItemId: null,
    customerNotes: '',
    internalNotes: '',
    supplierNotes: '',
  }
}

/** The layout's name, or its cells in reading order when it is not a named layout. */
/** The layout group for an opening's product, e.g. French doors within doors. */
export function productGroup(item: Pick<QuoteItem, 'productId' | 'productType'>, catalogue: Catalogue = currentCatalogue()): string | undefined {
  return groupOf(findProduct(itemProductId(item), catalogue).defaultPreset)
}

export function describeConfiguration(item: Pick<QuoteItem, 'layout' | 'panels' | 'heightMm' | 'productType' | 'productId'>): string {
  const layout = layoutOf(item)
  const preset = matchPreset(layout, isDrawingFamily(item.productType) ? item.productType : 'window', productGroup(item))
  if (preset) return preset.label
  const kinds = layoutKinds(layout)
  if (kinds.length === 0) return 'Custom'
  return kinds.map((kind) => panelKindLabels[kind]).join(' · ')
}

export function panelWidthTotal(panels: Panel[]): number {
  return panels.reduce((sum, panel) => sum + (Number.isFinite(panel.widthMm) ? panel.widthMm : 0), 0)
}
