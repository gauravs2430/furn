import { colours, glazingOptions, materials, products } from '../data/productCatalog.ts'
import { partCatalog } from '../data/pricingDefaults.ts'
import type { ProductFamily } from './models.ts'

export const QUANTITY_RULES = [
  'builtin',
  'perimeter',
  'area',
  'width',
  'per-opening',
  'per-sash',
  'per-panel',
  'one',
  'fixed',
] as const

export type QuantityRule = (typeof QUANTITY_RULES)[number]

export interface CatalogProduct {
  id: string
  name: string
  family: ProductFamily
  summary: string
  factor: number
  defaultWidth: number
  defaultHeight: number
  defaultPreset: string
  active: boolean
  sortOrder: number
}

export interface CatalogPart {
  id: string
  name: string
  unit: string
  price: number
  quantityRule: QuantityRule
  appliesMaterialFactor: boolean
  appliesProductFactor: boolean
  appliesGlazingAddon: boolean
  active: boolean
  sortOrder: number
}

export interface ProductPartLink {
  productId: string
  partId: string
  priceOverride: number | null
  fixedQty: number | null
  included: boolean
}

export interface CatalogMaterial {
  id: string
  name: string
  factor: number
  active: boolean
  sortOrder: number
}

export interface CatalogColour {
  id: string
  name: string
  hex: string
  finish: 'solid' | 'oak'
  active: boolean
  sortOrder: number
}

export interface CatalogGlazing {
  id: string
  name: string
  addonPerM2: number
  description: string
  glassType: string
  gasFill: string
  active: boolean
  sortOrder: number
}

export interface Catalogue {
  products: CatalogProduct[]
  parts: CatalogPart[]
  links: ProductPartLink[]
  materials: CatalogMaterial[]
  colours: CatalogColour[]
  glazing: CatalogGlazing[]
}

export function fallbackCatalogue(): Catalogue {
  const catalogProducts: CatalogProduct[] = products.map((product, index) => ({
    id: product.id,
    name: product.name,
    family: product.id,
    summary: product.summary,
    factor: product.factor,
    defaultWidth: product.defaultWidth,
    defaultHeight: product.defaultHeight,
    defaultPreset: product.defaultPreset,
    active: true,
    sortOrder: index + 1,
  }))
  const catalogParts: CatalogPart[] = partCatalog.map((part, index) => ({
    id: part.id,
    name: part.name,
    unit: part.unit,
    price: part.price,
    quantityRule: 'builtin',
    appliesMaterialFactor: part.appliesMaterialFactor ?? false,
    appliesProductFactor: part.appliesProductFactor ?? false,
    appliesGlazingAddon: part.appliesGlazingAddon ?? false,
    active: true,
    sortOrder: index + 1,
  }))
  return {
    products: catalogProducts,
    parts: catalogParts,
    links: catalogProducts.flatMap((product) =>
      catalogParts.map((part) => ({
        productId: product.id,
        partId: part.id,
        priceOverride: null,
        fixedQty: null,
        included: true,
      })),
    ),
    materials: materials.map((material, index) => ({
      id: material.id,
      name: material.name,
      factor: material.factor,
      active: true,
      sortOrder: index + 1,
    })),
    colours: colours.map((colour, index) => ({
      id: colour.id,
      name: colour.name,
      hex: colour.hex,
      finish: colour.finish,
      active: true,
      sortOrder: index + 1,
    })),
    glazing: glazingOptions.map((option, index) => ({
      id: option.id,
      name: option.name,
      addonPerM2: option.addonPerM2,
      description: option.description,
      glassType: option.glassType,
      gasFill: option.gasFill,
      active: true,
      sortOrder: index + 1,
    })),
  }
}

let liveCatalogue = fallbackCatalogue()

export function currentCatalogue(): Catalogue {
  return liveCatalogue
}

export function replaceCatalogue(catalogue: Catalogue) {
  liveCatalogue = catalogue
}

function firstOf<T>(items: T[], label: string): T {
  const first = items[0]
  if (!first) throw new Error(`The ${label} list is empty.`)
  return first
}

export function findProduct(id: string, catalogue = currentCatalogue()): CatalogProduct {
  return (
    catalogue.products.find((product) => product.id === id) ??
    catalogue.products.find((product) => product.id === 'window') ??
    firstOf(catalogue.products, 'product')
  )
}

export function findMaterial(id: string, catalogue = currentCatalogue()): CatalogMaterial {
  return catalogue.materials.find((material) => material.id === id) ?? firstOf(catalogue.materials, 'material')
}

export function findGlazing(id: string, catalogue = currentCatalogue()): CatalogGlazing {
  return catalogue.glazing.find((option) => option.id === id) ?? firstOf(catalogue.glazing, 'glazing')
}

export function findColour(id: string, catalogue = currentCatalogue()): CatalogColour {
  return catalogue.colours.find((colour) => colour.id === id) ?? firstOf(catalogue.colours, 'colour')
}
