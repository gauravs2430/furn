import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
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
      pushToast('Password copied')
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
          <h1>People</h1>
          <nav className="page-links" aria-label="Admin">
            <Link to="/admin/prices">Prices</Link>
            <Link to="/admin/catalog">Catalogue</Link>
            <Link to="/admin/orders">All orders</Link>
          </nav>
        </div>
      </div>

      {adding ? (
        <form id="new-user" className="people-create card" onSubmit={(event) => void onCreate(event)}>
          <h2>New login</h2>
          <div className="form-grid">
            <TextField label="Full name" value={fullName} autoComplete="name" onChange={setFullName} />
            <TextField label="Email" type="email" value={email} autoComplete="off" onChange={setEmail} />
            <SelectField label="Role" value={role} onChange={(value) => setRole(value === 'admin' ? 'admin' : 'user')}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </SelectField>
            <TextField label="Password" type="password" value={password} autoComplete="new-password" hint="At least 8 characters" onChange={setPassword} />
          </div>
          {formError ? <p className="form-error">{formError}</p> : null}
          <Button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create login'}
          </Button>
        </form>
      ) : null}

      {!adding && error ? <p className="form-error">{error}</p> : null}
      {!adding && !error && rows === null ? <p className="boot">Loading people…</p> : null}
      {!adding && rows ? (
        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Search people</span>
            <input
              value={query}
              placeholder="Search name or email"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {!adding && rows ? (
        <section className="people-section" aria-labelledby="people-users">
          <h2 id="people-users">Users</h2>
          {visibleUsers.length === 0 ? <p>{emptyPeople(users.length, searching, 'users')}</p> : null}
          {visibleUsers.length > 0 ? (
            <div className="table-scroll">
              <table className="people-table people-users">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>User id</th>
                    <th>Role</th>
                    <th>Active</th>
                    <th>Expiry</th>
                    <th>Lock</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((person) => {
                    const busy = savingId === person.id
                    const ownRow = person.id === staff.id
                    const showsLocked = userAccessLocked('user', person.locked, person.access_expires_on, today)
                    return (
                      <tr key={person.id}>
                        <td>{person.full_name.trim() || '—'}</td>
                        <td>{person.email}</td>
                        <td className="people-id">{person.id}</td>
                        <td>user</td>
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
                          >
                            <span className="switch-track" aria-hidden="true" />
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
                          />
                        </td>
                        <td>
                          {showsLocked ? (
                            <div className="people-actions">
                              <span>Locked</span>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busy || resetting}
                                onClick={() => {
                                  setUnlockDate('')
                                  setUnlockError(null)
                                  setUnlockFor(person)
                                }}
                              >
                                Unlock
                              </Button>
                            </div>
                          ) : (
                            'Unlocked'
                          )}
                        </td>
                        <td>{formatDate(person.created_at)}</td>
                        <td>
                          <div className="people-actions">
                            <Link className="btn btn-sm btn-secondary" to={`/admin/users/${person.id}/orders`}>
                              Orders
                            </Link>
                            <Button variant="secondary" size="sm" disabled={busy || resetting} onClick={() => openReset(person)}>
                              Set a new password
                            </Button>
                          </div>
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
          <h2 id="people-admins">Admins</h2>
          {visibleAdmins.length === 0 ? <p>{emptyPeople(admins.length, searching, 'admins')}</p> : null}
          {visibleAdmins.length > 0 ? (
            <div className="table-scroll">
              <table className="people-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>User id</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAdmins.map((person) => {
                    const busy = savingId === person.id
                    return (
                      <tr key={person.id}>
                        <td>{person.full_name.trim() || '—'}</td>
                        <td>{person.email}</td>
                        <td className="people-id">{person.id}</td>
                        <td>admin</td>
                        <td>{formatDate(person.created_at)}</td>
                        <td>
                          <Button variant="secondary" size="sm" disabled={busy || resetting} onClick={() => openReset(person)}>
                            Set a new password
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
        title={activeFor?.next ? 'Set active?' : 'Set inactive?'}
        description={
          activeFor
            ? activeFor.next
              ? `${displayName(activeFor.person)} will be marked active and can sign in again. An email will be sent.`
              : `${displayName(activeFor.person)} will be marked inactive and signed out of the app. An email will be sent.`
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
        title="Unlock this account?"
        description={
          unlockFor
            ? unlockNeedsDate
              ? `${displayName(unlockFor)} will be unlocked. The current expiry is today or earlier, so choose a new date after today. An email will be sent.`
              : `${displayName(unlockFor)} will be unlocked. An email will be sent.`
            : ''
        }
        confirmLabel={savingId && unlockFor ? 'Saving…' : 'Unlock'}
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
          <label className="field">
            <span className="field-label">New expiry</span>
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
            <span className="field-hint">Must be after today.</span>
            {unlockError ? <p className="form-error">{unlockError}</p> : null}
          </label>
        ) : null}
      </ConfirmDialog>

      <Modal
        open={resetFor !== null}
        title="Set a new password"
        onOpenChange={(open) => {
          if (!open && !resetting) {
            setResetFor(null)
            setResetPassword('')
          }
        }}
      >
        <form className="password-once" onSubmit={(event) => void onReset(event)}>
          <p>{resetFor?.email}</p>
          <TextField label="Password" type="password" value={resetPassword} autoComplete="new-password" hint="At least 8 characters" onChange={setResetPassword} />
          <div className="dialog-actions">
            <Button type="submit" disabled={resetting}>
              {resetting ? 'Saving…' : 'Set a new password'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={shown !== null} title="Password" onOpenChange={(open) => !open && closeShown()}>
        {shown ? (
          <>
            <dl className="password-once">
              <div>
                <dt>Email</dt>
                <dd>{shown.email}</dd>
              </div>
              <div>
                <dt>Password</dt>
                <dd>{shown.password}</dd>
              </div>
            </dl>
            <p className="dialog-copy">This password is shown once. It is not stored.</p>
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => void copyPassword()}>
                Copy
              </Button>
              <Button onClick={closeShown}>Close</Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  )
}
