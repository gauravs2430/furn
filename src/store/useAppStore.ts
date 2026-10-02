import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PricingConfig, Quote, QuoteItem, QuoteStatus, ThemeMode } from '../domain/models.ts'
import { createQuote, nextJobNo } from '../domain/factories.ts'
import { pricingDefaults } from '../data/pricingDefaults.ts'
import { createSampleQuote } from '../data/sampleQuote.ts'
import { LocalQuoteRepository } from '../repositories/LocalQuoteRepository.ts'
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
  hydrated: boolean
  toasts: ToastMessage[]
  createQuote: () => Quote
  duplicateQuote: (id: string) => Quote | null
  deleteQuote: (id: string) => void
  updateQuote: (id: string, patch: Partial<Quote>, options?: { touch?: boolean }) => void
  addItem: (quoteId: string, item: QuoteItem) => void
  updateItem: (quoteId: string, item: QuoteItem) => void
  removeItem: (quoteId: string, itemId: string) => void
  duplicateItem: (quoteId: string, itemId: string) => void
  setStatus: (quoteId: string, status: QuoteStatus) => void
  setTheme: (theme: ThemeMode) => void
  setPricingConfig: (config: PricingConfig) => void
  resetPricingConfig: () => void
  pushToast: (message: string, tone?: ToastMessage['tone']) => void
  dismissToast: (id: string) => void
}

let markHydrated = () => {}

function preferredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function cloneItem(item: QuoteItem): QuoteItem {
  const copy = structuredClone(item)
  copy.id = createId()
  copy.panels = copy.panels.map((panel) => ({ ...panel, id: createId() }))
  return copy
}

export const quoteRepository = new LocalQuoteRepository({
  read: () => useAppStore.getState().quotes,
  write: (quotes) => useAppStore.setState({ quotes }),
})

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      markHydrated = () => set({ hydrated: true })
      return {
      quotes: [createSampleQuote()],
      theme: preferredTheme(),
      pricingConfig: pricingDefaults,
      hydrated: false,
      toasts: [],

      createQuote: () => {
        const quote = createQuote(nextJobNo(get().quotes), get().pricingConfig.taxPercent)
        void quoteRepository.save(quote)
        return quote
      },

      duplicateQuote: (id) => {
        const source = get().quotes.find((quote) => quote.id === id)
        if (!source) return null
        const now = nowIso()
        const copy: Quote = {
          ...structuredClone(source),
          id: createId(),
          jobNo: nextJobNo(get().quotes),
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
        void quoteRepository.save(copy)
        return copy
      },

      deleteQuote: (id) => {
        void quoteRepository.remove(id)
      },

      updateQuote: (id, patch, options) => {
        const current = get().quotes.find((quote) => quote.id === id)
        if (!current) return
        const next: Quote = {
          ...current,
          ...patch,
          updatedAt: options?.touch === false ? current.updatedAt : nowIso(),
        }
        void quoteRepository.save(next)
      },

      addItem: (quoteId, item) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        if (!current) return
        void quoteRepository.save({
          ...current,
          items: [...current.items, { ...item, id: item.id || createId() }],
          updatedAt: nowIso(),
        })
      },

      updateItem: (quoteId, item) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        if (!current) return
        void quoteRepository.save({
          ...current,
          items: current.items.map((existing) => (existing.id === item.id ? item : existing)),
          updatedAt: nowIso(),
        })
      },

      removeItem: (quoteId, itemId) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        if (!current) return
        void quoteRepository.save({
          ...current,
          items: current.items.filter((item) => item.id !== itemId),
          editingItemId: current.editingItemId === itemId ? null : current.editingItemId,
          updatedAt: nowIso(),
        })
      },

      duplicateItem: (quoteId, itemId) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        const source = current?.items.find((item) => item.id === itemId)
        if (!current || !source) return
        const copy = cloneItem(source)
        if (copy.location) copy.location = `${source.location} copy`
        void quoteRepository.save({
          ...current,
          items: [...current.items, copy],
          updatedAt: nowIso(),
        })
      },

      setStatus: (quoteId, status) => {
        const current = get().quotes.find((quote) => quote.id === quoteId)
        if (!current) return
        const now = nowIso()
        void quoteRepository.save({
          ...current,
          status,
          updatedAt: now,
          quotedAt: status === 'quoted' ? now : current.quotedAt,
          bookedAt: status === 'booked' ? now : current.bookedAt,
        })
      },

      setTheme: (theme) => set({ theme }),
      setPricingConfig: (pricingConfig) => set({ pricingConfig }),
      resetPricingConfig: () => set({ pricingConfig: pricingDefaults }),

      pushToast: (message, tone = 'success') => {
        const id = createId()
        set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
        window.setTimeout(() => {
          get().dismissToast(id)
        }, 3400)
      },

      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
    }
    },
    {
      name: 'measure-order.v1',
      version: 1,
      partialize: (state) => ({
        quotes: state.quotes,
        theme: state.theme,
        pricingConfig: state.pricingConfig,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppState> & { theme?: string }
        const theme = persisted.theme === 'dark' || persisted.theme === 'light' ? persisted.theme : preferredTheme()
        return { ...currentState, ...persisted, theme }
      },
      onRehydrateStorage: () => () => {
        markHydrated()
      },
    },
  ),
)
