import type { Quote } from './models.ts'

export type ActivityKind = 'started' | 'edited' | 'quoted' | 'booked'

export interface ActivitySource {
  quote: Quote
  ownerId: string
  ownerName: string
}

export interface ActivityEvent {
  id: string
  kind: ActivityKind
  at: Date
  quote: Quote
  ownerId: string
  ownerName: string
}

/** Edits this close to another event on the same quote are the same piece of work. */
const SAME_WORK_MS = 2 * 60 * 1000

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function parse(value: string | undefined): Date | null {
  if (!value) return null
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? null : at
}

/**
 * Today's activity, newest first, read from the times every quote already keeps:
 * when it was started, last changed, marked quoted and booked. Nothing older than
 * today is included.
 */
export function todaysActivity(sources: ActivitySource[], now: Date = new Date()): ActivityEvent[] {
  const events: ActivityEvent[] = []
  for (const source of sources) {
    const { quote } = source
    const found: ActivityEvent[] = []
    const add = (kind: ActivityKind, value: string | undefined) => {
      const at = parse(value)
      if (!at || !sameDay(at, now) || at.getTime() > now.getTime() + 60_000) return
      found.push({ id: `${quote.id}:${kind}`, kind, at, quote, ownerId: source.ownerId, ownerName: source.ownerName })
    }
    add('started', quote.createdAt)
    add('quoted', quote.quotedAt)
    add('booked', quote.bookedAt)
    const edited = parse(quote.updatedAt)
    if (edited && !found.some((event) => Math.abs(event.at.getTime() - edited.getTime()) < SAME_WORK_MS)) {
      add('edited', quote.updatedAt)
    }
    events.push(...found)
  }
  return events.sort((a, b) => b.at.getTime() - a.at.getTime())
}

/** How many events fell in each hour of the day, 0–23. */
export function activityByHour(events: ActivityEvent[]): number[] {
  const hours = Array.from({ length: 24 }, () => 0)
  for (const event of events) hours[event.at.getHours()] = (hours[event.at.getHours()] ?? 0) + 1
  return hours
}

export function activityCounts(events: ActivityEvent[]): Record<ActivityKind, number> & { people: number } {
  const counts = { started: 0, edited: 0, quoted: 0, booked: 0 }
  for (const event of events) counts[event.kind] += 1
  return { ...counts, people: new Set(events.map((event) => event.ownerId)).size }
}
