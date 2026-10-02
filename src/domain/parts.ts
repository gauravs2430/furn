import type { PanelKind, PartLine, PricingConfig, QuoteItem } from './models.ts'
import { partCatalog } from '../data/pricingDefaults.ts'
import { calculateArea, calculatePerimeter } from './measures.ts'

function roundQty(value: number): number {
  return Math.round(value * 100) / 100
}

function isOpening(kind: PanelKind): boolean {
  return kind !== 'fixed'
}

function isGlazed(kind: PanelKind): boolean {
  return kind !== 'solid'
}

function glassFactor(item: QuoteItem): number {
  if (item.panels.every((panel) => panel.kind === 'solid')) return 0
  if (item.productType === 'door') {
    if (item.panels.some((panel) => panel.kind === 'half-glazed')) return 0.5
    if (item.panels.length >= 2) return 0.75
    return 0.5
  }
  return 0.9
}

export function partQuantities(item: QuoteItem): Record<string, number> {
  const area = calculateArea(item.widthMm, item.heightMm)
  const perimeter = calculatePerimeter(item.widthMm, item.heightMm)
  const widthM = item.widthMm / 1000
  const openings = item.panels.filter((panel) => isOpening(panel.kind))
  const openingCount = openings.length
  const sashCount = item.panels.filter((panel) =>
    ['casement-left', 'casement-right', 'tilt-turn-left', 'tilt-turn-right'].includes(panel.kind),
  ).length
  const slidingCount = item.panels.filter((panel) => panel.kind === 'sliding' || panel.kind === 'bifold').length
  const french = item.productType === 'door' && item.panels.length >= 2 && item.panels.every((panel) => isGlazed(panel.kind))
  const solidLeaf = item.productType === 'door' && item.panels.length === 1 && !french
  const glazed = glassFactor(item) > 0
  const isWindow = item.productType === 'window'
  const moving = item.productType === 'patio' || item.productType === 'bifold' || slidingCount > 0

  const bifoldCount = item.panels.filter((panel) => panel.kind === 'bifold').length
  const hingeCount = french
    ? 6
    : item.productType === 'door' && openingCount > 0
      ? 3
      : sashCount > 0
        ? sashCount * 2
        : bifoldCount > 0
          ? bifoldCount + 1
          : 0

  return {
    frame: roundQty(perimeter),
    glass: glazed ? roundQty(area * glassFactor(item)) : 0,
    leaf: solidLeaf ? roundQty(area * (item.panels[0]?.kind === 'solid' ? 0.95 : 0.5)) : 0,
    french: french ? 2 : 0,
    panel: item.productType === 'patio' || item.productType === 'bifold' ? Math.max(item.panels.length, 1) : 0,
    track: moving ? 1 : 0,
    sash: sashCount,
    hinge: hingeCount,
    lock: openingCount > 0 ? 1 : 0,
    handle: openingCount > 0 ? Math.max(1, french ? 2 : openingCount > 2 ? 1 : openingCount) : 0,
    cylinder: item.productType === 'window' ? 0 : openingCount > 0 ? 1 : 0,
    threshold: isWindow ? 0 : roundQty(widthM),
    cill: isWindow && item.technical.cill !== 'None' ? roundQty(widthM) : 0,
    seal: roundQty(perimeter),
    bead: glazed ? roundQty(perimeter) : 0,
    fixings: 1,
    labour: roundQty(1.5 + area * 0.8),
  }
}

export function calculateParts(item: QuoteItem, config: PricingConfig): PartLine[] {
  const quantities = partQuantities(item)
  const materialFactor = config.materialFactors[item.materialId] ?? 1
  const productFactor = config.productFactors[item.productType] ?? 1
  const glazingAddon = config.glazingAddons[item.glazingId] ?? 0

  return partCatalog
    .map((definition) => {
      const quantity = quantities[definition.id] ?? 0
      if (quantity <= 0) return null
      const base = config.partPrices[definition.id] ?? definition.price
      let unitPrice = base
      if (definition.appliesMaterialFactor) unitPrice *= materialFactor
      if (definition.appliesProductFactor) unitPrice *= productFactor
      if (definition.appliesGlazingAddon) unitPrice += glazingAddon
      return {
        id: definition.id,
        name: definition.name,
        unit: definition.unit,
        quantity,
        unitPrice: Math.round(unitPrice * 100) / 100,
      }
    })
    .filter((part): part is PartLine => part !== null)
}
