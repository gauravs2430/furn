import { describe, expect, it } from 'vitest'
import { matchesQuery } from './filters.ts'

describe('matchesQuery', () => {
  it('keeps every row when the search is empty', () => {
    expect(matchesQuery('   ', 'Ada', 'ada@example.com')).toBe(true)
  })

  it('matches a name or an email', () => {
    expect(matchesQuery('ada', 'Ada Lovelace', 'ada@example.com')).toBe(true)
    expect(matchesQuery('EXAMPLE', 'Ada', 'ada@example.com')).toBe(true)
  })

  it('does not match a different person', () => {
    expect(matchesQuery('grace', 'Ada', 'ada@example.com')).toBe(false)
  })

  it('matches a job number, customer, or reference', () => {
    expect(matchesQuery('sp-0002', 'SP-0002', 'Ada', 'Front door')).toBe(true)
    expect(matchesQuery('front', 'SP-0002', 'Ada', 'Front door')).toBe(true)
    expect(matchesQuery('ada', 'SP-0002', 'Ada', 'Front door')).toBe(true)
    expect(matchesQuery('patio', 'SP-0002', 'Ada', 'Front door')).toBe(false)
  })
})
