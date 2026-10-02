import type { Quote } from '../domain/models.ts'
import { createQuoteItem } from '../domain/factories.ts'

export function createSampleQuote(): Quote {
  const item = createQuoteItem('window')
  item.id = 'sample-opening-1'
  item.location = 'Front elevation'
  const draft = createQuoteItem('window')
  return {
    id: 'sample-tahir-windows',
    jobNo: '225',
    reference: 'tahir windows',
    supply: 'Supply & fit',
    requestedDate: '',
    customer: {
      name: 'Test Customer',
      phone: '07700 900123',
      email: 'test.customer@example.com',
      address: '14 Harbour Street\nExample Town\nEX1 4AB',
      salesperson: '',
    },
    status: 'draft',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:30:00.000Z',
    items: [item],
    discountPercent: 0,
    taxPercent: 20,
    configDraft: draft,
    editingItemId: null,
  }
}
