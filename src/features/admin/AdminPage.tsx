import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { supabase } from '../../lib/supabase.ts'
import { formatDate } from '../../utils/dates.ts'

interface Person {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user'
  active: boolean
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

export function AdminPage() {
  const profile = useAuthStore((state) => state.profile)
  const [rows, setRows] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.role !== 'admin' || !supabase) return
    let cancelled = false
    void supabase
      .from('profiles')
      .select('id, email, full_name, role, active, created_at')
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
    patchRow(person.id, { role })
    const { data, error: updateError } = await supabase.from('profiles').update({ role }).eq('id', person.id).select('id')
    setSavingId(null)
    if (updateError || !Array.isArray(data) || data.length === 0) {
      patchRow(person.id, { role: person.role })
      setError(updateError?.message || 'Could not save that role.')
      return
    }
    if (person.id === staff.id) {
      useAuthStore.setState((state) => ({
        profile: state.profile ? { ...state.profile, role } : state.profile,
      }))
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
            <Link to="/admin/orders">All orders</Link>
          </nav>
        </div>
      </div>

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
                <th>Created</th>
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
                    <td>{formatDate(person.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
