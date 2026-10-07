import { describe, expect, it } from 'vitest'
import { createQuote, createQuoteItem } from '../domain/factories.ts'
import { assertJobNo, ownerCanWrite, quoteAccessFromRow, quoteFromDocument, quoteToRow } from './SupabaseQuoteRepository.ts'

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

  it('keeps removed and added parts inside the quote document', () => {
    const quote = createQuote('SP-0008', 20)
    const item = createQuoteItem('window')
    item.removedPartIds = ['handle']
    item.addedParts = [{ partId: 'lining', fixedQty: 2 }]
    quote.items = [item]
    const parsed = quoteFromDocument(quoteToRow(quote, 'user-1').document)
    expect(parsed?.items[0]?.removedPartIds).toEqual(['handle'])
    expect(parsed?.items[0]?.addedParts).toEqual([{ partId: 'lining', fixedQty: 2 }])
    const legacy = createQuoteItem('window')
    const old = quoteFromDocument({ ...quote, items: [legacy] })
    expect(old?.items[0]?.removedPartIds).toBeUndefined()
    expect(old?.items[0]?.addedParts).toBeUndefined()
  })

  it('keeps an older opening that stored only the family', () => {
    const quote = createQuote('SP-0004', 20)
    const draft = quote.configDraft
    if (!draft) throw new Error('missing draft')
    const legacy = { ...draft }
    delete (legacy as { productId?: string }).productId
    const parsed = quoteFromDocument({ ...quote, items: [legacy], configDraft: legacy })
    expect(parsed?.items[0]?.productType).toBe('window')
    expect(parsed?.items[0]?.productId).toBe('window')
    expect(parsed?.configDraft?.productId).toBe('window')
  })

  it('reads an admin list row with the owner email from profiles', () => {
    const quote = createQuote('SP-0003', 20)
    quote.customer.name = 'Ada'
    const row = quoteAccessFromRow({
      id: quote.id,
      user_id: 'user-2',
      updated_at: '2026-01-02T00:00:00.000Z',
      document: quote,
      profiles: { email: 'ada@example.com' },
    })
    expect(row?.userId).toBe('user-2')
    expect(row?.ownerEmail).toBe('ada@example.com')
    expect(row?.quote.id).toBe(quote.id)
    expect(row?.quote.customer.name).toBe('Ada')
    expect(row?.updatedAt).toBe('2026-01-02T00:00:00.000Z')
    expect(row?.quote).not.toHaveProperty('owner')
  })

  it('reads a profile email when the join comes back as a list', () => {
    const quote = createQuote('SP-0004', 20)
    const row = quoteAccessFromRow({
      user_id: 'user-3',
      document: { ...quote, owner: 'someone-else' },
      profiles: [{ email: 'sam@example.com' }],
    })
    expect(row?.ownerEmail).toBe('sam@example.com')
    expect(row?.quote).not.toHaveProperty('owner')
    expect(quoteAccessFromRow({ document: quote, profiles: { email: 'a@b.c' } })).toBeNull()
    expect(quoteAccessFromRow({ user_id: 'user-3', document: { id: 'x' } })).toBeNull()
  })

  it('refuses a save over another user’s row', () => {
    expect(ownerCanWrite(null, 'user-1')).toBe(true)
    expect(ownerCanWrite('user-1', 'user-1')).toBe(true)
    expect(ownerCanWrite('user-2', 'user-1')).toBe(false)
  })

  it('accepts job numbers from next_job_no', () => {
    expect(assertJobNo('SP-0001')).toBe('SP-0001')
    expect(assertJobNo(' SP-10000 ')).toBe('SP-10000')
    expect(() => assertJobNo('225')).toThrow(/job number/)
  })
})
