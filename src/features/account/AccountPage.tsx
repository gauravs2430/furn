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
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setPassword('')
    pushToast('Password updated')
  }

  if (!profile) return <p className="boot">Checking login…</p>

  return (
    <div className="page">
      <h1>Account</h1>
      <form className="account-name" onSubmit={onSaveName}>
        <TextField label="Name" value={name} autoComplete="name" onChange={setName} />
        {nameError ? <p className="form-error">{nameError}</p> : null}
        <Button type="submit" disabled={nameBusy}>
          {nameBusy ? 'Saving…' : 'Save name'}
        </Button>
      </form>
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
      <form className="account-password" onSubmit={onSubmit}>
        <h2>New password</h2>
        <TextField label="New password" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
        {error ? <p className="form-error">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Set password'}
        </Button>
      </form>
    </div>
  )
}
