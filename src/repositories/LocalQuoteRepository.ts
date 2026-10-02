import type { Quote } from '../domain/models.ts'
import type { QuoteRepository } from './QuoteRepository.ts'

export interface QuoteAccess {
  read: () => Quote[]
  write: (quotes: Quote[]) => void
}

/**
 * Browser storage for the prototype.
 * Swap this class for an ApiQuoteRepository without changing the screens.
 */
export class LocalQuoteRepository implements QuoteRepository {
  private readonly access: QuoteAccess

  constructor(access: QuoteAccess) {
    this.access = access
  }

  async list(): Promise<Quote[]> {
    return this.access.read()
  }

  async get(id: string): Promise<Quote | null> {
    return this.access.read().find((quote) => quote.id === id) ?? null
  }

  async save(quote: Quote): Promise<Quote> {
    const quotes = this.access.read()
    const exists = quotes.some((item) => item.id === quote.id)
    const next = exists ? quotes.map((item) => (item.id === quote.id ? quote : item)) : [quote, ...quotes]
    this.access.write(next)
    return quote
  }

  async remove(id: string): Promise<void> {
    this.access.write(this.access.read().filter((quote) => quote.id !== id))
  }
}
