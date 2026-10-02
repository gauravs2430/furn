import type { Panel, PanelKind, ProductTypeId, Quote, QuoteItem } from './models.ts'
import { findPreset, matchPreset, technicalDefaults } from '../data/technicalPresets.ts'
import { findProduct, panelKindLabels } from '../data/productCatalog.ts'
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

export function createQuoteItem(productType: ProductTypeId = 'window'): QuoteItem {
  const product = findProduct(productType)
  const preset = findPreset(product.defaultPreset)
  const useSample =
    preset?.sampleWidths &&
    product.defaultWidth === preset.sampleWidths.reduce((sum, width) => sum + width, 0)
  const panels = panelsForPreset(
    product.defaultPreset,
    product.defaultWidth,
    useSample ? preset.sampleWidths : undefined,
  )
  return {
    id: createId(),
    location: '',
    productType,
    widthMm: product.defaultWidth,
    heightMm: product.defaultHeight,
    quantity: 1,
    materialId: 'upvc',
    externalColourId: 'white',
    internalColourId: 'white',
    glazingId: 'double',
    panels,
    technical: technicalDefaults(
      productType,
      'upvc',
      'double',
      panels.map((panel) => panel.kind),
    ),
    notes: '',
  }
}

export function applyProductType(item: QuoteItem, productType: ProductTypeId): QuoteItem {
  const next = createQuoteItem(productType)
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
      productType,
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

export function nextJobNo(quotes: Quote[]): string {
  const numbers = quotes.map((quote) => Number.parseInt(quote.jobNo, 10)).filter((value) => Number.isFinite(value))
  const max = numbers.length > 0 ? Math.max(...numbers) : 224
  return String(max + 1)
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
