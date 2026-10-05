import { describe, expect, it } from 'vitest'
import { pricingDefaults } from '../data/pricingDefaults.ts'
import { missingPriceListMessage, pricingConfigFromJson, pricingRowUpdate, unreadablePriceListMessage } from './PricingConfigRepository.ts'

describe('pricing config rows', () => {
  it('reads the company price list', () => {
    const config = pricingConfigFromJson(structuredClone(pricingDefaults))
    expect(config?.partPrices.frame).toBe(pricingDefaults.partPrices.frame)
    expect(config?.markupPercent).toBe(30)
    expect(config?.taxPercent).toBe(20)
  })

  it('rejects a row that is missing catalogue prices', () => {
    const broken = structuredClone(pricingDefaults)
    delete broken.partPrices.frame
    expect(pricingConfigFromJson(broken)).toBeNull()
    expect(pricingConfigFromJson(null)).toBeNull()
    expect(unreadablePriceListMessage).toMatch(/pricing_config/)
    expect(missingPriceListMessage).toMatch(/pricing_config/)
  })

  it('writes the jsonb config and who saved it', () => {
    const row = pricingRowUpdate(pricingDefaults, 'admin-1', '2026-10-05T12:00:00.000Z')
    expect(row.updated_by).toBe('admin-1')
    expect(row.updated_at).toBe('2026-10-05T12:00:00.000Z')
    expect(row.config.partPrices.frame).toBe(pricingDefaults.partPrices.frame)
  })
})
