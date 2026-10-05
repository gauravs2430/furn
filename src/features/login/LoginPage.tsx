import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { supabase } from '../../lib/supabase.ts'
import { useAuthStore } from '../../auth/session.ts'

export function LoginPage() {
  const loading = useAuthStore((state) => state.loading)
  const session = useAuthStore((state) => state.session)
  const profile = useAuthStore((state) => state.profile)
  const notice = useAuthStore((state) => state.notice)
  const clearNotice = useAuthStore((state) => state.clearNotice)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (session && profile) clearNotice()
  }, [session, profile, clearNotice])

  if (loading) return <p className="boot">Checking login…</p>
  if (session && profile) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setError(null)
    clearNotice()
    setBusy(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (signInError) setError(signInError.message)
  }

  return (
    <div className="login-screen">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>SunnyPlast</h1>
        <TextField label="Email" type="email" value={email} autoComplete="username" onChange={setEmail} />
        <TextField label="Password" type="password" value={password} autoComplete="current-password" onChange={setPassword} />
        {error ? <p className="form-error">{error}</p> : null}
        {notice ? <p className="form-error">{notice}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
