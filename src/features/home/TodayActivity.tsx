import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { supabase } from '../../lib/supabase.ts'
import { quoteRepository, useAppStore } from '../../store/useAppStore.ts'
import type { ActivityEvent, ActivityKind, ActivitySource } from '../../domain/activity.ts'
import { activityByHour, activityCounts, todaysActivity } from '../../domain/activity.ts'
import { calculateQuoteTotals } from '../../domain/pricing.ts'
import { formatMoney } from '../../utils/money.ts'
import { cx } from '../../utils/cx.ts'

const VERB: Record<ActivityKind, string> = {
  started: 'started',
  edited: 'worked on',
  quoted: 'marked as quoted',
  booked: 'booked',
}

const LABEL: Record<ActivityKind, string> = {
  started: 'Started',
  edited: 'Edited',
  quoted: 'Quoted',
  booked: 'Booked',
}

/** Working hours shown on the hourly strip. */
const FIRST_HOUR = 7
const LAST_HOUR = 20
const SHOWN = 8

function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function time(at: Date): string {
  return at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** Everyone's quotes for admins (with names), or the person's own quotes for staff. */
function useActivitySources(): { sources: ActivitySource[] | null; error: string | null; reload: () => void; loading: boolean } {
  const profile = useAuthStore((state) => state.profile)
  const ownQuotes = useAppStore((state) => state.quotes)
  const hydrated = useAppStore((state) => state.hydrated)
  const isAdmin = profile?.role === 'admin'
  const [adminSources, setAdminSources] = useState<ActivitySource[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        if (!supabase) throw new Error('Supabase is not configured.')
        const [people, rows] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email'),
          quoteRepository.listAll(),
        ])
        if (cancelled) return
        const names = new Map<string, string>()
        for (const row of (people.data ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
          names.set(row.id, row.full_name?.trim() || row.email || '')
        }
        setAdminSources(
          rows.map((row) => ({ quote: row.quote, ownerId: row.userId, ownerName: names.get(row.userId) || row.ownerEmail || 'Someone' })),
        )
        setError(null)
      } catch (loadError: unknown) {
        if (!cancelled) setError(loadError instanceof Error && loadError.message ? loadError.message : 'Could not load today’s activity.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin, tick])

  const reload = useCallback(() => setTick((value) => value + 1), [])

  if (isAdmin) return { sources: adminSources, error, reload, loading }
  const me = profile?.full_name?.trim() || profile?.email || 'You'
  return {
    sources: hydrated ? ownQuotes.map((quote) => ({ quote, ownerId: profile?.id ?? 'me', ownerName: me })) : null,
    error: null,
    reload,
    loading: false,
  }
}

/**
 * One column per hour across the working day, stretched to include any earlier or
 * later activity. Each hour has a light track; activity fills it, and the current
 * hour is marked.
 */
function HourStrip({ events, now }: { events: ActivityEvent[]; now: Date }) {
  const all = activityByHour(events)
  const active = all.flatMap((count, hour) => (count > 0 ? [hour] : []))
  const first = Math.min(FIRST_HOUR, ...active)
  const last = Math.max(LAST_HOUR, ...active)
  const hours = all.slice(first, last + 1)
  const peak = Math.max(1, ...hours)
  const current = now.getHours()
  const barW = 12
  const gap = 5
  const height = 52
  const width = hours.length * (barW + gap) - gap
  const label = (hour: number) => String(hour).padStart(2, '0')
  return (
    <figure className="today-hours">
      <svg viewBox={`0 0 ${width} ${height + 16}`} role="img" aria-label="Activity by hour today">
        {hours.map((count, index) => {
          const hour = first + index
          const h = count === 0 ? 0 : Math.max(8, (count / peak) * height)
          const x = index * (barW + gap)
          return (
            <g key={hour}>
              <title>{`${label(hour)}:00 · ${count} ${count === 1 ? 'update' : 'updates'}`}</title>
              <rect x={x} y={0} width={barW} height={height} rx={3} className={cx('today-track', hour === current && 'is-now')} />
              {h > 0 ? <rect x={x} y={height - h} width={barW} height={h} rx={3} className="today-bar" /> : null}
              {hour === current || (index % 3 === 0 && Math.abs(hour - current) > 1) ? (
                <text x={x + barW / 2} y={height + 13} textAnchor="middle" className={cx('today-hour-label', hour === current && 'is-now')}>
                  {label(hour)}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <figcaption>
        By hour, {label(first)}:00–{label(last + 1)}:00
      </figcaption>
    </figure>
  )
}

export function TodayActivity() {
  const profile = useAuthStore((state) => state.profile)
  const pricingConfig = useAppStore((state) => state.pricingConfig)
  const catalogue = useAppStore((state) => state.catalogue)
  const { sources, error, reload, loading } = useActivitySources()
  const [showAll, setShowAll] = useState(false)
  const [now] = useState(() => new Date())
  const isAdmin = profile?.role === 'admin'

  const events = sources ? todaysActivity(sources, now) : []
  const counts = activityCounts(events)
  const visible = showAll ? events : events.slice(0, SHOWN)
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  function linkFor(event: ActivityEvent): string {
    // Admins see a colleague's whole list, just like "View orders"; their own work opens the quote.
    if (isAdmin && event.ownerId !== profile?.id) return `/admin/orders/users/${event.ownerId}`
    return `/quote/${event.quote.id}`
  }

  return (
    <section className="today" aria-labelledby="today-heading">
      <div className="today-head">
        <div>
          <h2 id="today-heading">Today</h2>
          <p className="today-date">
            {dateLabel} · {isAdmin ? 'everyone’s quotes and bookings' : 'your quotes and bookings'}
          </p>
        </div>
        {isAdmin ? (
          <button type="button" className="today-refresh" onClick={reload} disabled={loading} aria-busy={loading}>
            <RefreshCw size={15} className={loading ? 'is-spinning' : undefined} aria-hidden="true" />
            Refresh
          </button>
        ) : null}
      </div>

      <div className="today-glance">
        <ul className="today-counts" aria-label="Today in numbers">
          {(['started', 'quoted', 'booked', 'edited'] as const).map((kind) => (
            <li key={kind} className={`today-count kind-${kind}`}>
              <span className="today-dot" aria-hidden="true" />
              <strong>{sources ? counts[kind] : '—'}</strong>
              <span>{LABEL[kind]}</span>
            </li>
          ))}
          {isAdmin ? (
            <li className="today-count kind-people">
              <strong>{sources ? counts.people : '—'}</strong>
              <span>{counts.people === 1 ? 'Person active' : 'People active'}</span>
            </li>
          ) : null}
        </ul>
        <HourStrip events={events} now={now} />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {!sources && !error ? <p className="today-empty">Loading today’s activity…</p> : null}

      {sources && events.length === 0 ? (
        <p className="today-empty">Nothing yet today. New quotes, quotes marked ready and bookings will show up here as they happen.</p>
      ) : null}

      {events.length > 0 ? (
        <ol className="today-timeline">
          {visible.map((event) => {
            const customer = event.quote.customer.name.trim() || 'Unnamed customer'
            const total = calculateQuoteTotals(event.quote, pricingConfig, catalogue).grandTotal
            const openings = event.quote.items.length
            const mine = event.ownerId === profile?.id
            return (
              <li key={event.id} className={`today-item kind-${event.kind}`}>
                <time className="today-time" dateTime={event.at.toISOString()}>
                  {time(event.at)}
                </time>
                <span className="today-node" aria-hidden="true" />
                <Link className="today-entry" to={linkFor(event)}>
                  <span className="today-avatar" aria-hidden="true">
                    {initials(event.ownerName)}
                  </span>
                  <span className="today-text">
                    <span className="today-line">
                      <strong>{mine ? 'You' : event.ownerName}</strong> {VERB[event.kind]} <strong>{event.quote.jobNo}</strong>
                      <span className="today-customer"> · {customer}</span>
                    </span>
                    <span className="today-meta">
                      <span className={`today-tag kind-${event.kind}`}>{LABEL[event.kind]}</span>
                      {openings} {openings === 1 ? 'opening' : 'openings'} · {formatMoney(total)}
                    </span>
                  </span>
                  <ArrowUpRight size={16} className="today-go" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ol>
      ) : null}

      {events.length > SHOWN ? (
        <button type="button" className="link-btn today-more" onClick={() => setShowAll((value) => !value)}>
          {showAll ? 'Show fewer' : `Show all ${events.length} from today`}
        </button>
      ) : null}
    </section>
  )
}
