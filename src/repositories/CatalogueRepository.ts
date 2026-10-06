import type { CatalogColour, CatalogGlazing, CatalogMaterial, CatalogPart, CatalogProduct, Catalogue, ProductPartLink, QuantityRule } from '../domain/catalogue.ts'
import { QUANTITY_RULES, fallbackCatalogue } from '../domain/catalogue.ts'
import type { ProductFamily } from '../domain/models.ts'
import { PRODUCT_FAMILIES } from '../domain/models.ts'
import { supabase } from '../lib/supabase.ts'

const FAMILIES = new Set<string>(PRODUCT_FAMILIES)
const RULES = new Set<string>(QUANTITY_RULES)

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => (entry && typeof entry === 'object' ? [entry as Record<string, unknown>] : []))
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function optionalNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function byOrder<T extends { sortOrder: number; name: string }>(left: T, right: T): number {
  return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
}

export function mapProduct(row: Record<string, unknown>): CatalogProduct | null {
  const id = text(row.id).trim()
  const family = text(row.family)
  if (!id || !FAMILIES.has(family)) return null
  return {
    id,
    name: text(row.name, id),
    family: family as ProductFamily,
    summary: text(row.summary),
    factor: num(row.factor, 1),
    defaultWidth: num(row.default_width_mm, 1000),
    defaultHeight: num(row.default_height_mm, 1000),
    defaultPreset: text(row.default_preset),
    active: flag(row.active, true),
    sortOrder: num(row.sort_order, 0),
  }
}

export function mapPart(row: Record<string, unknown>): CatalogPart | null {
  const id = text(row.id).trim()
  if (!id) return null
  const rule = text(row.quantity_rule)
  return {
    id,
    name: text(row.name, id),
    unit: text(row.unit, 'each'),
    price: num(row.price, 0),
    quantityRule: (RULES.has(rule) ? rule : 'one') as QuantityRule,
    appliesMaterialFactor: flag(row.applies_material_factor, false),
    appliesProductFactor: flag(row.applies_product_factor, false),
    appliesGlazingAddon: flag(row.applies_glazing_addon, false),
    active: flag(row.active, true),
    sortOrder: num(row.sort_order, 0),
  }
}

export function mapLink(row: Record<string, unknown>): ProductPartLink | null {
  const productId = text(row.product_id).trim()
  const partId = text(row.part_id).trim()
  if (!productId || !partId) return null
  return {
    productId,
    partId,
    priceOverride: optionalNum(row.price_override),
    fixedQty: optionalNum(row.fixed_qty),
    included: flag(row.included, true),
  }
}

export function mapMaterial(row: Record<string, unknown>): CatalogMaterial | null {
  const id = text(row.id).trim()
  if (!id) return null
  return {
    id,
    name: text(row.name, id),
    factor: num(row.factor, 1),
    active: flag(row.active, true),
    sortOrder: num(row.sort_order, 0),
  }
}

export function mapColour(row: Record<string, unknown>): CatalogColour | null {
  const id = text(row.id).trim()
  if (!id) return null
  return {
    id,
    name: text(row.name, id),
    hex: text(row.hex, '#F4F1EA'),
    finish: text(row.finish) === 'oak' ? 'oak' : 'solid',
    active: flag(row.active, true),
    sortOrder: num(row.sort_order, 0),
  }
}

export function mapGlazing(row: Record<string, unknown>): CatalogGlazing | null {
  const id = text(row.id).trim()
  if (!id) return null
  return {
    id,
    name: text(row.name, id),
    addonPerM2: num(row.addon_per_m2, 0),
    description: text(row.description),
    glassType: text(row.glass_type),
    gasFill: text(row.gas_fill),
    active: flag(row.active, true),
    sortOrder: num(row.sort_order, 0),
  }
}

export interface CatalogueTables {
  products: unknown
  parts: unknown
  links: unknown
  materials: unknown
  colours: unknown
  glazing: unknown
}

/** An empty table keeps the hardcoded seed. A table with rows replaces that list. */
export function catalogueFromTables(tables: CatalogueTables): Catalogue {
  const fallback = fallbackCatalogue()
  const products = rows(tables.products).flatMap((row) => {
    const product = mapProduct(row)
    return product ? [product] : []
  })
  const parts = rows(tables.parts).flatMap((row) => {
    const part = mapPart(row)
    return part ? [part] : []
  })
  const links = rows(tables.links).flatMap((row) => {
    const link = mapLink(row)
    return link ? [link] : []
  })
  const materials = rows(tables.materials).flatMap((row) => {
    const material = mapMaterial(row)
    return material ? [material] : []
  })
  const colours = rows(tables.colours).flatMap((row) => {
    const colour = mapColour(row)
    return colour ? [colour] : []
  })
  const glazing = rows(tables.glazing).flatMap((row) => {
    const option = mapGlazing(row)
    return option ? [option] : []
  })
  return {
    products: products.length > 0 ? products.sort(byOrder) : fallback.products,
    parts: parts.length > 0 ? parts.sort(byOrder) : fallback.parts,
    links: links.length > 0 ? links : fallback.links,
    materials: materials.length > 0 ? materials.sort(byOrder) : fallback.materials,
    colours: colours.length > 0 ? colours.sort(byOrder) : fallback.colours,
    glazing: glazing.length > 0 ? glazing.sort(byOrder) : fallback.glazing,
  }
}

function queryCatalogueTables() {
  const client = requireClient()
  return Promise.all([
    client.from('products').select('id, name, family, summary, factor, default_width_mm, default_height_mm, default_preset, active, sort_order').order('sort_order'),
    client.from('parts').select('id, name, unit, price, quantity_rule, applies_material_factor, applies_product_factor, applies_glazing_addon, active, sort_order').order('sort_order'),
    client.from('product_parts').select('product_id, part_id, price_override, fixed_qty, included'),
    client.from('materials').select('id, name, factor, active, sort_order').order('sort_order'),
    client.from('colours').select('id, name, hex, finish, active, sort_order').order('sort_order'),
    client.from('glazing_options').select('id, name, addon_per_m2, description, glass_type, gas_fill, active, sort_order').order('sort_order'),
  ])
}

export async function fetchCatalogue(): Promise<Catalogue> {
  const [products, parts, links, materials, colours, glazing] = await queryCatalogueTables()
  return catalogueFromTables({
    products: products.error ? [] : products.data,
    parts: parts.error ? [] : parts.data,
    links: links.error ? [] : links.data,
    materials: materials.error ? [] : materials.data,
    colours: colours.error ? [] : colours.data,
    glazing: glazing.error ? [] : glazing.data,
  })
}

/** Same lists as fetchCatalogue, but a failed read is reported instead of falling back to the seed. */
export async function fetchCatalogueStrict(): Promise<Catalogue> {
  const [products, parts, links, materials, colours, glazing] = await queryCatalogueTables()
  const error = products.error ?? parts.error ?? links.error ?? materials.error ?? colours.error ?? glazing.error
  if (error) throw new Error(error.message)
  return catalogueFromTables({
    products: products.data,
    parts: parts.data,
    links: links.data,
    materials: materials.data,
    colours: colours.data,
    glazing: glazing.data,
  })
}
