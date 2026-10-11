import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { supabase } from '../../lib/supabase.ts'
import type { QuoteStatus } from '../../domain/models.ts'
import { quoteRepository } from '../../store/useAppStore.ts'
import { matchesQuery } from './filters.ts'

interface OwnerCard {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'user'
  drafts: number
  quoted: number
  booked: number
}

function personFrom(value: unknown): Omit<OwnerCard, 'drafts' | 'quoted' | 'booked'> | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.email !== 'string' || !row.email.trim()) return null
  return {
    id: row.id,
    email: row.email,
    fullName: typeof row.full_name === 'string' ? row.full_name : '',
    role: row.role === 'admin' ? 'admin' : 'user',
  }
}

function messageFrom(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message.trim()
    if (message) return message
  }
  return 'Could not load orders.'
}

function displayName(person: OwnerCard): string {
  return person.fullName.trim() || person.email
}

export function OrdersByUserPage() {
  const profile = useAuthStore((state) => state.profile)
  const [people, setPeople] = useState<OwnerCard[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<'admin' | 'user'>('admin')

  useEffect(() => {
    if (profile?.role !== 'admin') return
    let cancelled = false
    void (async () => {
      try {
        if (!supabase) throw new Error('Supabase is not configured.')
        const [profiles, orders] = await Promise.all([
          supabase.from('profiles').select('id, email, full_name, role').order('full_name', { ascending: true }),
          quoteRepository.listAll(),
        ])
        if (cancelled) return
        if (profiles.error) {
          setError(profiles.error.message)
          return
        }
        const cards = new Map<string, OwnerCard>()
        for (const row of profiles.data ?? []) {
          const person = personFrom(row)
          if (!person) continue
          cards.set(person.id, { ...person, drafts: 0, quoted: 0, booked: 0 })
        }
        for (const order of orders) {
          const current = cards.get(order.userId) ?? {
            id: order.userId,
            email: order.ownerEmail,
            fullName: '',
            role: 'user' as const,
            drafts: 0,
            quoted: 0,
            booked: 0,
          }
          const status: QuoteStatus = order.quote.status
          if (status === 'draft') current.drafts += 1
          else if (status === 'quoted') current.quoted += 1
          else if (status === 'booked') current.booked += 1
          if (!current.email && order.ownerEmail) current.email = order.ownerEmail
          cards.set(order.userId, current)
        }
        const listed = [...cards.values()].sort((a, b) => displayName(a).localeCompare(displayName(b)))
        setPeople(listed)
        setError(null)
      } catch (loadError: unknown) {
        if (!cancelled) setError(messageFrom(loadError))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.role])

  if (!profile) return <p className="boot">Checking login…</p>
  if (profile.role !== 'admin') return <Navigate to="/" replace />

  const inRole = (people ?? []).filter((person) => person.role === role)
  const visible = inRole.filter((person) => matchesQuery(query, displayName(person), person.email, person.id))
  const searching = query.trim().length > 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin Panel</p>
          <h1>Orders per user</h1>
          <p className="lede">Drafts, quotations and bookings for each person.</p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {!error && people === null ? <p className="boot">Loading people…</p> : null}

      {people ? (
        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Search people</span>
            <input
              value={query}
              placeholder="Search name, email or user id"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {people && people.length === 0 ? <p>No one is listed yet.</p> : null}

      {people && people.length > 0 ? (
        <>
          <div className="owner-switch" role="group" aria-label="Role">
            <button type="button" aria-pressed={role === 'admin'} className={role === 'admin' ? 'is-on' : ''} onClick={() => setRole('admin')}>
              Admin
            </button>
            <button type="button" aria-pressed={role === 'user'} className={role === 'user' ? 'is-on' : ''} onClick={() => setRole('user')}>
              User
            </button>
          </div>
          <div className="owner-board">
            {visible.length === 0 ? (
              <p>{searching ? 'No one matches that search.' : role === 'admin' ? 'No admins are listed.' : 'No users are listed.'}</p>
            ) : (
              <ul className="job-grid">
                {visible.map((person) => {
                  const total = person.drafts + person.quoted + person.booked
                  return (
                    <li key={person.id} className="job-card owner-card">
                      <div className="owner-head">
                        <h2>{displayName(person)}</h2>
                        <p className="owner-jobs">
                          {total} {total === 1 ? 'job' : 'jobs'}
                        </p>
                      </div>
                      <p className="owner-id">{person.id}</p>
                      <dl className="owner-stats">
                        <div>
                          <dt>Drafts</dt>
                          <dd>{person.drafts}</dd>
                        </div>
                        <div>
                          <dt>Quotations</dt>
                          <dd>{person.quoted}</dd>
                        </div>
                        <div>
                          <dt>Bookings</dt>
                          <dd className={person.booked > 0 ? 'is-booked' : undefined}>{person.booked}</dd>
                        </div>
                      </dl>
                      <Link className="btn" to={`/admin/orders/users/${person.id}`}>
                        View orders
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
