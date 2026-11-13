import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { useAuthStore } from '../../auth/session.ts'
import { supabase } from '../../lib/supabase.ts'
import { useAppStore } from '../../store/useAppStore.ts'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return `${first}${last}`.toUpperCase()
}

/** Admins can send themselves a reset link; staff passwords are changed by an admin. */
function AdminPasswordReset({ email }: { email: string }) {
  const pushToast = useAppStore((state) => state.pushToast)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendPasswordReset() {
    if (!supabase || busy) return
    setError(null)
    setBusy(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    pushToast(`A password reset link was sent to ${email}.`)
  }

  return (
    <span className="account-reset">
      <Button size="sm" variant="secondary" disabled={busy} aria-busy={busy} onClick={sendPasswordReset}>
        {busy ? 'Sending…' : 'Email me a reset link'}
      </Button>
      {error ? <span className="form-error">{error}</span> : null}
    </span>
  )
}

export function AccountPage() {
  const profile = useAuthStore((state) => state.profile)

  if (!profile) return <p className="boot">Checking login…</p>
  const isAdmin = profile.role === 'admin'
  const name = profile.full_name.trim() || 'Account'
  const userId =
    profile.user_code ||
    (profile.email.endsWith('@gmail.com') ? profile.email.replace('@gmail.com', '').toUpperCase() : profile.id.slice(0, 8))

  return (
    <div className="page">
      <h1>Account</h1>
      <section className="card account-card">
        <header className="account-head">
          <span className="account-avatar" aria-hidden="true">
            {initials(name)}
          </span>
          <div className="account-head-copy">
            <h2>{name}</h2>
            <p>{profile.email}</p>
          </div>
        </header>
        <dl className="account-rows">
          <div>
            <dt>Full name</dt>
            <dd>{name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd>{userId}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{isAdmin ? 'Administrator' : 'User'}</dd>
          </div>
          <div>
            <dt>Password</dt>
            <dd>{isAdmin ? <AdminPasswordReset email={profile.email} /> : 'Changed by your administrator'}</dd>
          </div>
        </dl>
      </section>
      <p className="account-note">
        {isAdmin
          ? 'Names, user IDs and roles are changed in Admin Panel > Manage > Users & admins.'
          : 'These details are managed by your administrator.'}
      </p>
    </div>
  )
}
