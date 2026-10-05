import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PricingConfig, Quote, QuoteItem, QuoteStatus, ThemeMode } from '../domain/models.ts'
import { createQuote } from '../domain/factories.ts'
import { pricingDefaults } from '../data/pricingDefaults.ts'
import { fetchPricingConfig } from '../repositories/PricingConfigRepository.ts'
import { fetchNextJobNo, SupabaseQuoteRepository } from '../repositories/SupabaseQuoteRepository.ts'
import { createId } from '../utils/ids.ts'
import { nowIso } from '../utils/dates.ts'

export interface ToastMessage {
  id: string
  message: string
  tone: 'info' | 'success' | 'danger'
}

interface AppState {
  quotes: Quote[]
  theme: ThemeMode
  pricingConfig: PricingConfig
  pricingStatus: 'loading' | 'ready' | 'error'
  pricingNotice: string | null
  hydrated: boolean
  toasts: ToastMessage[]
  createQuote: () => Promise<Quote | null>
  duplicateQuote: (id: string) => Promise<Quote | null>
  deleteQuote: (id: string) => Promise<boolean>
  updateQuote: (id: string, patch: Partial<Quote>, options?: { touch?: boolean }) => Promise<boolean>
  addItem: (quoteId: string, item: QuoteItem) => Promise<boolean>
  updateItem: (quoteId: string, item: QuoteItem) => Promise<boolean>
  removeItem: (quoteId: string, itemId: string) => Promise<boolean>
  duplicateItem: (quoteId: string, itemId: string) => Promise<boolean>
  setStatus: (quoteId: string, status: QuoteStatus) => Promise<boolean>
  flushQuote: (id: string) => Promise<boolean>
  setTheme: (theme: ThemeMode) => void
  setPricingConfig: (config: PricingConfig) => void
  pushToast: (message: string, tone?: ToastMessage['tone']) => void
  dismissToast: (id: string) => void
}

const STORAGE_KEY = 'measure-order.v1'
const DRAFT_SAVE_MS = 400

function preferredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function forgetStoredQuotes() {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> }
    if (!parsed?.state) return
    let changed = false
    if ('quotes' in parsed.state) {
      delete parsed.state.quotes
      changed = true
    }
    if ('pricingConfig' in parsed.state) {
      delete parsed.state.pricingConfig
      changed = true
    }
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

forgetStoredQuotes()

function messageFrom(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message.trim()
    if (message) return message
  }
  return 'Could not save the quote.'
}

function cloneItem(item: QuoteItem): QuoteItem {
  const copy = structuredClone(item)
  copy.id = createId()
  copy.panels = copy.panels.map((panel) => ({ ...panel, id: createId() }))
  return copy
}

export const quoteRepository = new SupabaseQuoteRepository()

const draftTimers = new Map<string, ReturnType<typeof setTimeout>>()
const draftWaiters = new Map<string, Array<(ok: boolean) => void>>()
const saveChains = new Map<string, Promise<boolean>>()
const removedIds = new Set<string>()
let creatingQuote = false
const duplicatingIds = new Set<string>()
let loadedUserId: string | null = null
let loadTicket = 0
let loadedPricingUserId: string | null = null
let pricingTicket = 0

function rememberQuote(quote: Quote) {
  useAppStore.setState((state) => {
    const exists = state.quotes.some((item) => item.id === quote.id)
    const quotes = exists ? state.quotes.map((item) => (item.id === quote.id ? quote : item)) : [quote, ...state.quotes]
    return { quotes }
  })
}

function takeWaiters(id: string): Array<(ok: boolean) => void> {
  const timer = draftTimers.get(id)
  if (timer) clearTimeout(timer)
  draftTimers.delete(id)
  const waiters = draftWaiters.get(id) ?? []
  draftWaiters.delete(id)
  return waiters
}

function settle(waiters: Array<(ok: boolean) => void>, ok: boolean) {
  for (const resolve of waiters) resolve(ok)
}

function persistQuote(id: string): Promise<boolean> {
  const previous = saveChains.get(id) ?? Promise.resolve(true)
  const run = previous.catch(() => false).then(async () => {
    if (removedIds.has(id)) return true
    const quote = useAppStore.getState().quotes.find((item) => item.id === id)
    if (!quote) return true
    try {
      await quoteRepository.save(structuredClone(quote))
      return true
    } catch (error) {
      useAppStore.getState().pushToast(messageFrom(error), 'danger')
      return false
    }
  })
  saveChains.set(id, run)
  return run
}

