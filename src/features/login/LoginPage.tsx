import { useEffect, useId, useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { supabase } from '../../lib/supabase.ts'
import { useAuthStore } from '../../auth/session.ts'

const copy = {
  staff: {
    title: 'Welcome back',
    lede: 'Sign in to continue to SunnyPlast',
    submit: 'Sign in',
    footnote: 'SunnyPlast Internal Portal',
  },
  admin: {
    title: 'Welcome back, Admin',
    lede: 'Sign in to access the SunnyPlast administration portal',
    submit: 'Sign in to Admin Portal',
    footnote: 'SunnyPlast Administration',
  },
} as const

export function LoginBrand() {
  return (
    <header className="login-brand">
      <img className="login-logo" src="/favicon.svg" alt="" width="48" height="48" />
      <p className="login-company">SunnyPlast</p>
    </header>
  )
}

export function LoginPage({ variant = 'staff' }: { variant?: 'staff' | 'admin' }) {
  const text = copy[variant]
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

  useEffect(() => {
    if (notice) setBusy(false)
  }, [notice])

  if (loading) {
    return (
      <div className="login-screen">
        <p className="login-status" role="status">
          Checking login…
        </p>
      </div>
    )
  }
  if (session && profile) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy || !supabase) return
    setError(null)
    clearNotice()
    setBusy(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) {
      setBusy(false)
      setError(signInError.message)
    }
  }

  return (
    <div className="login-screen">
      <div className="card login-card">
        <LoginBrand />
        <form className="login-form" onSubmit={onSubmit} aria-busy={busy}>
          <div className="login-intro">
            <h1 className="login-title">{text.title}</h1>
            <p className="login-lede">{text.lede}</p>
          </div>
          <TextField
            label="Email address"
            type="email"
            name="email"
            value={email}
            autoComplete="username"
            autoFocus
            disabled={busy}
            invalid={Boolean(error || notice)}
            onChange={setEmail}
          />
          <PasswordField value={password} disabled={busy} invalid={Boolean(error || notice)} onChange={setPassword} />
          <div className="login-feedback" aria-live="polite">
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="form-error" role="alert">
                {notice}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={busy} className={busy ? 'is-busy' : undefined}>
            {busy ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              text.submit
            )}
          </Button>
        </form>
        <p className="login-footnote">{text.footnote}</p>
      </div>
    </div>
  )
}

function PasswordField({
  value,
  onChange,
  disabled,
  invalid,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
  invalid: boolean
}) {
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        Password
      </label>
      <div className="login-password">
        <input
          id={id}
          className="input"
          name="password"
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete="current-password"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="login-reveal"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
