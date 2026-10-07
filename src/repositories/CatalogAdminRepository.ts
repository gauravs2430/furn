import type { AdminQuantityRule } from '../domain/catalogAdmin.ts'
import { CATALOG_PAGE_SIZE, OPTION_SEARCH_AFTER, ilikeContains, includedFamilyLinks, isAdminQuantityRule, slugFromName, uniqueId } from '../domain/catalogAdmin.ts'
import type { CatalogColour, CatalogGlazing, CatalogMaterial, CatalogPart, CatalogProduct, ProductPartLink } from '../domain/catalogue.ts'
import { PRODUCT_FAMILIES, type ProductFamily } from '../domain/models.ts'
import { mapColour, mapGlazing, mapLink, mapMaterial, mapPart, mapProduct } from './CatalogueRepository.ts'
import { supabase } from '../lib/supabase.ts'
import { nowIso } from '../utils/dates.ts'

export interface ProductListRow {
  id: string
  name: string
  family: ProductFamily
  factor: number
  active: boolean
  updatedAt: string
}

export interface Paged<T> {
  rows: T[]
  total: number
  searchable: boolean
}

export interface ProductBundle {
  product: CatalogProduct
  updatedAt: string
  links: ProductPartLink[]
  parts: CatalogPart[]
}

export interface NewProductInput {
  name: string
  family: ProductFamily
  summary: string
  factor: number
  defaultWidth: number
  defaultHeight: number
  defaultPreset: string
  active: boolean
}

export interface ProductPatch {
  name: string
  summary: string
  factor: number
  defaultWidth: number
  defaultHeight: number
  defaultPreset: string
  active: boolean
}

export interface NewPartInput {
  name: string
  unit: string
  price: number
  quantityRule: AdminQuantityRule
  appliesMaterialFactor: boolean
  appliesProductFactor: boolean
  appliesGlazingAddon: boolean
  fixedQty: number | null
}

export interface PartPriceInput {
  productId: string
  partId: string
  price: number
  priceOverride: number | null
  fixedQty: number | null
}

const PRODUCT_COLUMNS = 'id, name, family, summary, factor, default_width_mm, default_height_mm, default_preset, active, sort_order, updated_at'
const PART_COLUMNS = 'id, name, unit, price, quantity_rule, applies_material_factor, applies_product_factor, applies_glazing_addon, active, sort_order'
const LINK_COLUMNS = 'product_id, part_id, price_override, fixed_qty, included'
const MATERIAL_COLUMNS = 'id, name, factor, active, sort_order'
const COLOUR_COLUMNS = 'id, name, hex, finish, active, sort_order'
const GLAZING_COLUMNS = 'id, name, addon_per_m2, description, glass_type, gas_fill, active, sort_order'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function asRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => (entry && typeof entry === 'object' ? [entry as Record<string, unknown>] : []))
}

function fail(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message.trim() || fallback)
}

function written(data: unknown, fallback: string) {
  if (!asRecords(data).length) throw new Error(fallback)
}

function requiredText(value: string, label: string): string {
  const text = value.trim()
  if (!text) throw new Error(`Enter a ${label}.`)
  return text
}

function nonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} cannot be negative.`)
  return value
}

function positiveInt(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than 0.`)
  return Math.round(value)
}

function assertFamily(value: string): ProductFamily {
  if ((PRODUCT_FAMILIES as readonly string[]).includes(value)) return value as ProductFamily
  throw new Error('That product family is not valid.')
}

