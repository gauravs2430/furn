import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  Eye,
  EyeOff,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { supabase } from '../../lib/supabase.ts'
import { expectLoginRole, useAuthStore } from '../../auth/session.ts'
import { company } from '../../data/company.ts'

const copy = {
  staff: {
    title: 'Welcome back',
    lede: 'Sign in to access your quotes, orders, and workshop specs',
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

export function LoginBrand({ variant }: { variant?: 'staff' | 'admin' }) {
  return (
    <header className="login-brand">
      <div className="login-logo-wrap">
        <img className="login-logo" src="/favicon.svg" alt="SunnyPlast" width="36" height="36" />
      </div>
      <div className="login-brand-meta">
        <p className="login-company">SunnyPlast</p>
        <span className="login-portal-tag">{variant === 'admin' ? 'Admin Portal' : 'Staff Portal'}</span>
      </div>
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
        <div className="login-status-box" role="status">
          <span className="login-spinner" aria-hidden="true" />
          <p className="login-status">Checking credentials…</p>
        </div>
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
    expectLoginRole(variant === 'admin' ? 'admin' : 'user')
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) {
      expectLoginRole(null)
      setBusy(false)
      setError(signInError.message)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-glow-orb login-glow-orb-1" aria-hidden="true" />
      <div className="login-glow-orb login-glow-orb-2" aria-hidden="true" />

      <div className="login-split">
        <aside className="login-aside">
          <div className="login-aside-glow" aria-hidden="true" />

          <div className="login-aside-top">
            <div className="login-aside-badge">
              <span className="login-badge-dot" />
              <span>{variant === 'admin' ? 'Admin Gateway' : 'Internal Workspace'}</span>
            </div>

            <div className="login-aside-hero">
              <h2 className="login-aside-name">{company.name}</h2>
              <p className="login-aside-tag">{company.tagline}</p>
            </div>

            <div className="login-aside-features">
              <div className="login-feature-item">
                <div className="login-feature-icon">
                  <Sparkles size={16} />
                </div>
                <div className="login-feature-text">
                  <h4 className="login-feature-title">Parametric Joinery Configurator</h4>
                  <p className="login-feature-desc">Real-time sash geometry, profile calculation & live 2D drawing.</p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon">
                  <CheckCircle2 size={16} />
                </div>
                <div className="login-feature-text">
                  <h4 className="login-feature-title">Automated Pricing & Orders</h4>
                  <p className="login-feature-desc">Precise cost estimation matrix, customer quotes & workshop specs.</p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon">
                  <ShieldCheck size={16} />
                </div>
                <div className="login-feature-text">
                  <h4 className="login-feature-title">Enterprise Security</h4>
                  <p className="login-feature-desc">Role-based access controls and encrypted production workflows.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-aside-bottom">
            <div className="login-aside-contact">
              <div className="login-contact-row">
                <MapPin size={14} className="login-contact-icon" />
                <span>{company.lines[0]}, {company.lines[1]}</span>
              </div>
              <div className="login-contact-row">
                <Phone size={14} className="login-contact-icon" />
                <span>{company.phone}</span>
              </div>
              <div className="login-contact-row">
                <Mail size={14} className="login-contact-icon" />
                <span>{company.email}</span>
              </div>
            </div>

            <div className="login-aside-status">
              <span className="login-status-dot" />
              <span>SunnyPlast Core v2.4 • Active</span>
            </div>
          </div>
        </aside>

        <div className="card login-card">
          <LoginBrand variant={variant} />

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
              placeholder="user@sunnyplast.ro"
              autoFocus
              disabled={busy}
              invalid={Boolean(error || notice)}
              onChange={setEmail}
            />

            <PasswordField
              value={password}
              disabled={busy}
              invalid={Boolean(error || notice)}
              onChange={setPassword}
            />

            {(error || notice) && (
              <div className="login-feedback-alert" role="alert">
                <AlertCircle size={16} className="login-alert-icon" />
                <span className="login-alert-msg">{error || notice}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className={`login-submit-btn ${busy ? 'is-busy' : ''}`}
            >
              {busy ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>{text.submit}</span>
                  <ArrowRight size={16} className="login-btn-arrow" />
                </>
              )}
            </Button>

            <div className="login-switch-wrap">
              {variant === 'staff' ? (
                <p className="login-switch">
                  Administrative access?{' '}
                  <Link to="/admin/login" onClick={() => clearNotice()}>
                    Admin portal &rarr;
                  </Link>
                </p>
              ) : (
                <p className="login-switch">
                  Standard staff user?{' '}
                  <Link to="/login" onClick={() => clearNotice()}>
                    Staff portal &rarr;
                  </Link>
                </p>
              )}
            </div>
          </form>

          <footer className="login-footnote-box">
            <p className="login-footnote">{text.footnote} &bull; Authorized Personnel Only</p>
          </footer>
        </div>
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
          placeholder="••••••••••••"
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
          title={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
