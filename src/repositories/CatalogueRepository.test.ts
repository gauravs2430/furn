import { describe, expect, it } from 'vitest'
import { catalogueFromTables } from './CatalogueRepository.ts'

const empty = { products: [], parts: [], links: [], materials: [], colours: [], glazing: [] }

describe('catalogue rows', () => {
  it('uses the hardcoded lists when every table is empty', () => {
    const catalogue = catalogueFromTables(empty)
    const window = catalogue.products.find((product) => product.id === 'window')
    expect(window?.defaultWidth).toBe(1815)
    expect(window?.defaultHeight).toBe(1130)
    expect(window?.defaultPreset).toBe('casement-fixed-casement')
    expect(catalogue.parts.find((part) => part.id === 'frame')?.price).toBe(15)
    expect(catalogue.parts.find((part) => part.id === 'frame')?.quantityRule).toBe('builtin')
    expect(catalogue.links.some((link) => link.productId === 'window' && link.partId === 'frame' && link.included)).toBe(true)
  })

  it('keeps a price override and an excluded part from the link rows', () => {
    const catalogue = catalogueFromTables({
      ...empty,
      products: [
        {
          id: 'window',
          name: 'Window',
          family: 'window',
          summary: 'Casement',
          factor: '1',
          default_width_mm: '1815',
          default_height_mm: 1130,
          default_preset: 'casement-fixed-casement',
          active: true,
          sort_order: 1,
        },
      ],
      parts: [
        {
          id: 'handle',
          name: 'Handle set',
          unit: 'each',
          price: '18.00',
          quantity_rule: 'builtin',
          applies_material_factor: false,
          applies_product_factor: false,
          applies_glazing_addon: false,
          active: true,
          sort_order: 1,
        },
      ],
      links: [
        { product_id: 'window', part_id: 'handle', price_override: '40.5', fixed_qty: null, included: false },
      ],
    })
    expect(catalogue.products).toHaveLength(1)
    expect(catalogue.parts[0]?.price).toBe(18)
    expect(catalogue.links).toEqual([
      { productId: 'window', partId: 'handle', priceOverride: 40.5, fixedQty: null, included: false },
    ])
  })
})
