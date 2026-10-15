import { useState, type FormEvent } from 'react'
import { User, Lock, Mail, ShieldCheck, Fingerprint, KeyRound, Check } from 'lucide-react'
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

  const initial = (profile.full_name?.trim() || profile.email || 'U')[0].toUpperCase()
  const isAdmin = profile.role === 'admin'

  return (
    <div className="page account-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Account & Profile</h1>
          <p className="lede">Manage your personal credentials, workspace profile, and account security.</p>
        </div>
      </div>

      <div className="account-layout">
        <div className="account-forms">
          <form className="card account-form-card" onSubmit={onSaveName}>
            <div className="card-head">
              <div className="card-head-title">
                <User size={18} className="card-icon" />
                <h2>Personal Details</h2>
              </div>
              <p>Your name as it appears to customers on printed quotations and work orders.</p>
            </div>
            <TextField
              label="Full Name"
              value={name}
              autoComplete="name"
              placeholder="e.g. John Smith"
              onChange={setName}
            />
            {nameError ? <p className="form-error">{nameError}</p> : null}
            <div className="form-submit-row">
              <Button type="submit" disabled={nameBusy} icon={<Check size={15} />}>
                {nameBusy ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>

          <form className="card account-form-card" onSubmit={onSubmit}>
            <div className="card-head">
              <div className="card-head-title">
                <Lock size={18} className="card-icon" />
                <h2>Security & Password</h2>
              </div>
              <p>Update the password you use to authenticate into SunnyPlast.</p>
            </div>
            <TextField
              label="New password"
              type="password"
              value={password}
              placeholder="••••••••••••"
              hint="Must be at least 8 characters long."
              autoComplete="new-password"
              onChange={setPassword}
            />
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-submit-row">
              <Button type="submit" disabled={busy} icon={<KeyRound size={15} />}>
                {busy ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </form>
        </div>

        <aside className="card account-profile-card">
          <div className="account-profile-header">
            <div className="account-avatar">
              <span>{initial}</span>
            </div>
            <div className="account-profile-meta">
              <h2>{profile.full_name?.trim() || 'Active User'}</h2>
              <div className="account-role-pill">
                <ShieldCheck size={13} />
                <span>{isAdmin ? 'Administrator' : 'Standard Staff'}</span>
              </div>
            </div>
          </div>

          <div className="account-info-list">
            <div className="account-info-item">
              <div className="account-info-label">
                <Mail size={14} />
                <span>Email address</span>
              </div>
              <div className="account-info-value">{profile.email}</div>
            </div>

            <div className="account-info-item">
              <div className="account-info-label">
                <Fingerprint size={14} />
                <span>User ID</span>
              </div>
              <div className="account-info-value code-value">{profile.id}</div>
            </div>

            <div className="account-info-item">
              <div className="account-info-label">
                <Lock size={14} />
                <span>Access Status</span>
              </div>
              <div className="account-info-status">
                <span className="account-status-dot" />
                <span>Active & Verified</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
