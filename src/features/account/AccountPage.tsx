import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { useAuthStore } from '../../auth/session.ts'
import { supabase } from '../../lib/supabase.ts'
import { useAppStore } from '../../store/useAppStore.ts'

export function AccountPage() {
  const profile = useAuthStore((state) => state.profile)
  const pushToast = useAppStore((state) => state.pushToast)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
      <dl className="account-facts">
        <div>
          <dt>Name</dt>
          <dd>{profile.full_name.trim() || '—'}</dd>
        </div>
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
