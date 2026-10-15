import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Lock,
  Unlock,
  Search,
  X,
  Copy,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { dayAfter, expiryOnOrBeforeToday, isDateAfter, localToday, userAccessLocked } from '../../auth/access.ts'
import { useAuthStore } from '../../auth/session.ts'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog, Modal } from '../../components/ui/Dialog.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { supabase } from '../../lib/supabase.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { formatDate } from '../../utils/dates.ts'
import { matchesQuery } from './filters.ts'

interface Person {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user'
  active: boolean
  locked: boolean
  access_expires_on: string | null
  created_at: string
}

const profileColumns = 'id, email, full_name, role, active, locked, access_expires_on, created_at'

function personFrom(value: unknown): Person | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.email !== 'string') return null
  return {
    id: row.id,
    email: row.email,
    full_name: typeof row.full_name === 'string' ? row.full_name : '',
    role: row.role === 'admin' ? 'admin' : 'user',
    active: row.active === true,
    locked: row.locked === true,
    access_expires_on: typeof row.access_expires_on === 'string' ? row.access_expires_on.slice(0, 10) : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
  }
}

function peopleFrom(value: unknown): Person[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const person = personFrom(item)
    return person ? [person] : []
  })
}

function displayName(person: Person): string {
  return person.full_name.trim() || person.email
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || 'SP'
}

interface ShownPassword {
  email: string
  password: string
}

