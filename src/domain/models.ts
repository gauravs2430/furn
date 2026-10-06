export const PRODUCT_TYPES = ['window', 'door', 'patio', 'bifold'] as const
export type ProductTypeId = (typeof PRODUCT_TYPES)[number]

export const PRODUCT_FAMILIES = ['window', 'door', 'patio', 'bifold', 'accessory'] as const
export type ProductFamily = (typeof PRODUCT_FAMILIES)[number]

export function isDrawingFamily(value: string): value is ProductTypeId {
  return (PRODUCT_TYPES as readonly string[]).includes(value)
}

/** Older quotes stored only the family, and those families used the same id. */
export function itemProductId(item: { productId?: string; productType: string }): string {
  const id = item.productId?.trim()
  return id ? id : item.productType
}

export const PANEL_KINDS = [
  'fixed',
  'casement-left',
  'casement-right',
  'tilt-turn-left',
  'tilt-turn-right',
  'sliding',
  'bifold',
  'solid',
  'half-glazed',
] as const
export type PanelKind = (typeof PANEL_KINDS)[number]

export const QUOTE_STATUSES = ['draft', 'quoted', 'booked'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export interface Panel {
  id: string
  widthMm: number
  kind: PanelKind
}

export interface TechnicalOptions {
  frameProfile: string
  mullion: string
  cill: string
  joint: string
  bead: string
  sashType: string
  locking: string
  handle: string
  hinge: string
  glassGroup: string
  glazingMethod: string
  glassType: string
  gasFill: string
  componentType: string
  drainage: string
  horizontalSplit: string
}

export interface QuoteItem {
  id: string
  location: string
  productId: string
  productType: ProductFamily
  widthMm: number
  heightMm: number
  quantity: number
  materialId: string
  externalColourId: string
  internalColourId: string
  glazingId: string
  panels: Panel[]
  technical: TechnicalOptions
  notes: string
}

export interface Customer {
  name: string
  phone: string
  email: string
  address: string
  salesperson: string
}

export interface Quote {
  id: string
  jobNo: string
  reference: string
  supply: string
  requestedDate: string
  customer: Customer
  status: QuoteStatus
  createdAt: string
  updatedAt: string
  quotedAt?: string
  bookedAt?: string
  items: QuoteItem[]
  discountPercent: number
  taxPercent: number
  configDraft: QuoteItem | null
  editingItemId: string | null
}

export interface PartLine {
  id: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
}

export interface ItemPricing {
  areaM2: number
  perimeterM: number
  parts: PartLine[]
  partsCost: number
  unitPrice: number
  lineTotal: number
}

export interface QuoteTotals {
  subtotal: number
  discountPercent: number
  discountAmount: number
  taxPercent: number
  taxAmount: number
  grandTotal: number
}

export interface SectionRow {
  orientation: 'Vert' | 'Hor'
  section: string
  description: string
  qty: number
  length: number
  endPrep: string
  reinforcing: string
  reinforcingLength: string
}

export interface AccessoryRow {
  item: string
  qty: string
  unit: string
}

export interface GlassRow {
  reference: string
  qty: number
  width: number
  length: number
}

export interface WorkOrderData {
  mainOptions: { label: string; value: string }[]
  sections: SectionRow[]
  accessories: AccessoryRow[]
  glass: GlassRow[]
}

export interface PricingConfig {
  markupPercent: number
  taxPercent: number
  partPrices: Record<string, number>
  materialFactors: Record<string, number>
  glazingAddons: Record<string, number>
  productFactors: Record<string, number>
}

export type ThemeMode = 'light' | 'dark'
