import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '../../components/ui/Button.tsx'
import { useAuthStore } from '../../auth/session.ts'
import { supabase } from '../../lib/supabase.ts'
import { useAppStore } from '../../store/useAppStore.ts'

export function AccountPage() {
  const profile = useAuthStore((state) => state.profile)
  const pushToast = useAppStore((state) => state.pushToast)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendPasswordReset() {
    if (!supabase || !profile || busy) return
    setError(null)
    setBusy(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    pushToast(`A password reset link was sent to ${profile.email}.`)
  }

  if (!profile) return <p className="boot">Checking login…</p>
  const userId =
    profile.user_code ||
    (profile.email.endsWith('@gmail.com') ? profile.email.replace('@gmail.com', '').toUpperCase() : profile.id.slice(0, 8))

  return (
    <div className="page">
      <h1>Account</h1>
      <div className="account-layout">
        <section className="card account-details">
          <h2>Account details</h2>
          <p className="field-hint">These details are managed by your administrator.</p>
          <dl className="account-facts">
            <div>
              <dt>Name</dt>
              <dd>{profile.full_name.trim() || 'Account'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd className="account-id">{userId}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{profile.role === 'admin' ? 'Administrator' : 'User'}</dd>
            </div>
          </dl>
        </section>
        <section className="card account-password">
          <h2>Reset password</h2>
          <p className="field-hint">We’ll email a secure password-reset link to your account email address.</p>
          {error ? <p className="form-error">{error}</p> : null}
          <Button icon={<Mail size={17} />} disabled={busy} aria-busy={busy} onClick={sendPasswordReset}>
            {busy ? 'Sending…' : 'Send password reset email'}
          </Button>
        </section>
      </div>
    </div>
  )
}
