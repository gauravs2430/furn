import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Users, ShieldCheck, Search, X, ArrowUpRight, FolderKanban } from 'lucide-react'
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || 'SP'
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="eyebrow">
            <FolderKanban size={13} style={{ color: 'var(--accent)' }} />
            <span>Staff Activity</span>
          </div>
          <h1>Orders per Staff Member</h1>
          <p className="lede">Breakdown of active draft estimates, quotations sent, and confirmed bookings by user.</p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {!error && people === null ? <p className="boot">Loading staff members…</p> : null}

      {people ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px' }}>
          {/* Segmented Role Switcher */}
          <div style={{
            display: 'inline-flex',
            padding: '4px',
            borderRadius: '10px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--line)',
            gap: '4px',
          }} role="group" aria-label="Role selector">
            <button
              type="button"
              aria-pressed={role === 'admin'}
              onClick={() => setRole('admin')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: '7px',
                border: 'none',
                background: role === 'admin' ? 'var(--surface)' : 'transparent',
                color: role === 'admin' ? 'var(--ink)' : 'var(--muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: role === 'admin' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <ShieldCheck size={14} style={{ color: role === 'admin' ? 'var(--accent)' : 'inherit' }} />
              <span>Administrators ({(people ?? []).filter((p) => p.role === 'admin').length})</span>
            </button>
            <button
              type="button"
              aria-pressed={role === 'user'}
              onClick={() => setRole('user')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: '7px',
                border: 'none',
                background: role === 'user' ? 'var(--surface)' : 'transparent',
                color: role === 'user' ? 'var(--ink)' : 'var(--muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: role === 'user' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={14} style={{ color: role === 'user' ? 'var(--accent)' : 'inherit' }} />
              <span>Staff Users ({(people ?? []).filter((p) => p.role === 'user').length})</span>
            </button>
          </div>

          {/* Search bar */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: '1 1 280px',
            maxWidth: '380px',
          }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={query}
              placeholder="Search staff name, email, or user id…"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              style={{
                width: '100%',
                paddingLeft: '34px',
                paddingRight: query ? '34px' : '12px',
              }}
              className="input"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {people && people.length === 0 ? <p>No one is listed yet.</p> : null}

      {people && people.length > 0 ? (
        <div>
          {visible.length === 0 ? (
            <p style={{ color: 'var(--muted)', padding: '24px 0' }}>
              {searching ? 'No staff member matches that search.' : role === 'admin' ? 'No administrators listed.' : 'No staff users listed.'}
            </p>
          ) : (
            <ul className="job-grid" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {visible.map((person) => {
                const total = person.drafts + person.quoted + person.booked
                const name = displayName(person)
                const isUserAdmin = person.role === 'admin'

                return (
                  <li key={person.id} className="job-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: isUserAdmin ? 'rgba(14, 165, 233, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                          color: isUserAdmin ? 'var(--accent)' : '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px',
                          border: `1px solid ${isUserAdmin ? 'rgba(14, 165, 233, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
                        }}>
                          {initials(name)}
                        </div>
                        <div>
                          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>{name}</h2>
                          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{person.email}</p>
                        </div>
                      </div>

                      <span className="badge" style={{
                        background: isUserAdmin ? 'rgba(14, 165, 233, 0.1)' : 'var(--bg-subtle)',
                        color: isUserAdmin ? 'var(--accent)' : 'var(--ink-soft)',
                        border: '1px solid var(--line)',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {total} {total === 1 ? 'Job' : 'Jobs'}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--muted)',
                      background: 'var(--bg-subtle)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      <span>ID:</span>
                      <span style={{ color: 'var(--ink-soft)' }}>{person.id}</span>
                    </div>

                    <dl className="owner-stats" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      margin: 0,
                      padding: '12px 0',
                      borderTop: '1px solid var(--line)',
                      borderBottom: '1px solid var(--line)',
                      textAlign: 'center',
                    }}>
                      <div>
                        <dt style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drafts</dt>
                        <dd style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700, color: 'var(--ink)', fontFamily: 'ui-monospace, monospace' }}>{person.drafts}</dd>
                      </div>
                      <div>
                        <dt style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quoted</dt>
                        <dd style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'ui-monospace, monospace' }}>{person.quoted}</dd>
                      </div>
                      <div>
                        <dt style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booked</dt>
                        <dd style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700, color: person.booked > 0 ? 'var(--ok)' : 'var(--ink)', fontFamily: 'ui-monospace, monospace' }}>
                          {person.booked}
                        </dd>
                      </div>
                    </dl>

                    <Link
                      className="btn btn-secondary"
                      to={`/admin/orders/users/${person.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        marginTop: 'auto',
                      }}
                    >
                      <span>View staff orders</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
