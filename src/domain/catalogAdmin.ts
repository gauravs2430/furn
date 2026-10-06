import type { ProductFamily } from './models.ts'
import type { ProductPartLink, QuantityRule } from './catalogue.ts'
import { QUANTITY_RULES } from './catalogue.ts'

export const CATALOG_PAGE_SIZE = 25
export const OPTION_SEARCH_AFTER = 5

export const ADMIN_QUANTITY_RULES = QUANTITY_RULES.filter((rule) => rule !== 'builtin')

export type AdminQuantityRule = (typeof ADMIN_QUANTITY_RULES)[number]

export const QUANTITY_RULE_LABELS: Record<QuantityRule, string> = {
  builtin: 'Built-in formula',
  perimeter: 'Perimeter — metres around the opening',
  area: 'Area — square metres',
  width: 'Width — width in metres',
  'per-opening': 'Per opening — one for each opening panel',
  'per-sash': 'Per sash — one for each casement or tilt-turn',
  'per-panel': 'Per panel — one for each panel',
  one: 'One — a single unit',
  fixed: 'Fixed — quantity on this product',
}

export function slugFromName(name: string, fallback = 'item'): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
  return slug || fallback
}

export function uniqueId(name: string, taken: Iterable<string>, fallback = 'item'): string {
  const used = new Set(taken)
  const base = slugFromName(name, fallback)
  if (!used.has(base)) return base
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function ilikeContains(query: string): string | null {
  const trimmed = query.trim()
  if (!trimmed) return null
  return `%${trimmed.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
}

/** Included parts copied from the seeded family product. An accessory starts with none. */
export function includedFamilyLinks(family: ProductFamily, links: ProductPartLink[]): ProductPartLink[] {
  if (family === 'accessory') return []
  return links.filter((link) => link.productId === family && link.included)
}

export function isAdminQuantityRule(value: string): value is AdminQuantityRule {
  return (ADMIN_QUANTITY_RULES as readonly string[]).includes(value)
}
