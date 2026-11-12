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
  'top-hung',
  /** A French door pair: two leaves opening out from the middle, master leaf on the left. */
  'french-left',
  /** The same pair with the master leaf on the right. */
  'french-right',
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

/**
 * How an opening is divided. `cols` splits the frame left to right into
 * sections (columns), and each column can be stacked top to bottom into cells.
 * `rows` splits it top to bottom into rows, and each row can be split left to
 * right. Section sizes run along the split; cell sizes run across it.
 */
export interface LayoutCell {
  id: string
  sizeMm: number
  kind: PanelKind
}

export interface LayoutSection {
  id: string
  sizeMm: number
  cells: LayoutCell[]
}

export interface OpeningLayout {
  split: 'cols' | 'rows'
  sections: LayoutSection[]
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

/** An inventory part added to this opening only. `fixedQty` is the typed amount when the part's rule is fixed. */
export interface AddedPart {
  partId: string
  fixedQty: number | null
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
  /**
   * One entry per cell, left to right then top to bottom. Kept for pricing and
   * older quotes; the drawing and work order read `layout` when it is present.
   */
  panels: Panel[]
  /** The divided frame. Missing on older quotes, which were a single row of `panels`. */
  layout?: OpeningLayout
  technical: TechnicalOptions
  notes: string
  /** Catalogue part ids left off this opening. Absent on older quotes. */
  removedPartIds?: string[]
  /** Inventory parts added to this opening. Absent on older quotes. */
  addedParts?: AddedPart[]
}

/** The fields of the customer form, kept so the form reopens exactly as it was filled in. */
export interface CustomerDetails {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  town: string
  county: string
  country: string
  postcode: string
}

export interface Customer {
  name: string
  phone: string
  email: string
  address: string
  salesperson: string
  /** Missing on customers saved before the form kept its fields. */
  details?: CustomerDetails
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
  customerNotes?: string
  internalNotes?: string
  supplierNotes?: string
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
  /** Highest discount a quote may use. Missing on older price lists, which means 100. */
  discountMaxPercent?: number
  partPrices: Record<string, number>
  materialFactors: Record<string, number>
  glazingAddons: Record<string, number>
  productFactors: Record<string, number>
}

export type ThemeMode = 'light' | 'dark'