function queueSave(id: string, immediate: boolean): Promise<boolean> {
  if (!immediate) {
    return new Promise((resolve) => {
      const timer = draftTimers.get(id)
      if (timer) clearTimeout(timer)
      const waiters = draftWaiters.get(id) ?? []
      waiters.push(resolve)
      draftWaiters.set(id, waiters)
      draftTimers.set(
        id,
        setTimeout(() => {
          draftTimers.delete(id)
          const pending = draftWaiters.get(id) ?? []
          draftWaiters.delete(id)
          void persistQuote(id).then((ok) => settle(pending, ok))
        }, DRAFT_SAVE_MS),
      )
    })
  }

  const pending = takeWaiters(id)
  return persistQuote(id).then((ok) => {
    settle(pending, ok)
    return ok
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    for (const id of [...draftTimers.keys()]) {
      const pending = takeWaiters(id)
      void persistQuote(id).then((ok) => settle(pending, ok))
    }
  })
}

async function flushQuoteSave(id: string): Promise<boolean> {
  let ok = false
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const pending = takeWaiters(id)
    const before = JSON.stringify(useAppStore.getState().quotes.find((item) => item.id === id) ?? null)
    ok = await persistQuote(id)
    settle(pending, ok)
    const after = JSON.stringify(useAppStore.getState().quotes.find((item) => item.id === id) ?? null)
    if (!draftTimers.has(id) && before === after) return ok
  }
  return ok
}

async function fetchQuotesIntoStore() {
  const ticket = ++loadTicket
  useAppStore.setState({ hydrated: false })
  try {
    const quotes = await quoteRepository.list()
    if (ticket !== loadTicket) return
    useAppStore.setState({ quotes, hydrated: true })
  } catch (error) {
    if (ticket !== loadTicket) return
    useAppStore.setState({ quotes: [], hydrated: true })
    useAppStore.getState().pushToast(messageFrom(error), 'danger')
  }
}

export function loadQuotesForSession(userId: string) {
  if (loadedUserId === userId && useAppStore.getState().hydrated) return
  loadedUserId = userId
  void fetchQuotesIntoStore()
}

export function clearLoadedQuotes() {
  loadedUserId = null
  loadTicket += 1
  removedIds.clear()
  for (const id of [...draftTimers.keys()]) settle(takeWaiters(id), false)
  useAppStore.setState({ quotes: [], hydrated: false })
}

async function fetchPricingIntoStore() {
  const ticket = ++pricingTicket
  useAppStore.setState({ pricingStatus: 'loading', pricingNotice: null })
  try {
    const pricingConfig = await fetchPricingConfig()
    if (ticket !== pricingTicket) return
    useAppStore.setState({ pricingConfig, pricingStatus: 'ready', pricingNotice: null })
  } catch (error) {
    if (ticket !== pricingTicket) return
    useAppStore.setState({ pricingStatus: 'error', pricingNotice: messageFrom(error) })
  }
}

export function loadPricingForSession(userId: string) {
  if (loadedPricingUserId === userId) return
  loadedPricingUserId = userId
  void fetchPricingIntoStore()
}

