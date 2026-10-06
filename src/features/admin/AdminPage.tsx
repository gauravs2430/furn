import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { Button } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Dialog.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { supabase } from '../../lib/supabase.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { formatDate } from '../../utils/dates.ts'

interface Person {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user'
  active: boolean
  access_expires_on: string | null
  created_at: string
}

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

interface ShownPassword {
  email: string
  password: string
}

async function messageFromInvoke(error: unknown): Promise<string> {
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
  return 'Could not save that login.'
}

function shownPassword(value: unknown): ShownPassword | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (typeof body.email !== 'string' || typeof body.temporaryPassword !== 'string') return null
  if (!body.temporaryPassword) return null
  return { email: body.email, password: body.temporaryPassword }
}

export function AdminPage() {
  const profile = useAuthStore((state) => state.profile)
  const pushToast = useAppStore((state) => state.pushToast)
  const [rows, setRows] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
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

  useEffect(() => {
    if (profile?.role !== 'admin' || !supabase) return
    let cancelled = false
    void supabase
      .from('profiles')
      .select('id, email, full_name, role, active, access_expires_on, created_at')
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
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, active, access_expires_on, created_at')
      .order('created_at', { ascending: true })
    if (loadError) {
      setError(loadError.message)
      return
    }
    setRows(peopleFrom(data))
  }

  if (!profile) return <p className="boot">Checking login…</p>
  if (profile.role !== 'admin') return <Navigate to="/" replace />
  const staff = profile

  function patchRow(id: string, patch: Partial<Person>) {
    setRows((current) => current?.map((row) => (row.id === id ? { ...row, ...patch } : row)) ?? current)
  }

  async function saveRole(person: Person, role: 'admin' | 'user') {
    if (!supabase || role === person.role || savingId) return
    setError(null)
    setSavingId(person.id)
    patchRow(person.id, role === 'admin' ? { role, access_expires_on: null } : { role })
    const { data, error: updateError } = await supabase.from('profiles').update({ role }).eq('id', person.id).select('id')
    setSavingId(null)
    if (updateError || !Array.isArray(data) || data.length === 0) {
      patchRow(person.id, { role: person.role, access_expires_on: person.access_expires_on })
      setError(updateError?.message || 'Could not save that role.')
      return
    }
    if (person.id === staff.id) {
      useAuthStore.setState((state) => ({
        profile: state.profile ? { ...state.profile, role } : state.profile,
      }))
    }
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

  async function saveActive(person: Person, active: boolean) {
    if (!supabase || person.id === staff.id || active === person.active || savingId) return
    setError(null)
    setSavingId(person.id)
    patchRow(person.id, { active })
    const { data, error: updateError } = await supabase.from('profiles').update({ active }).eq('id', person.id).select('id')
    setSavingId(null)
    if (updateError || !Array.isArray(data) || data.length === 0) {
      patchRow(person.id, { active: person.active })
      setError(updateError?.message || 'Could not save that change.')
      return
    }
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

      <form className="people-create card" onSubmit={(event) => void onCreate(event)}>
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

      {error ? <p className="form-error">{error}</p> : null}
      {!error && rows === null ? <p className="boot">Loading people…</p> : null}
      {rows && rows.length === 0 ? <p>No people are listed.</p> : null}
      {rows && rows.length > 0 ? (
        <div className="table-scroll">
          <table className="people-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>User id</th>
                <th>Role</th>
                <th>Active</th>
                <th>Expiry</th>
                <th>Created</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => {
                const busy = savingId === person.id
                const ownRow = person.id === staff.id
                return (
                  <tr key={person.id}>
                    <td>{person.full_name.trim() || '—'}</td>
                    <td>{person.email}</td>
                    <td className="people-id">{person.id}</td>
                    <td>
                      <select
                        className="input"
                        aria-label={`Role for ${person.email}`}
                        value={person.role}
                        disabled={busy}
                        onChange={(event) => {
                          const role = event.target.value === 'admin' ? 'admin' : 'user'
                          void saveRole(person, role)
                        }}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <label className="row-check" title={ownRow ? 'You cannot turn off your own account.' : undefined}>
                        <input
                          type="checkbox"
                          checked={person.active}
                          disabled={ownRow || busy}
                          aria-label={ownRow ? 'Active. You cannot turn off your own account.' : `Active for ${person.email}`}
                          onChange={(event) => {
                            void saveActive(person, event.target.checked)
                          }}
                        />
                        {person.active ? 'Active' : 'Off'}
                      </label>
                    </td>
                    <td>
                      {person.role === 'user' ? (
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
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{formatDate(person.created_at)}</td>
                    <td>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy || resetting}
                        onClick={() => {
                          setResetPassword('')
                          setResetFor(person)
                        }}
                      >
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
