import { describe, expect, it } from 'vitest'
import { createQuote } from '../domain/factories.ts'
import { assertJobNo, quoteFromDocument, quoteToRow } from './SupabaseQuoteRepository.ts'

describe('quote rows', () => {
  it('stores the whole quote and the list columns for the signed-in user', () => {
    const quote = createQuote('SP-0001', 20)
    quote.reference = 'Front'
    quote.customer.name = 'Ada'
    const row = quoteToRow({ ...quote, owner: 'someone-else' } as typeof quote & { owner: string }, 'user-1')

    expect(row.user_id).toBe('user-1')
    expect(row.job_no).toBe('SP-0001')
    expect(row.reference).toBe('Front')
    expect(row.customer_name).toBe('Ada')
    expect(row.status).toBe('draft')
    expect(row.created_at).toBe(quote.createdAt)
    expect(row.updated_at).toBe(quote.updatedAt)
    expect(row.document.jobNo).toBe('SP-0001')
    expect(row.document).not.toHaveProperty('owner')
  })

  it('reads a document back and drops an owner field', () => {
    const quote = createQuote('SP-0002', 20)
    const parsed = quoteFromDocument({ ...quote, owner: 'someone-else' })
    expect(parsed?.id).toBe(quote.id)
    expect(parsed).not.toHaveProperty('owner')
    expect(quoteFromDocument({ id: 'x', jobNo: 'SP-0002', status: 'sent' })).toBeNull()
  })

  it('accepts job numbers from next_job_no', () => {
    expect(assertJobNo('SP-0001')).toBe('SP-0001')
    expect(assertJobNo(' SP-10000 ')).toBe('SP-10000')
    expect(() => assertJobNo('225')).toThrow(/job number/)
  })
})
