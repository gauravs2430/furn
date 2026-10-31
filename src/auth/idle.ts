import { sessionIdleExpired } from './access.ts'

const storageKey = 'furn.auth.last-activity'
const writeGapMs = 60_000

export interface IdleStamp {
  userId: string
  at: number
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readIdleStamp(): IdleStamp | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(storageKey)
    if (!raw) return null
    const value = JSON.parse(raw) as unknown
    if (!value || typeof value !== 'object') return null
    const row = value as Record<string, unknown>
    if (typeof row.userId !== 'string' || typeof row.at !== 'number' || !Number.isFinite(row.at)) return null
    return { userId: row.userId, at: row.at }
  } catch {
    return null
  }
}

export function writeIdleStamp(stamp: IdleStamp): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(storageKey, JSON.stringify(stamp))
  } catch {
    /* private mode or quota */
  }
}

export function clearIdleStamp(): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(storageKey)
  } catch {
    /* ignore */
  }
}

export function lastActivityFor(userId: string): number | null {
  const stamp = readIdleStamp()
  if (!stamp || stamp.userId !== userId) return null
  return stamp.at
}

export function touchIdleStamp(userId: string, at = Date.now()): void {
  writeIdleStamp({ userId, at })
}

export function idleForUser(userId: string, now = new Date()): boolean {
  return sessionIdleExpired(lastActivityFor(userId), now)
}

export function listenToIdle(userId: () => string | null, onIdle: () => void): () => void {
  let lastWrite = 0

  function checkIdle() {
    const id = userId()
    if (!id) return
    if (idleForUser(id)) onIdle()
  }

  function noteUse() {
    const id = userId()
    if (!id) return
    if (idleForUser(id)) {
      onIdle()
      return
    }
    const now = Date.now()
    if (now - lastWrite < writeGapMs && lastActivityFor(id) != null) return
    lastWrite = now
    touchIdleStamp(id, now)
  }

  function onVisible() {
    if (document.visibilityState !== 'visible') return
    noteUse()
  }

  const events = ['pointerdown', 'keydown', 'scroll'] as const
  for (const event of events) window.addEventListener(event, noteUse, { passive: true })
  document.addEventListener('visibilitychange', onVisible)
  const timer = window.setInterval(checkIdle, writeGapMs)
  checkIdle()

  return () => {
    for (const event of events) window.removeEventListener(event, noteUse)
    document.removeEventListener('visibilitychange', onVisible)
    window.clearInterval(timer)
  }
}
