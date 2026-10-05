import type { PricingConfig } from '../domain/models.ts'
import { pricingDefaults } from '../data/pricingDefaults.ts'
import { supabase } from '../lib/supabase.ts'

export const missingPriceListMessage = 'The price list is missing. Check the pricing_config table.'
export const unreadablePriceListMessage = 'The price list could not be read. Check the pricing_config table.'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function numberRecord(value: unknown, required: string[]): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'number' || !Number.isFinite(entry)) return null
    record[key] = entry
  }
  for (const key of required) {
    if (!(key in record)) return null
  }
  return record
}

export function pricingConfigFromJson(value: unknown): PricingConfig | null {
  const source = typeof value === 'string' ? parseJson(value) : value
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null
  const raw = source as Record<string, unknown>
  if (typeof raw.markupPercent !== 'number' || !Number.isFinite(raw.markupPercent)) return null
  if (typeof raw.taxPercent !== 'number' || !Number.isFinite(raw.taxPercent)) return null
  const partPrices = numberRecord(raw.partPrices, Object.keys(pricingDefaults.partPrices))
  const materialFactors = numberRecord(raw.materialFactors, Object.keys(pricingDefaults.materialFactors))
  const glazingAddons = numberRecord(raw.glazingAddons, Object.keys(pricingDefaults.glazingAddons))
  const productFactors = numberRecord(raw.productFactors, Object.keys(pricingDefaults.productFactors))
  if (!partPrices || !materialFactors || !glazingAddons || !productFactors) return null
  return {
    markupPercent: raw.markupPercent,
    taxPercent: raw.taxPercent,
    partPrices,
    materialFactors,
    glazingAddons,
    productFactors,
  }
}

export function pricingRowUpdate(config: PricingConfig, userId: string, updatedAt: string) {
  return {
    config,
    updated_by: userId,
    updated_at: updatedAt,
  }
}

export async function fetchPricingConfig(): Promise<PricingConfig> {
  const { data, error } = await requireClient().from('pricing_config').select('config').eq('id', 1).maybeSingle()
  if (error) throw error
  if (!data) throw new Error(missingPriceListMessage)
  const config = pricingConfigFromJson(data.config)
  if (!config) throw new Error(unreadablePriceListMessage)
  return config
}

export async function savePricingConfig(config: PricingConfig): Promise<void> {
  const client = requireClient()
  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('You are not signed in.')
  const { data, error } = await client
    .from('pricing_config')
    .update(pricingRowUpdate(config, userId, new Date().toISOString()))
    .eq('id', 1)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(missingPriceListMessage)
}
