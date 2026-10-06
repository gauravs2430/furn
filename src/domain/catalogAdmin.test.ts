import { describe, expect, it } from 'vitest'
import { includedFamilyLinks, ilikeContains, slugFromName, uniqueId } from './catalogAdmin.ts'
import type { ProductPartLink } from './catalogue.ts'

const links: ProductPartLink[] = [
  { productId: 'window', partId: 'frame', priceOverride: 10, fixedQty: null, included: true },
  { productId: 'window', partId: 'seal', priceOverride: null, fixedQty: null, included: false },
  { productId: 'door', partId: 'frame', priceOverride: null, fixedQty: null, included: true },
]

describe('catalogue ids', () => {
  it('builds a slug from the product name', () => {
    expect(slugFromName('Handle Pack', 'product')).toBe('handle-pack')
    expect(slugFromName('  Bi-fold  ', 'product')).toBe('bi-fold')
    expect(slugFromName('Cill / threshold', 'product')).toBe('cill-threshold')
    expect(slugFromName('!!!', 'product')).toBe('product')
  })

  it('keeps a new id off an existing slug', () => {
    expect(uniqueId('Window', ['window'], 'product')).toBe('window-2')
    expect(uniqueId('Window', ['window', 'window-2'], 'product')).toBe('window-3')
    expect(uniqueId('Patio Door', ['window'], 'product')).toBe('patio-door')
  })

  it('escapes a search so % and _ stay literal', () => {
    expect(ilikeContains('  cill  ')).toBe('%cill%')
    expect(ilikeContains('100%')).toBe('%100\\%%')
    expect(ilikeContains('a_b')).toBe('%a\\_b%')
    expect(ilikeContains('   ')).toBeNull()
  })
})

describe('family part copy', () => {
  it('copies included parts from the seeded family and starts an accessory empty', () => {
    expect(includedFamilyLinks('window', links)).toEqual([
      { productId: 'window', partId: 'frame', priceOverride: 10, fixedQty: null, included: true },
    ])
    expect(includedFamilyLinks('door', links).map((link) => link.partId)).toEqual(['frame'])
    expect(includedFamilyLinks('accessory', links)).toEqual([])
    expect(includedFamilyLinks('patio', links)).toEqual([])
  })
})
