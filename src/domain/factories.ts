import type { Catalogue } from './catalogue.ts'
import { currentCatalogue, findProduct } from './catalogue.ts'
import type { Panel, PanelKind, Quote, QuoteItem } from './models.ts'
import { isDrawingFamily } from './models.ts'
import { findPreset, matchPreset, technicalDefaults } from '../data/technicalPresets.ts'
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

export function panelsForPreset(presetId: string, totalWidth: number, explicit?: number[]): Panel[] {
  const preset = findPreset(presetId)
  const kinds: PanelKind[] = preset?.panels ?? ['fixed']
  const widths =
    explicit && explicit.length === kinds.length
      ? explicit.map((width) => Math.round(width))
      : equalPanelWidths(totalWidth, kinds.length)
  return kinds.map((kind, index) => ({
    id: createId(),
    widthMm: widths[index] ?? 0,
    kind,
  }))
}

export function createQuoteItem(productId = 'window', catalogue: Catalogue = currentCatalogue()): QuoteItem {
  const product = findProduct(productId, catalogue)
  const family = product.family
  const drawing = isDrawingFamily(family) ? family : null
  const preset = drawing && product.defaultPreset ? findPreset(product.defaultPreset) : undefined
  const useSample =
    preset?.sampleWidths &&
    product.defaultWidth === preset.sampleWidths.reduce((sum, width) => sum + width, 0)
  const panels = drawing
    ? panelsForPreset(product.defaultPreset, product.defaultWidth, useSample ? preset.sampleWidths : undefined)
    : []
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
    technical: technicalDefaults(drawing ?? 'window', 'upvc', 'double', panels.map((panel) => panel.kind)),
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
    technical: technicalDefaults(
      family,
      item.materialId,
      next.glazingId,
      next.panels.map((panel) => panel.kind),
    ),
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
  }
}

export function describeConfiguration(panels: Panel[]): string {
  const preset = matchPreset(panels.map((panel) => panel.kind))
  if (preset) return preset.label
  if (panels.length === 0) return 'Custom'
  return panels.map((panel) => panelKindLabels[panel.kind]).join(' · ')
}

export function panelWidthTotal(panels: Panel[]): number {
  return panels.reduce((sum, panel) => sum + (Number.isFinite(panel.widthMm) ? panel.widthMm : 0), 0)
}
