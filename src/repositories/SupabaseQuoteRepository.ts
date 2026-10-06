import type { Quote, QuoteItem, QuoteStatus } from '../domain/models.ts'
import { supabase } from '../lib/supabase.ts'
import type { QuoteRepository } from './QuoteRepository.ts'

const JOB_NO = /^SP-\d{4,}$/
const STATUSES: readonly QuoteStatus[] = ['draft', 'quoted', 'booked']

export interface QuoteRow {
  id: string
  user_id: string
  job_no: string
  reference: string
  customer_name: string
  status: QuoteStatus
  document: Quote
  created_at: string
  updated_at: string
}

export function assertJobNo(value: unknown): string {
  const jobNo = typeof value === 'string' ? value.trim() : ''
  if (!JOB_NO.test(jobNo)) throw new Error('Could not create a job number.')
  return jobNo
}

export function quoteToRow(quote: Quote, userId: string): QuoteRow {
  const document = structuredClone(quote) as Quote & { owner?: unknown }
  delete document.owner
  return {
    id: quote.id,
    user_id: userId,
    job_no: quote.jobNo,
    reference: quote.reference ?? '',
    customer_name: quote.customer?.name ?? '',
    status: quote.status,
    document,
    created_at: quote.createdAt,
    updated_at: quote.updatedAt,
  }
}

function withProductId(item: QuoteItem): QuoteItem {
  const productId = typeof item.productId === 'string' && item.productId.trim() ? item.productId : item.productType
  return { ...item, productId }
}

export function quoteFromDocument(value: unknown): Quote | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Quote & { owner?: unknown }
  if (typeof source.id !== 'string' || typeof source.jobNo !== 'string') return null
  if (!STATUSES.includes(source.status)) return null
  if (!source.customer || typeof source.customer !== 'object' || !Array.isArray(source.items)) return null
  const quote = { ...source }
  delete quote.owner
  quote.items = source.items.map((item) => withProductId(item))
  quote.configDraft = source.configDraft ? withProductId(source.configDraft) : null
  return quote
}

export interface QuoteAccessRow {
  quote: Quote
  userId: string
  ownerEmail: string
  updatedAt: string
}

function profileEmail(value: unknown): string {
  const entry = Array.isArray(value) ? value[0] : value
  if (!entry || typeof entry !== 'object' || !('email' in entry)) return ''
  return typeof entry.email === 'string' ? entry.email : ''
}

export function quoteAccessFromRow(value: unknown): QuoteAccessRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as { id?: unknown; user_id?: unknown; document?: unknown; updated_at?: unknown; profiles?: unknown }
  if (typeof row.user_id !== 'string' || !row.user_id) return null
  const parsed = quoteFromDocument(row.document)
  if (!parsed) return null
  const quote = typeof row.id === 'string' && row.id ? { ...parsed, id: row.id } : parsed
  const updatedAt = typeof row.updated_at === 'string' && row.updated_at ? row.updated_at : quote.updatedAt
  return {
    quote,
    userId: row.user_id,
    ownerEmail: profileEmail(row.profiles),
    updatedAt,
  }
}

export function ownerCanWrite(existingUserId: string | null, currentUserId: string): boolean {
  return existingUserId === null || existingUserId === currentUserId
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

async function currentUserId(): Promise<string> {
  const { data, error } = await requireClient().auth.getSession()
  if (error) throw error
  const userId = data.session?.user.id
  if (!userId) throw new Error('You are not signed in.')
  return userId
}

export async function fetchNextJobNo(): Promise<string> {
  const { data, error } = await requireClient().rpc('next_job_no')
  if (error) throw error
  return assertJobNo(data)
}

export class SupabaseQuoteRepository implements QuoteRepository {
  async list(): Promise<Quote[]> {
    const userId = await currentUserId()
    const { data, error } = await requireClient()
      .from('quotes')
      .select('user_id, document')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    const quotes: Quote[] = []
    for (const row of data ?? []) {
      if (row.user_id !== userId) continue
      const quote = quoteFromDocument(row.document)
      if (quote) quotes.push(quote)
    }
    return quotes
  }

  async get(id: string): Promise<Quote | null> {
    const userId = await currentUserId()
    const { data, error } = await requireClient()
      .from('quotes')
      .select('user_id, document')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data || data.user_id !== userId) return null
    return quoteFromDocument(data.document)
  }

  async listAll(): Promise<QuoteAccessRow[]> {
    const { data, error } = await requireClient()
      .from('quotes')
      .select('id, user_id, document, updated_at, profiles(email)')
      .order('updated_at', { ascending: false })
    if (error) throw error
    const rows: QuoteAccessRow[] = []
    for (const row of data ?? []) {
      const parsed = quoteAccessFromRow(row)
      if (parsed) rows.push(parsed)
    }
    return rows
  }

  async read(id: string): Promise<QuoteAccessRow | null> {
    const { data, error } = await requireClient()
      .from('quotes')
      .select('id, user_id, document, updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return quoteAccessFromRow(data)
  }

  async save(quote: Quote): Promise<Quote> {
    const userId = await currentUserId()
    const client = requireClient()
    const { data: existing, error: readError } = await client.from('quotes').select('user_id').eq('id', quote.id).maybeSingle()
    if (readError) throw readError
    const existingUserId = existing && typeof existing.user_id === 'string' ? existing.user_id : null
    if (!ownerCanWrite(existingUserId, userId)) throw new Error('Only the owner can change this order.')
    const row = quoteToRow(quote, userId)
    const { error } = await client.from('quotes').upsert(row, { onConflict: 'id' })
    if (error) throw error
    return row.document
  }

  async remove(id: string): Promise<void> {
    const userId = await currentUserId()
    const { error } = await requireClient().from('quotes').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
  }
}