async function messageFromInvoke(error: unknown, fallback = 'Could not save that login.'): Promise<string> {
  const context = error && typeof error === 'object' && 'context' in error ? error.context : null
  if (context instanceof Response) {
    const text = await context.text()
    try {
      const body: unknown = JSON.parse(text)
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' && body.error.trim()) {
        return body.error.trim()
      }
    } catch {
      const trimmed = text.trim()
      if (trimmed) return trimmed
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function shownPassword(value: unknown): ShownPassword | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (typeof body.email !== 'string' || typeof body.temporaryPassword !== 'string') return null
  if (!body.temporaryPassword) return null
  return { email: body.email, password: body.temporaryPassword }
}

function invokeFailure(value: unknown, fallback: string): string | null {
  if (!value || typeof value !== 'object') return fallback
  const body = value as Record<string, unknown>
  if (body.ok === true) return null
  if (typeof body.error === 'string' && body.error.trim()) return body.error.trim()
  return fallback
}

function emailErrorFrom(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (typeof body.emailError === 'string' && body.emailError.trim()) return body.emailError.trim()
  return null
}

function emptyPeople(count: number, searching: boolean, label: string): string {
  if (searching && count > 0) return `No ${label} match that search.`
  return `No ${label} are listed.`
}

export function AdminPage() {
  const location = useLocation()
  const profile = useAuthStore((state) => state.profile)
  const pushToast = useAppStore((state) => state.pushToast)
  const savingRef = useRef(false)
  const [rows, setRows] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'user'>('user')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [shown, setShown] = useState<ShownPassword | null>(null)
  const [resetFor, setResetFor] = useState<Person | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [activeFor, setActiveFor] = useState<{ person: Person; next: boolean } | null>(null)
  const [unlockFor, setUnlockFor] = useState<Person | null>(null)
  const [unlockDate, setUnlockDate] = useState('')
  const [unlockError, setUnlockError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.role !== 'admin' || !supabase) return
    let cancelled = false
    void supabase
      .from('profiles')
      .select(profileColumns)
      .order('created_at', { ascending: true })
      .then(({ data, error: loadError }) => {
        if (cancelled) return
        if (loadError) {
          setError(loadError.message)
          return
        }
        setRows(peopleFrom(data))
      })
    return () => {
      cancelled = true
    }
  }, [profile?.role])

  async function reloadPeople() {
    if (!supabase) return
    const { data, error: loadError } = await supabase.from('profiles').select(profileColumns).order('created_at', { ascending: true })
    if (loadError) {
      setError(loadError.message)
      return
    }
    setRows(peopleFrom(data))
  }

  if (!profile) return <p className="boot">Checking login…</p>
  if (profile.role !== 'admin') return <Navigate to="/" replace />
  const staff = profile
  const adding = location.hash === '#new-user'
  const today = localToday()
  const loaded = rows ?? []
  const users = loaded.filter((person) => person.role === 'user')
  const admins = loaded.filter((person) => person.role === 'admin')
  const visibleUsers = users.filter((person) => matchesQuery(query, person.full_name, person.email))
  const visibleAdmins = admins.filter((person) => matchesQuery(query, person.full_name, person.email))
  const searching = query.trim().length > 0
  const unlockNeedsDate = unlockFor ? expiryOnOrBeforeToday(unlockFor.access_expires_on, today) : false

  function patchRow(id: string, patch: Partial<Person>) {
    setRows((current) => current?.map((row) => (row.id === id ? { ...row, ...patch } : row)) ?? current)
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (!supabase || creating) return
    if (!email.trim().includes('@')) {
      setFormError('Enter a valid email')
      return
    }
    if (password.length < 8) {
      setFormError('Password needs at least 8 characters')
      return
    }
    setFormError(null)
    setCreating(true)
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'create', email, password, fullName, role },
    })
    setCreating(false)
    if (invokeError) {
      pushToast(await messageFromInvoke(invokeError), 'danger')
      return
    }
    const next = shownPassword(data)
    if (!next) {
      pushToast('Could not read the new login.', 'danger')
      return
    }
    setFullName('')
    setEmail('')
    setRole('user')
    setPassword('')
    setShown(next)
    const emailError = emailErrorFrom(data)
    pushToast(emailError ?? 'Email sent', emailError ? 'danger' : 'success')
    await reloadPeople()
  }

  async function onReset(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !resetFor || resetting) return
    if (resetPassword.length < 8) {
      pushToast('Password needs at least 8 characters', 'danger')
      return
    }
    const person = resetFor
    setResetting(true)
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'set-password', userId: person.id, password: resetPassword },
    })
    setResetting(false)
    if (invokeError) {
      pushToast(await messageFromInvoke(invokeError), 'danger')
      return
    }
    const next = shownPassword(data)
    if (!next) {
      pushToast('Could not read the new password.', 'danger')
      return
    }
    setResetFor(null)
    setResetPassword('')
    setShown(next)
    const emailError = emailErrorFrom(data)
    pushToast(emailError ?? 'Email sent', emailError ? 'danger' : 'success')
  }

  async function copyPassword() {
    if (!shown) return
    try {
      await navigator.clipboard.writeText(shown.password)
      pushToast('Password copied to clipboard')
    } catch (copyError) {
      pushToast(copyError instanceof Error && copyError.message ? copyError.message : 'Could not copy the password.', 'danger')
    }
  }

  function closeShown() {
    setShown(null)
  }

  async function saveExpiry(person: Person, value: string) {
    if (!supabase || person.role !== 'user' || savingId) return
    const accessExpiresOn = value.trim() || null
    if (accessExpiresOn === person.access_expires_on) return
    setError(null)
    setSavingId(person.id)
    patchRow(person.id, { access_expires_on: accessExpiresOn })
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ access_expires_on: accessExpiresOn })
      .eq('id', person.id)
      .select('id')
    setSavingId(null)
    if (updateError || !Array.isArray(data) || data.length === 0) {
      patchRow(person.id, { access_expires_on: person.access_expires_on })
      setError(updateError?.message || 'Could not save that expiry.')
    }
  }

  async function confirmActive() {
    if (!supabase || !activeFor || savingRef.current) return
    const { person, next } = activeFor
    if (person.id === staff.id && !next) {
      pushToast('You cannot turn off your own account.', 'danger')
      return
    }
    savingRef.current = true
    setSavingId(person.id)
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'set-active', userId: person.id, active: next },
    })
    savingRef.current = false
    setSavingId(null)
    if (invokeError) {
      pushToast(await messageFromInvoke(invokeError, 'Could not save that change.'), 'danger')
      return
    }
    const failure = invokeFailure(data, 'Could not save that change.')
    if (failure) {
      pushToast(failure, 'danger')
      return
    }
    patchRow(person.id, { active: next })
    setActiveFor(null)
    const emailError = emailErrorFrom(data)
    if (emailError) pushToast(emailError, 'danger')
  }

  async function confirmUnlock() {
    if (!supabase || !unlockFor || savingRef.current) return
    const person = unlockFor
    const todayNow = localToday()
    const needsDate = expiryOnOrBeforeToday(person.access_expires_on, todayNow)
    if (needsDate && !isDateAfter(unlockDate, todayNow)) {
      setUnlockError('Enter a date after today.')
      return
    }
    savingRef.current = true
    setSavingId(person.id)
    setUnlockError(null)
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', {
      body: needsDate
        ? { action: 'unlock', userId: person.id, accessExpiresOn: unlockDate }
        : { action: 'unlock', userId: person.id },
    })
    savingRef.current = false
    setSavingId(null)
    if (invokeError) {
      pushToast(await messageFromInvoke(invokeError, 'Could not unlock that user.'), 'danger')
      return
    }
    const failure = invokeFailure(data, 'Could not unlock that user.')
    if (failure) {
      pushToast(failure, 'danger')
      return
    }
    patchRow(person.id, needsDate ? { locked: false, access_expires_on: unlockDate } : { locked: false })
    setUnlockFor(null)
    setUnlockDate('')
    setUnlockError(null)
    const emailError = emailErrorFrom(data)
    if (emailError) pushToast(emailError, 'danger')
  }

  function openReset(person: Person) {
    setResetPassword('')
    setResetFor(person)
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="eyebrow">
            <Users size={13} style={{ color: 'var(--accent)' }} />
            <span>Staff Administration</span>
          </div>
          <h1>Staff & Administrators</h1>
          <p className="lede">
            Manage team logins, access permissions, expiration dates, and account credentials.
          </p>
        </div>
        <div>
          {adding ? (
            <Link
              to="/admin/users"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={14} />
              <span>Back to staff directory</span>
            </Link>
          ) : (
            <Link
              to="/admin/users#new-user"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus size={15} />
              <span>Add new staff</span>
            </Link>
          )}
        </div>
      </div>

      {adding ? (
        <div className="split-desk">
          <form id="new-user" className="people-create card" onSubmit={(event) => void onCreate(event)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>Create New Staff Login</h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>Authorize a sales rep or administrative team member</p>
              </div>
            </div>
            <div className="form-grid">
              <TextField label="Full name" value={fullName} autoComplete="name" onChange={setFullName} />
              <TextField label="Email" type="email" value={email} autoComplete="off" onChange={setEmail} />
              <SelectField label="Role" value={role} onChange={(value) => setRole(value === 'admin' ? 'admin' : 'user')}>
                <option value="user">Staff User</option>
                <option value="admin">Administrator</option>
              </SelectField>
              <TextField label="Password" type="password" value={password} autoComplete="new-password" hint="At least 8 characters" onChange={setPassword} />
            </div>
            {formError ? <p className="form-error">{formError}</p> : null}
            <div style={{ marginTop: '16px' }}>
              <Button type="submit" disabled={creating} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={14} />
                <span>{creating ? 'Creating…' : 'Create login'}</span>
              </Button>
            </div>
          </form>
          <aside className="card desk-note" style={{ background: 'var(--bg-subtle)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 10px', color: 'var(--ink)' }}>Account Provisions</h2>
            <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--muted)', margin: '0 0 14px' }}>
              A staff login will immediately be generated for this email. They will authenticate using the initial password configured here.
            </p>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--ink-soft)', display: 'grid', gap: '8px' }}>
              <li><strong>Staff Users</strong> can draft window & door assemblies, send quotations, and book production jobs.</li>
              <li><strong>Administrators</strong> have complete access to company margins, order ledgers, and team accounts.</li>
              <li>The initial password is presented once upon submission for immediate handover to the staff member.</li>
            </ul>
          </aside>
        </div>
      ) : null}

      {!adding && error ? <p className="form-error">{error}</p> : null}
      {!adding && !error && rows === null ? <p className="boot">Loading staff accounts…</p> : null}

      {!adding && rows ? (
        <div className="toolbar" style={{ marginBottom: '18px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: '1 1 360px',
            maxWidth: '480px',
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
              placeholder="Search staff by name or email…"
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

      {!adding && rows ? (
        <section className="people-section" aria-labelledby="people-users">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--accent)' }} />
              <h2 id="people-users" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Staff Users</h2>
            </div>
            <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-soft)', border: '1px solid var(--line)', fontWeight: 600, fontSize: '12px' }}>
              {visibleUsers.length} {visibleUsers.length === 1 ? 'user' : 'users'}
            </span>
          </div>

          {visibleUsers.length === 0 ? <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: '14px' }}>{emptyPeople(users.length, searching, 'users')}</p> : null}
          {visibleUsers.length > 0 ? (
            <div className="table-scroll">
              <table className="people-table people-users">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>User ID</th>
                    <th>Role</th>
                    <th>Active</th>
                    <th>Expiry Date</th>
                    <th>Lock Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Security</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((person) => {
                    const busy = savingId === person.id
                    const ownRow = person.id === staff.id
                    const showsLocked = userAccessLocked('user', person.locked, person.access_expires_on, today)
                    const pName = displayName(person)

                    return (
                      <tr key={person.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(99, 102, 241, 0.2)',
                            }}>
                              {initials(pName)}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{pName}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>{person.email}</span>
                        </td>
                        <td className="people-id" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: 'var(--muted)' }}>
                          {person.id}
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-soft)', border: '1px solid var(--line)', fontSize: '11px' }}>
                            Staff
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={person.active ? 'switch is-on' : 'switch'}
                            role="switch"
                            aria-checked={person.active}
                            aria-label={`${person.active ? 'Active' : 'Inactive'} for ${person.email}`}
                            disabled={ownRow || savingId !== null}
                            title={ownRow ? 'You cannot turn off your own account.' : undefined}
                            onClick={() => {
                              if (ownRow || savingId) return
                              setActiveFor({ person, next: !person.active })
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              border: '1px solid var(--line)',
                              background: person.active ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-subtle)',
                              color: person.active ? 'var(--ok)' : 'var(--muted)',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: ownRow ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <span style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: person.active ? 'var(--ok)' : 'var(--muted)',
                            }} />
                            {person.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td>
                          <input
                            className="input"
                            type="date"
                            aria-label={`Expiry for ${person.email}`}
                            value={person.access_expires_on ?? ''}
                            disabled={busy}
                            onChange={(event) => {
                              void saveExpiry(person, event.target.value)
                            }}
                            style={{
                              fontSize: '12px',
                              padding: '4px 8px',
                              width: 'auto',
                              minWidth: '130px',
                            }}
                          />
                        </td>
                        <td>
                          {showsLocked ? (
                            <div className="people-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span className="badge badge-danger" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Lock size={11} />
                                <span>Locked</span>
                              </span>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busy || resetting}
                                onClick={() => {
                                  setUnlockDate('')
                                  setUnlockError(null)
                                  setUnlockFor(person)
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '11px' }}
                              >
                                <Unlock size={11} />
                                <span>Unlock</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="badge badge-ok" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={11} />
                              <span>Unlocked</span>
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{formatDate(person.created_at)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy || resetting}
                            onClick={() => openReset(person)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <KeyRound size={12} />
                            <span>Reset password</span>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {!adding && rows ? (
        <section className="people-section" aria-labelledby="people-admins">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
              <h2 id="people-admins" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Administrators</h2>
            </div>
            <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-soft)', border: '1px solid var(--line)', fontWeight: 600, fontSize: '12px' }}>
              {visibleAdmins.length} {visibleAdmins.length === 1 ? 'admin' : 'admins'}
            </span>
          </div>

          {visibleAdmins.length === 0 ? <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: '14px' }}>{emptyPeople(admins.length, searching, 'admins')}</p> : null}
          {visibleAdmins.length > 0 ? (
            <div className="table-scroll">
              <table className="people-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>User ID</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Security</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAdmins.map((person) => {
                    const busy = savingId === person.id
                    const pName = displayName(person)
                    return (
                      <tr key={person.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: 'rgba(14, 165, 233, 0.12)',
                              color: 'var(--accent)',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(14, 165, 233, 0.25)',
                            }}>
                              {initials(pName)}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{pName}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>{person.email}</span>
                        </td>
                        <td className="people-id" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: 'var(--muted)' }}>
                          {person.id}
                        </td>
                        <td>
                          <span className="badge badge-accent" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={11} />
                            <span>Admin</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{formatDate(person.created_at)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy || resetting}
                            onClick={() => openReset(person)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <KeyRound size={12} />
                            <span>Reset password</span>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <ConfirmDialog
        open={activeFor !== null}
        title={activeFor?.next ? 'Activate Staff Account?' : 'Deactivate Staff Account?'}
        description={
          activeFor
            ? activeFor.next
              ? `${displayName(activeFor.person)} will be marked active and can sign in again. A notification email will be sent.`
              : `${displayName(activeFor.person)} will be marked inactive and signed out of the app. A notification email will be sent.`
            : ''
        }
        confirmLabel={savingId && activeFor ? 'Saving…' : activeFor?.next ? 'Set active' : 'Set inactive'}
        tone={activeFor?.next ? 'primary' : 'danger'}
        onConfirm={() => void confirmActive()}
        onOpenChange={(open) => {
          if (!open && !savingRef.current) setActiveFor(null)
        }}
      />

      <ConfirmDialog
        open={unlockFor !== null}
        title="Unlock this staff account?"
        description={
          unlockFor
            ? unlockNeedsDate
              ? `${displayName(unlockFor)} will be unlocked. The current access expiry is today or earlier, so choose a new future date. A notification email will be sent.`
              : `${displayName(unlockFor)} will be unlocked immediately. A notification email will be sent.`
            : ''
        }
        confirmLabel={savingId && unlockFor ? 'Saving…' : 'Unlock Account'}
        onConfirm={() => void confirmUnlock()}
        onOpenChange={(open) => {
          if (!open && !savingRef.current) {
            setUnlockFor(null)
            setUnlockDate('')
            setUnlockError(null)
          }
        }}
      >
        {unlockNeedsDate ? (
          <label className="field" style={{ marginTop: '12px' }}>
            <span className="field-label">New Expiry Date</span>
            <input
              className="input"
              type="date"
              min={dayAfter(today)}
              value={unlockDate}
              aria-label="New expiry"
              onChange={(event) => {
                setUnlockDate(event.target.value)
                setUnlockError(null)
              }}
            />
            <span className="field-hint">Must be set after today.</span>
            {unlockError ? <p className="form-error">{unlockError}</p> : null}
          </label>
        ) : null}
      </ConfirmDialog>

      <Modal
        open={resetFor !== null}
        title="Set New Staff Password"
        onOpenChange={(open) => {
          if (!open && !resetting) {
            setResetFor(null)
            setResetPassword('')
          }
        }}
      >
        <form className="password-once" onSubmit={(event) => void onReset(event)}>
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--muted)' }}>
            Updating credentials for <strong>{resetFor?.email}</strong>
          </p>
          <TextField
            label="New password"
            type="password"
            value={resetPassword}
            autoComplete="new-password"
            hint="Must be at least 8 characters"
            onChange={setResetPassword}
          />
          <div className="dialog-actions" style={{ marginTop: '16px' }}>
            <Button type="submit" disabled={resetting} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={14} />
              <span>{resetting ? 'Saving…' : 'Update password'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={shown !== null} title="Generated Credentials" onOpenChange={(open) => !open && closeShown()}>
        {shown ? (
          <>
            <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', marginBottom: '16px' }}>
              <dl className="password-once" style={{ margin: 0, display: 'grid', gap: '12px' }}>
                <div>
                  <dt style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Email Address</dt>
                  <dd style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '2px 0 0' }}>{shown.email}</dd>
                </div>
                <div>
                  <dt style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Temporary Password</dt>
                  <dd style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'ui-monospace, monospace', margin: '2px 0 0' }}>{shown.password}</dd>
                </div>
              </dl>
            </div>
            <p className="dialog-copy" style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '0 0 16px' }}>
              Please copy and provide this password to the user. For security, it will not be displayed again.
            </p>
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => void copyPassword()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Copy size={14} />
                <span>Copy password</span>
              </Button>
              <Button onClick={closeShown}>Done</Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  )
}
