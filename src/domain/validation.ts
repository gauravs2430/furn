import { z } from 'zod'
import { LIMITS } from '../data/pricingDefaults.ts'
import { PANEL_KINDS, PRODUCT_TYPES } from './models.ts'
import type { Customer, QuoteItem } from './models.ts'
import { panelWidthTotal } from './factories.ts'

export interface ValidationIssue {
  path: string
  message: string
}

const itemSchema = z.object({
  productType: z.enum(PRODUCT_TYPES),
  widthMm: z.number().min(LIMITS.widthMin).max(LIMITS.widthMax),
  heightMm: z.number().min(LIMITS.heightMin).max(LIMITS.heightMax),
  quantity: z.number().int().min(LIMITS.quantityMin).max(LIMITS.quantityMax),
  location: z.string(),
  panels: z
    .array(
      z.object({
        id: z.string(),
        widthMm: z.number().positive(),
        kind: z.enum(PANEL_KINDS),
      }),
    )
    .min(1)
    .max(LIMITS.maxPanels),
})

export function validateItem(item: QuoteItem): ValidationIssue[] {
  if (item.productType === 'accessory') {
    if (!Number.isInteger(item.quantity) || item.quantity < LIMITS.quantityMin || item.quantity > LIMITS.quantityMax) {
      return [{ path: 'quantity', message: 'Quantity must be at least 1.' }]
    }
    return []
  }

  const issues: ValidationIssue[] = []
  const parsed = itemSchema.safeParse(item)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.') || 'item'
      if (path === 'widthMm') {
        issues.push({ path, message: `Width must be between ${LIMITS.widthMin} and ${LIMITS.widthMax} mm.` })
      } else if (path === 'heightMm') {
        issues.push({ path, message: `Height must be between ${LIMITS.heightMin} and ${LIMITS.heightMax} mm.` })
      } else if (path === 'quantity') {
        issues.push({ path, message: 'Quantity must be at least 1.' })
      } else if (path.endsWith('widthMm')) {
        issues.push({ path, message: 'Each panel width must be greater than 0.' })
      } else {
        issues.push({ path, message: issue.message })
      }
    }
  }

  const total = panelWidthTotal(item.panels)
  if (item.panels.length > 0 && total !== item.widthMm) {
    const delta = item.widthMm - total
    issues.push({
      path: 'panels',
      message:
        delta > 0
          ? `Panel widths total ${total} mm. ${delta} mm remaining.`
          : `Panel widths total ${total} mm. ${Math.abs(delta)} mm over the overall width.`,
    })
  }

  const singleSolid =
    item.productType === 'door' &&
    item.panels.length === 1 &&
    (item.panels[0]?.kind === 'solid' || item.panels[0]?.kind === 'half-glazed')
  if (singleSolid && item.widthMm > LIMITS.singleDoorMaxWidth) {
    issues.push({
      path: 'widthMm',
      message: 'A single door wider than 1100 mm needs a pair or a different style.',
    })
  }

  return issues
}

export function validateCustomer(customer: Customer): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!customer.name.trim()) {
    issues.push({ path: 'name', message: 'Customer name is required before quoting or booking.' })
  }
  if (customer.email.trim() && !z.string().email().safeParse(customer.email.trim()).success) {
    issues.push({ path: 'email', message: 'Enter a valid email address or leave it blank.' })
  }
  return issues
}

export function clampPercent(value: number, max = 100): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(0, value))
}
