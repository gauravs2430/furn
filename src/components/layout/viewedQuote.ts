import { create } from 'zustand'
import type { Quote } from '../../domain/models.ts'

/**
 * A quote the current page loaded that is not in the person's own list (an admin
 * opening someone else's job), so the header can still name it.
 */
export const useViewedQuote = create<{ quote: Quote | null; set: (quote: Quote | null) => void }>((set) => ({
  quote: null,
  set: (quote) => set({ quote }),
}))
