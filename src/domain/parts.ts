import type { CatalogPart, Catalogue, QuantityRule } from './catalogue.ts'
import { currentCatalogue } from './catalogue.ts'
import type { PanelKind, PartLine, QuoteItem } from './models.ts'
import { itemProductId } from './models.ts'
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

function openingCount(item: QuoteItem): number {
  return item.panels.filter((panel) => panel.kind !== 'fixed').length
}

function sashCount(item: QuoteItem): number {
  return item.panels.filter((panel) =>
    ['casement-left', 'casement-right', 'tilt-turn-left', 'tilt-turn-right'].includes(panel.kind),
  ).length
}

function quantityFor(rule: QuantityRule, item: QuoteItem, partId: string, fixedQty: number | null): number {
  if (item.productType === 'accessory') return fixedQty ?? 1
  switch (rule) {
    case 'builtin':
      return partQuantities(item)[partId] ?? 0
    case 'perimeter':
      return roundQty(calculatePerimeter(item.widthMm, item.heightMm))
    case 'area':
      return roundQty(calculateArea(item.widthMm, item.heightMm))
    case 'width':
      return roundQty(item.widthMm / 1000)
    case 'per-opening':
      return openingCount(item)
    case 'per-sash':
      return sashCount(item)
    case 'per-panel':
      return item.panels.length
    case 'one':
      return 1
    case 'fixed':
      return fixedQty ?? 1
    default:
      return 0
  }
}

export function calculateParts(item: QuoteItem, catalogue: Catalogue = currentCatalogue()): PartLine[] {
  const productId = itemProductId(item)
  const product = catalogue.products.find((entry) => entry.id === productId)
  const materialFactor = catalogue.materials.find((entry) => entry.id === item.materialId)?.factor ?? 1
  const productFactor = product?.factor ?? 1
  const glazingAddon = catalogue.glazing.find((entry) => entry.id === item.glazingId)?.addonPerM2 ?? 0
  const partsById = new Map(catalogue.parts.map((part) => [part.id, part]))

  return catalogue.links
    .filter((link) => link.productId === productId && link.included)
    .map((link) => {
      const definition = partsById.get(link.partId)
      if (!definition?.active) return null
      const quantity = quantityFor(definition.quantityRule, item, definition.id, link.fixedQty)
      if (quantity <= 0) return null
      return lineFor(definition, quantity, link.priceOverride, materialFactor, productFactor, glazingAddon)
    })
    .filter((part): part is PartLine => part !== null)
    .sort((left, right) => (partsById.get(left.id)?.sortOrder ?? 0) - (partsById.get(right.id)?.sortOrder ?? 0))
}

function lineFor(
  definition: CatalogPart,
  quantity: number,
  priceOverride: number | null,
  materialFactor: number,
  productFactor: number,
  glazingAddon: number,
): PartLine {
  let unitPrice = priceOverride ?? definition.price
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
}
