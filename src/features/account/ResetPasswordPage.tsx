import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { supabase } from '../../lib/supabase.ts'
import { LoginBrand } from '../login/LoginPage.tsx'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [canReset, setCanReset] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setReady(true)
      return
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setCanReset(Boolean(session))
      setReady(true)
    })
    void supabase.auth.getSession().then(({ data: sessionData }) => {
      setCanReset(Boolean(sessionData.session))
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    if (password.length < 8) {
      setError('Password needs at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
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
    navigate('/account', { replace: true })
  }

  return (
    <div className="login-screen">
      <div className="card login-card reset-password-card">
        <LoginBrand />
        <form className="login-form" onSubmit={onSubmit} aria-busy={busy}>
          <div className="login-intro">
            <h1 className="login-title">Reset password</h1>
            <p className="login-lede">Choose a new password for your SunnyPlast account.</p>
          </div>
          {!ready ? <p className="login-status">Checking your reset link…</p> : null}
          {ready && !canReset ? (
            <p className="form-error" role="alert">
              This reset link is invalid or has expired. Request a new link from your Account page.
            </p>
          ) : null}
          {ready && canReset ? (
            <>
              <TextField label="New password" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
              <TextField
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={setConfirmPassword}
              />
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Set new password'}
              </Button>
            </>
          ) : null}
        </form>
      </div>
    </div>
  )
}
