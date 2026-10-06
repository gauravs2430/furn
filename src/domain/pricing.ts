import type { Catalogue } from './catalogue.ts'
import { currentCatalogue } from './catalogue.ts'
import type { ItemPricing, PricingConfig, Quote, QuoteItem, QuoteTotals } from './models.ts'
import { calculateParts } from './parts.ts'
import { calculateArea, calculatePerimeter } from './measures.ts'
import { roundMoney } from '../utils/money.ts'

export { calculateArea, calculatePerimeter }

export function calculateItemPrice(item: QuoteItem, config: PricingConfig, catalogue: Catalogue = currentCatalogue()): ItemPricing {
  const areaM2 = calculateArea(item.widthMm, item.heightMm)
  const perimeterM = calculatePerimeter(item.widthMm, item.heightMm)
  const parts = calculateParts(item, catalogue)
  const partsCost = roundMoney(parts.reduce((sum, part) => sum + part.quantity * part.unitPrice, 0))
  const markup = 1 + Math.max(0, config.markupPercent) / 100
  const unitPrice = roundMoney(partsCost * markup)
  const lineTotal = roundMoney(unitPrice * Math.max(1, item.quantity))
  return { areaM2, perimeterM, parts, partsCost, unitPrice, lineTotal }
}

export function calculateSubtotal(items: QuoteItem[], config: PricingConfig, catalogue: Catalogue = currentCatalogue()): number {
  return roundMoney(items.reduce((sum, item) => sum + calculateItemPrice(item, config, catalogue).lineTotal, 0))
}

export function calculateDiscount(subtotal: number, discountPercent: number): number {
  const percent = Math.min(100, Math.max(0, discountPercent))
  return roundMoney(subtotal * (percent / 100))
}

export function calculateTax(net: number, taxPercent: number): number {
  const percent = Math.max(0, taxPercent)
  return roundMoney(net * (percent / 100))
}

export function calculateGrandTotal(net: number, tax: number): number {
  return roundMoney(net + tax)
}

export function calculateQuoteTotals(quote: Quote, config: PricingConfig, catalogue: Catalogue = currentCatalogue()): QuoteTotals {
  const subtotal = calculateSubtotal(quote.items, config, catalogue)
  const discountAmount = calculateDiscount(subtotal, quote.discountPercent)
  const net = roundMoney(subtotal - discountAmount)
  const taxAmount = calculateTax(net, quote.taxPercent)
  return {
    subtotal,
    discountPercent: quote.discountPercent,
    discountAmount,
    taxPercent: quote.taxPercent,
    taxAmount,
    grandTotal: calculateGrandTotal(net, taxAmount),
  }
}
