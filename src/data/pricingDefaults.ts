import type { PricingConfig } from '../domain/models.ts'
import { glazingOptions, materials, products } from './productCatalog.ts'

export interface PartDefinition {
  id: string
  name: string
  unit: string
  price: number
  appliesMaterialFactor?: boolean
  appliesProductFactor?: boolean
  appliesGlazingAddon?: boolean
}

/** Demo catalogue rates, ported from the Measure & Order reference. */
export const partCatalog: PartDefinition[] = [
  { id: 'frame', name: 'Frame profile', unit: 'm', price: 15, appliesMaterialFactor: true, appliesProductFactor: true },
  { id: 'glass', name: 'Sealed glass unit', unit: 'm²', price: 55, appliesGlazingAddon: true },
  { id: 'leaf', name: 'Door leaf panel', unit: 'm²', price: 70 },
  { id: 'french', name: 'French door leaf', unit: 'each', price: 120 },
  { id: 'panel', name: 'Sliding or folding panel frame', unit: 'each', price: 85 },
  { id: 'track', name: 'Track and runner set', unit: 'each', price: 95 },
  { id: 'sash', name: 'Opening sash', unit: 'each', price: 38 },
  { id: 'hinge', name: 'Hinge', unit: 'each', price: 9 },
  { id: 'lock', name: 'Multi-point lock', unit: 'each', price: 35 },
  { id: 'handle', name: 'Handle set', unit: 'each', price: 18 },
  { id: 'cylinder', name: 'Euro cylinder', unit: 'each', price: 16 },
  { id: 'threshold', name: 'Threshold', unit: 'm', price: 22 },
  { id: 'cill', name: 'Cill', unit: 'm', price: 12 },
  { id: 'seal', name: 'Weather seals', unit: 'm', price: 1.6 },
  { id: 'bead', name: 'Glazing beads', unit: 'm', price: 2.5 },
  { id: 'fixings', name: 'Fixings and sundries', unit: 'each', price: 8 },
  { id: 'labour', name: 'Fabrication labour', unit: 'hr', price: 28, appliesProductFactor: true },
]

export const pricingDefaults: PricingConfig = {
  markupPercent: 30,
  taxPercent: 20,
  partPrices: Object.fromEntries(partCatalog.map((part) => [part.id, part.price])),
  materialFactors: Object.fromEntries(materials.map((material) => [material.id, material.factor])),
  glazingAddons: Object.fromEntries(glazingOptions.map((option) => [option.id, option.addonPerM2])),
  productFactors: Object.fromEntries(products.map((product) => [product.id, product.factor])),
}

export const LIMITS = {
  widthMin: 200,
  widthMax: 6000,
  heightMin: 200,
  heightMax: 3000,
  quantityMin: 1,
  quantityMax: 99,
  discountMin: 0,
  discountMax: 100,
  taxMin: 0,
  taxMax: 40,
  singleDoorMaxWidth: 1100,
  maxPanels: 6,
} as const