function listRow(row: Record<string, unknown>): ProductListRow | null {
  const product = mapProduct(row)
  if (!product) return null
  return {
    id: product.id,
    name: product.name,
    family: product.family,
    factor: product.factor,
    active: product.active,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
}

async function idsWithPrefix(table: 'products' | 'parts' | 'materials' | 'colours' | 'glazing_options', base: string): Promise<string[]> {
  const { data, error } = await requireClient().from(table).select('id').like('id', `${base}%`)
  fail(error, 'Could not check existing ids.')
  return asRecords(data).flatMap((row) => (typeof row.id === 'string' ? [row.id] : []))
}

async function nextSort(table: 'products' | 'parts' | 'materials' | 'colours' | 'glazing_options'): Promise<number> {
  const { data, error } = await requireClient().from(table).select('sort_order').order('sort_order', { ascending: false }).limit(1)
  fail(error, 'Could not save that row.')
  const top = asRecords(data)[0]
  const current = typeof top?.sort_order === 'number' ? top.sort_order : Number(top?.sort_order)
  return (Number.isFinite(current) ? current : 0) + 1
}

async function touchProduct(productId: string) {
  const { error } = await requireClient().from('products').update({ updated_at: nowIso() }).eq('id', productId)
  fail(error, 'Could not update that product.')
}

async function familyLinks(family: ProductFamily): Promise<ProductPartLink[]> {
  if (family === 'accessory') return []
  const { data, error } = await requireClient().from('product_parts').select(LINK_COLUMNS).eq('product_id', family)
  fail(error, 'Could not copy the family parts.')
  const links = asRecords(data).flatMap((row) => {
    const link = mapLink(row)
    return link ? [link] : []
  })
  return includedFamilyLinks(family, links)
}

export async function searchProducts(query: string, page: number): Promise<{ rows: ProductListRow[]; total: number }> {
  const from = Math.max(0, Math.floor(page)) * CATALOG_PAGE_SIZE
  const pattern = ilikeContains(query)
  let request = requireClient().from('products').select(PRODUCT_COLUMNS, { count: 'exact' }).order('sort_order').order('name')
  if (pattern) request = request.ilike('name', pattern)
  const { data, error, count } = await request.range(from, from + CATALOG_PAGE_SIZE - 1)
  fail(error, 'Could not load the catalogue.')
  return {
    rows: asRecords(data).flatMap((row) => {
      const product = listRow(row)
      return product ? [product] : []
    }),
    total: count ?? 0,
  }
}

export async function createProduct(input: NewProductInput): Promise<string> {
  const name = requiredText(input.name, 'name')
  const family = assertFamily(input.family)
  const base = slugFromName(name, 'product')
  const id = uniqueId(name, await idsWithPrefix('products', base), 'product')
  const preset = family === 'accessory' ? '' : input.defaultPreset.trim()
  if (family !== 'accessory' && !preset) throw new Error('Choose a default preset.')
  const inserted = await requireClient()
    .from('products')
    .insert({
      id,
      name,
      family,
      summary: input.summary.trim(),
      factor: nonNegative(input.factor, 'Factor'),
      default_width_mm: positiveInt(input.defaultWidth, 'Default width'),
      default_height_mm: positiveInt(input.defaultHeight, 'Default height'),
      default_preset: preset,
      active: input.active,
      sort_order: await nextSort('products'),
    })
    .select('id')
  fail(inserted.error, 'Could not add that product.')
  written(inserted.data, 'Could not add that product.')

  const copies = await familyLinks(family)
  if (copies.length) {
    const linked = await requireClient()
      .from('product_parts')
      .insert(
        copies.map((link) => ({
          product_id: id,
          part_id: link.partId,
          price_override: link.priceOverride,
          fixed_qty: link.fixedQty,
          included: true,
        })),
      )
      .select('part_id')
    if (linked.error || !asRecords(linked.data).length) {
      await requireClient().from('products').delete().eq('id', id)
      throw new Error(linked.error?.message || 'Could not copy the family parts.')
    }
  }
  return id
}

export async function updateProduct(id: string, input: ProductPatch): Promise<void> {
  const existing = await requireClient().from('products').select('family').eq('id', id)
  fail(existing.error, 'Could not save that product.')
  const row = asRecords(existing.data)[0]
  if (!row) throw new Error('That product is missing.')
  const family = assertFamily(typeof row.family === 'string' ? row.family : '')
  const preset = family === 'accessory' ? '' : input.defaultPreset.trim()
  if (family !== 'accessory' && !preset) throw new Error('Choose a default preset.')
  const updated = await requireClient()
    .from('products')
    .update({
      name: requiredText(input.name, 'name'),
      summary: input.summary.trim(),
      factor: nonNegative(input.factor, 'Factor'),
      default_width_mm: positiveInt(input.defaultWidth, 'Default width'),
      default_height_mm: positiveInt(input.defaultHeight, 'Default height'),
      default_preset: preset,
      active: input.active,
      updated_at: nowIso(),
    })
    .eq('id', id)
    .select('id')
  fail(updated.error, 'Could not save that product.')
  written(updated.data, 'Could not save that product.')
}

export async function loadProductBundle(id: string): Promise<ProductBundle> {
  const productResult = await requireClient().from('products').select(PRODUCT_COLUMNS).eq('id', id)
  fail(productResult.error, 'Could not open that product.')
  const row = asRecords(productResult.data)[0]
  const product = row ? mapProduct(row) : null
  if (!row || !product) throw new Error('That product is missing.')
  const linkResult = await requireClient().from('product_parts').select(LINK_COLUMNS).eq('product_id', id)
  fail(linkResult.error, 'Could not load the parts on this product.')
  const links = asRecords(linkResult.data).flatMap((entry) => {
    const link = mapLink(entry)
    return link ? [link] : []
  })
  const partIds = [...new Set(links.map((link) => link.partId))]
  let parts: CatalogPart[] = []
  if (partIds.length) {
    const partResult = await requireClient().from('parts').select(PART_COLUMNS).in('id', partIds)
    fail(partResult.error, 'Could not load the parts on this product.')
    parts = asRecords(partResult.data).flatMap((entry) => {
      const part = mapPart(entry)
      return part ? [part] : []
    })
  }
  return {
    product,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
    links,
    parts,
  }
}

export async function savePartPricing(input: PartPriceInput): Promise<void> {
  const price = nonNegative(input.price, 'Company price')
  const priceOverride = input.priceOverride === null ? null : nonNegative(input.priceOverride, 'Override price')
  const fixedQty = input.fixedQty === null ? null : nonNegative(input.fixedQty, 'Quantity')
  const priced = await requireClient().from('parts').update({ price }).eq('id', input.partId).select('id')
  fail(priced.error, 'Could not save that price.')
  written(priced.data, 'Could not save that price.')
  const linked = await requireClient()
    .from('product_parts')
    .update({ price_override: priceOverride, fixed_qty: fixedQty })
    .eq('product_id', input.productId)
    .eq('part_id', input.partId)
    .select('part_id')
  fail(linked.error, 'Could not save that price.')
  written(linked.data, 'Could not save that price.')
  await touchProduct(input.productId)
}

export async function setPartIncluded(productId: string, partId: string, included: boolean): Promise<void> {
  const updated = await requireClient()
    .from('product_parts')
    .update({ included })
    .eq('product_id', productId)
    .eq('part_id', partId)
    .select('part_id')
  fail(updated.error, 'Could not update that part.')
  written(updated.data, 'Could not update that part.')
  await touchProduct(productId)
}

export async function attachPart(productId: string, partId: string, fixedQty: number | null): Promise<void> {
  const existing = await requireClient().from('product_parts').select('part_id').eq('product_id', productId).eq('part_id', partId)
  fail(existing.error, 'Could not attach that part.')
  if (asRecords(existing.data).length) {
    const patch: { included: boolean; fixed_qty?: number } = { included: true }
    if (fixedQty !== null) patch.fixed_qty = nonNegative(fixedQty, 'Quantity')
    const updated = await requireClient().from('product_parts').update(patch).eq('product_id', productId).eq('part_id', partId).select('part_id')
    fail(updated.error, 'Could not attach that part.')
    written(updated.data, 'Could not attach that part.')
  } else {
    const inserted = await requireClient()
      .from('product_parts')
      .insert({
        product_id: productId,
        part_id: partId,
        price_override: null,
        fixed_qty: fixedQty === null ? null : nonNegative(fixedQty, 'Quantity'),
        included: true,
      })
      .select('part_id')
    fail(inserted.error, 'Could not attach that part.')
    written(inserted.data, 'Could not attach that part.')
  }
  await touchProduct(productId)
}

export async function createPartOnProduct(productId: string, family: ProductFamily, input: NewPartInput): Promise<void> {
  if (!isAdminQuantityRule(input.quantityRule)) throw new Error('Choose a quantity rule.')
  const name = requiredText(input.name, 'name')
  const unit = requiredText(input.unit, 'unit')
  const base = slugFromName(name, 'part')
  const id = uniqueId(name, await idsWithPrefix('parts', base), 'part')
  const inserted = await requireClient()
    .from('parts')
    .insert({
      id,
      name,
      unit,
      price: nonNegative(input.price, 'Company price'),
      quantity_rule: input.quantityRule,
      applies_material_factor: input.appliesMaterialFactor,
      applies_product_factor: input.appliesProductFactor,
      applies_glazing_addon: input.appliesGlazingAddon,
      active: true,
      sort_order: await nextSort('parts'),
    })
    .select('id')
  fail(inserted.error, 'Could not add that part.')
  written(inserted.data, 'Could not add that part.')
  const fixedQty = family === 'accessory' || input.quantityRule === 'fixed' ? nonNegative(input.fixedQty ?? 1, 'Quantity') : null
  try {
    await attachPart(productId, id, fixedQty)
  } catch (error) {
    await requireClient().from('product_parts').delete().eq('product_id', productId).eq('part_id', id)
    await requireClient().from('parts').delete().eq('id', id)
    throw error
  }
}

export async function searchPartsToAdd(query: string, excludeIds: string[], page: number): Promise<{ rows: CatalogPart[]; total: number }> {
  const from = Math.max(0, Math.floor(page)) * CATALOG_PAGE_SIZE
  const pattern = ilikeContains(query)
  let request = requireClient().from('parts').select(PART_COLUMNS, { count: 'exact' }).eq('active', true).order('sort_order').order('name')
  if (pattern) request = request.ilike('name', pattern)
  for (const id of excludeIds) request = request.neq('id', id)
  const { data, error, count } = await request.range(from, from + CATALOG_PAGE_SIZE - 1)
  fail(error, 'Could not load parts.')
  return {
    rows: asRecords(data).flatMap((row) => {
      const part = mapPart(row)
      return part ? [part] : []
    }),
    total: count ?? 0,
  }
}

async function searchNamed<T>(
  table: 'materials' | 'colours' | 'glazing_options',
  columns: string,
  query: string,
  page: number,
  map: (row: Record<string, unknown>) => T | null,
): Promise<Paged<T>> {
  const counted = await requireClient().from(table).select('id', { count: 'exact', head: true })
  fail(counted.error, 'Could not load that list.')
  const all = counted.count ?? 0
  const searchable = all > OPTION_SEARCH_AFTER
  const from = Math.max(0, Math.floor(page)) * CATALOG_PAGE_SIZE
  const pattern = searchable ? ilikeContains(query) : null
  let request = requireClient().from(table).select(columns, { count: 'exact' }).order('sort_order').order('name')
  if (pattern) request = request.ilike('name', pattern)
  if (searchable) request = request.range(from, from + CATALOG_PAGE_SIZE - 1)
  const result = await request
  fail(result.error, 'Could not load that list.')
  return {
    rows: asRecords(result.data).flatMap((row) => {
      const item = map(row)
      return item ? [item] : []
    }),
    total: searchable ? (result.count ?? 0) : all,
    searchable,
  }
}

export function searchMaterials(query: string, page: number): Promise<Paged<CatalogMaterial>> {
  return searchNamed('materials', MATERIAL_COLUMNS, query, page, mapMaterial)
}

export function searchColours(query: string, page: number): Promise<Paged<CatalogColour>> {
  return searchNamed('colours', COLOUR_COLUMNS, query, page, mapColour)
}

export function searchGlazing(query: string, page: number): Promise<Paged<CatalogGlazing>> {
  return searchNamed('glazing_options', GLAZING_COLUMNS, query, page, mapGlazing)
}

export async function addMaterial(input: { name: string; factor: number; active: boolean }): Promise<void> {
  const name = requiredText(input.name, 'name')
  const base = slugFromName(name, 'material')
  const inserted = await requireClient()
    .from('materials')
    .insert({
      id: uniqueId(name, await idsWithPrefix('materials', base), 'material'),
      name,
      factor: nonNegative(input.factor, 'Factor'),
      active: input.active,
      sort_order: await nextSort('materials'),
    })
    .select('id')
  fail(inserted.error, 'Could not add that material.')
  written(inserted.data, 'Could not add that material.')
}

export async function removeMaterial(id: string): Promise<void> {
  const removed = await requireClient().from('materials').delete().eq('id', id).select('id')
  fail(removed.error, 'Could not remove that material.')
  written(removed.data, 'Could not remove that material.')
}

export async function saveMaterial(input: CatalogMaterial): Promise<void> {
  const updated = await requireClient()
    .from('materials')
    .update({
      name: requiredText(input.name, 'name'),
      factor: nonNegative(input.factor, 'Factor'),
      active: input.active,
    })
    .eq('id', input.id)
    .select('id')
  fail(updated.error, 'Could not save that material.')
  written(updated.data, 'Could not save that material.')
}

export function normalizeHex(value: string): string {
  const hex = value.trim()
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new Error('Enter a colour like #1C1C1C.')
  return hex.toUpperCase()
}

export async function addColour(input: { name: string; hex: string; finish: 'solid' | 'oak'; active: boolean }): Promise<void> {
  const name = requiredText(input.name, 'name')
  const base = slugFromName(name, 'colour')
  const inserted = await requireClient()
    .from('colours')
    .insert({
      id: uniqueId(name, await idsWithPrefix('colours', base), 'colour'),
      name,
      hex: normalizeHex(input.hex),
      finish: input.finish === 'oak' ? 'oak' : 'solid',
      active: input.active,
      sort_order: await nextSort('colours'),
    })
    .select('id')
  fail(inserted.error, 'Could not add that colour.')
  written(inserted.data, 'Could not add that colour.')
}

export async function removeColour(id: string): Promise<void> {
  const removed = await requireClient().from('colours').delete().eq('id', id).select('id')
  fail(removed.error, 'Could not remove that colour.')
  written(removed.data, 'Could not remove that colour.')
}

export async function saveColour(input: CatalogColour): Promise<void> {
  const updated = await requireClient()
    .from('colours')
    .update({
      name: requiredText(input.name, 'name'),
      hex: normalizeHex(input.hex),
      finish: input.finish === 'oak' ? 'oak' : 'solid',
      active: input.active,
    })
    .eq('id', input.id)
    .select('id')
  fail(updated.error, 'Could not save that colour.')
  written(updated.data, 'Could not save that colour.')
}

export async function addGlazing(input: {
  name: string
  addonPerM2: number
  description: string
  glassType: string
  gasFill: string
  active: boolean
}): Promise<void> {
  const name = requiredText(input.name, 'name')
  const base = slugFromName(name, 'glazing')
  const inserted = await requireClient()
    .from('glazing_options')
    .insert({
      id: uniqueId(name, await idsWithPrefix('glazing_options', base), 'glazing'),
      name,
      addon_per_m2: nonNegative(input.addonPerM2, 'Price'),
      description: input.description.trim(),
      glass_type: input.glassType.trim(),
      gas_fill: input.gasFill.trim(),
      active: input.active,
      sort_order: await nextSort('glazing_options'),
    })
    .select('id')
  fail(inserted.error, 'Could not add that glazing.')
  written(inserted.data, 'Could not add that glazing.')
}

export async function removeGlazing(id: string): Promise<void> {
  const removed = await requireClient().from('glazing_options').delete().eq('id', id).select('id')
  fail(removed.error, 'Could not remove that glazing.')
  written(removed.data, 'Could not remove that glazing.')
}

export async function saveGlazing(input: CatalogGlazing): Promise<void> {
  const updated = await requireClient()
    .from('glazing_options')
    .update({
      name: requiredText(input.name, 'name'),
      addon_per_m2: nonNegative(input.addonPerM2, 'Price'),
      description: input.description.trim(),
      glass_type: input.glassType.trim(),
      gas_fill: input.gasFill.trim(),
      active: input.active,
    })
    .eq('id', input.id)
    .select('id')
  fail(updated.error, 'Could not save that glazing.')
  written(updated.data, 'Could not save that glazing.')
}
