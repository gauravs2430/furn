import type { Quote } from '../domain/models.ts'

export interface QuoteRepository {
  list(): Promise<Quote[]>
  get(id: string): Promise<Quote | null>
  save(quote: Quote): Promise<Quote>
  remove(id: string): Promise<void>
}