export function clearLoadedPricing() {
  loadedPricingUserId = null
  pricingTicket += 1
  useAppStore.setState({
    pricingConfig: pricingDefaults,
    pricingStatus: 'loading',
    pricingNotice: null,
  })
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      quotes: [],
      theme: preferredTheme(),
      pricingConfig: pricingDefaults,
      pricingStatus: 'loading',
      pricingNotice: null,
      hydrated: false,
      toasts: [],

      createQuote: async () => {
        if (creatingQuote) return null
        creatingQuote = true
        try {
          const jobNo = await fetchNextJobNo()
          const quote = createQuote(jobNo, get().pricingConfig.taxPercent)
          await quoteRepository.save(quote)
          rememberQuote(quote)
          return quote
        } catch (error) {
          get().pushToast(messageFrom(error), 'danger')
          return null
        } finally {
          creatingQuote = false
        }
      },

      duplicateQuote: async (id) => {
        if (duplicatingIds.has(id)) return null
        const source = get().quotes.find((quote) => quote.id === id)
        if (!source) return null
        duplicatingIds.add(id)
        try {
          const jobNo = await fetchNextJobNo()
          const now = nowIso()
          const copy: Quote = {
            ...structuredClone(source),
            id: createId(),
            jobNo,
            status: 'draft',
            reference: source.reference ? `${source.reference} copy` : '',
            createdAt: now,
            updatedAt: now,
            quotedAt: undefined,
            bookedAt: undefined,
            items: source.items.map((item) => cloneItem(item)),
            configDraft: source.configDraft ? cloneItem(source.configDraft) : null,
            editingItemId: null,
          }
          await quoteRepository.save(copy)
          rememberQuote(copy)
          return copy
        } catch (error) {
          get().pushToast(messageFrom(error), 'danger')
          return null
        } finally {
          duplicatingIds.delete(id)
        }
      },

      deleteQuote: async (id) => {
        const previous = get().quotes
        const pending = takeWaiters(id)
        removedIds.add(id)
        set((state) => ({ quotes: state.quotes.filter((quote) => quote.id !== id) }))
        const run = (saveChains.get(id) ?? Promise.resolve(true)).catch(() => false).then(async () => {
          await quoteRepository.remove(id)
        })
        saveChains.set(id, run.then(() => true))
        try {
          await run
          removedIds.delete(id)
          settle(pending, true)
          return true
        } catch (error) {
          removedIds.delete(id)
          if (!get().quotes.some((quote) => quote.id === id)) set({ quotes: previous })
          get().pushToast(messageFrom(error), 'danger')
          settle(pending, false)
          return false
        }
      },

      updateQuote: (id, patch, options) => {
        const current = get().quotes.find((quote) => quote.id === id)
        if (!current || removedIds.has(id)) return Promise.resolve(false)
        rememberQuote({
          ...current,
          ...patch,
          updatedAt: options?.touch === false ? current.updatedAt : nowIso(),
        })
        return queueSave(id, false)
      },

      addItem: (quoteId, item) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        if (!current || removedIds.has(quoteId)) return Promise.resolve(false)
        rememberQuote({
          ...current,
          items: [...current.items, { ...item, id: item.id || createId() }],
          updatedAt: nowIso(),
        })
        return queueSave(quoteId, true)
      },

      updateItem: (quoteId, item) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        if (!current || removedIds.has(quoteId)) return Promise.resolve(false)
        rememberQuote({
          ...current,
          items: current.items.map((existing) => (existing.id === item.id ? item : existing)),
          updatedAt: nowIso(),
        })
        return queueSave(quoteId, true)
      },

      removeItem: (quoteId, itemId) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        if (!current || removedIds.has(quoteId)) return Promise.resolve(false)
        rememberQuote({
          ...current,
          items: current.items.filter((item) => item.id !== itemId),
          editingItemId: current.editingItemId === itemId ? null : current.editingItemId,
          updatedAt: nowIso(),
        })
        return queueSave(quoteId, true)
      },

      duplicateItem: (quoteId, itemId) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        const source = current?.items.find((item) => item.id === itemId)
        if (!current || !source || removedIds.has(quoteId)) return Promise.resolve(false)
        const copy = cloneItem(source)
        if (copy.location) copy.location = `${source.location} copy`
        rememberQuote({
          ...current,
          items: [...current.items, copy],
          updatedAt: nowIso(),
        })
        return queueSave(quoteId, true)
      },

      setStatus: (quoteId, status) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        if (!current || removedIds.has(quoteId)) return Promise.resolve(false)
        const now = nowIso()
        rememberQuote({
          ...current,
          status,
          updatedAt: now,
          quotedAt: status === 'quoted' ? now : current.quotedAt,
          bookedAt: status === 'booked' ? now : current.bookedAt,
        })
        return queueSave(quoteId, true)
      },

      flushQuote: (id) => flushQuoteSave(id),

      setTheme: (theme) => set({ theme }),
      setPricingConfig: (pricingConfig) => set({ pricingConfig, pricingStatus: 'ready', pricingNotice: null }),

      pushToast: (message, tone = 'success') => {
        const id = createId()
        set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
        window.setTimeout(() => {
          get().dismissToast(id)
        }, 3400)
      },

      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as { theme?: string }
        const theme = persisted.theme === 'dark' || persisted.theme === 'light' ? persisted.theme : currentState.theme
        return { ...currentState, theme }
      },
    },
  ),
)
