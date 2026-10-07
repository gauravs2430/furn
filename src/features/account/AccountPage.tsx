import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { useAuthStore } from '../../auth/session.ts'
import { supabase } from '../../lib/supabase.ts'
import { useAppStore } from '../../store/useAppStore.ts'

export function AccountPage() {
  const profile = useAuthStore((state) => state.profile)
  const pushToast = useAppStore((state) => state.pushToast)
  const [name, setName] = useState(profile?.full_name ?? '')
  const [seenName, setSeenName] = useState(profile?.full_name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameBusy, setNameBusy] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (profile && profile.full_name !== seenName) {
    setSeenName(profile.full_name)
    if (name === seenName) setName(profile.full_name)
  }

  async function onSaveName(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !profile) return
    const fullName = name.trim()
    setNameError(null)
    setNameBusy(true)
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id)
      .select('full_name')
    setNameBusy(false)
    if (updateError) {
      setNameError(updateError.message)
      return
    }
    const saved = Array.isArray(data) ? data[0] : null
    if (!saved || typeof saved.full_name !== 'string') {
      setNameError('Could not save your name.')
      return
    }
    setName(saved.full_name)
    useAuthStore.setState((state) => ({
      profile: state.profile ? { ...state.profile, full_name: saved.full_name } : state.profile,
    }))
    pushToast('Name saved')
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !profile) return
    if (password.length < 8) {
      setError('Password needs at least 8 characters.')
      return
    }
    setError(null)
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setBusy(false)
      setError(updateError.message)
      return
    }
    const { error: stampError } = await supabase.rpc('mark_password_set')
    setBusy(false)
    if (stampError) {
      setError(stampError.message)
      return
    }
    setPassword('')
    useAuthStore.setState((state) => ({
      profile: state.profile ? { ...state.profile, passwordSetAt: new Date().toISOString() } : state.profile,
    }))
    pushToast('Password updated')
  }

  if (!profile) return <p className="boot">Checking login…</p>

  return (
    <div className="page">
      <h1>Account</h1>
      <div className="account-layout">
        <div className="account-forms">
          <form className="card account-name" onSubmit={onSaveName}>
            <h2>Name</h2>
            <TextField label="Name" value={name} autoComplete="name" onChange={setName} />
            {nameError ? <p className="form-error">{nameError}</p> : null}
            <Button type="submit" disabled={nameBusy}>
              {nameBusy ? 'Saving…' : 'Save name'}
            </Button>
          </form>
          <form className="card account-password" onSubmit={onSubmit}>
            <h2>New password</h2>
            <p className="field-hint">At least 8 characters. This replaces the password you sign in with.</p>
            <TextField label="New password" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
            {error ? <p className="form-error">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Set password'}
            </Button>
          </form>
        </div>
        <aside className="card account-side">
          <p className="home-kicker">{profile.role === 'admin' ? 'Admin' : 'Staff'}</p>
          <h2>{profile.full_name.trim() || 'Account'}</h2>
          <dl className="account-facts">
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>User id</dt>
              <dd className="account-id">{profile.id}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
