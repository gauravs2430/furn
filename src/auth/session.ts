import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { localToday, passwordExpiredNotice, userAccessLocked, userPasswordExpired } from './access.ts'
import { supabase } from '../lib/supabase.ts'
import {
  clearLoadedCatalogue,
  clearLoadedPricing,
  clearLoadedQuotes,
  loadCatalogueForSession,
  loadPricingForSession,
  loadQuotesForSession,
} from '../store/useAppStore.ts'

export interface StaffProfile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user'
  active: boolean
  locked: boolean
  accessExpiresOn: string | null
  passwordSetAt: string | null
}

interface AuthState {
  loading: boolean
  session: Session | null
  profile: StaffProfile | null
  accountLocked: boolean
  notice: string | null
  clearNotice: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  loading: true,
  session: null,
  profile: null,
  accountLocked: false,
  notice: null,
  clearNotice: () => set({ notice: null }),
}))

const turnedOff = 'This account is turned off. Ask an admin.'
const profileColumns = 'id, email, full_name, role, active, locked, access_expires_on, password_set_at'

let ticket = 0
let reloadTicket = 0

function leaveSession() {
  clearLoadedQuotes()
  clearLoadedPricing()
  clearLoadedCatalogue()
}

function profileFrom(value: unknown): StaffProfile | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string') return null
  return {
    id: row.id,
    email: typeof row.email === 'string' ? row.email : '',
    full_name: typeof row.full_name === 'string' ? row.full_name : '',
    role: row.role === 'admin' ? 'admin' : 'user',
    active: row.active === true,
    locked: row.locked === true,
    accessExpiresOn: typeof row.access_expires_on === 'string' ? row.access_expires_on.slice(0, 10) : null,
    passwordSetAt: typeof row.password_set_at === 'string' ? row.password_set_at : null,
  }
}

async function passwordMaxAgeDays(): Promise<{ days: number } | { error: string }> {
  if (!supabase) return { error: 'Not connected' }
  const { data, error } = await supabase.from('app_settings').select('password_max_age_days').eq('id', 1).maybeSingle()
  if (error) return { error: error.message }
  const raw = data?.password_max_age_days
  const days = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN
  if (!Number.isFinite(days) || days < 1) return { days: 90 }
  return { days: Math.floor(days) }
}

type Gate = { kind: 'off' } | { kind: 'locked' } | { kind: 'password' } | { kind: 'error'; message: string } | { kind: 'ok' }

async function gateProfile(profile: StaffProfile): Promise<Gate> {
  if (!profile.active) return { kind: 'off' }
  if (userAccessLocked(profile.role, profile.locked, profile.accessExpiresOn, localToday())) return { kind: 'locked' }
  if (profile.role === 'admin') return { kind: 'ok' }
  const age = await passwordMaxAgeDays()
  if ('error' in age) return { kind: 'error', message: age.error }
  if (userPasswordExpired(profile.role, profile.passwordSetAt, age.days, new Date())) return { kind: 'password' }
  return { kind: 'ok' }
}

async function settle(session: Session, profile: StaffProfile, stillCurrent: () => boolean, signOutOnError: boolean): Promise<boolean> {
  const gate = await gateProfile(profile)
  if (!stillCurrent()) return false
  if (gate.kind === 'off') {
    await rejectSession(turnedOff)
    return false
  }
  if (gate.kind === 'password') {
    await rejectSession(passwordExpiredNotice)
    return false
  }
  if (gate.kind === 'error') {
    if (signOutOnError) await rejectSession(gate.message)
    return false
  }
  if (!stillCurrent()) return false
  if (gate.kind === 'locked') {
    holdLocked(session, profile)
    return false
  }
  return true
}

function holdLocked(session: Session, profile: StaffProfile) {
  leaveSession()
  useAuthStore.setState({
    loading: false,
    session,
    profile: { ...profile, active: true },
    accountLocked: true,
    notice: null,
  })
}

function enterApp(session: Session, profile: StaffProfile) {
  useAuthStore.setState({
    loading: false,
    session,
    notice: null,
    accountLocked: false,
    profile: { ...profile, active: true },
  })
  loadQuotesForSession(session.user.id)
  loadPricingForSession(session.user.id)
  loadCatalogueForSession(session.user.id)
}

async function rejectSession(notice: string) {
  leaveSession()
  useAuthStore.setState({
    loading: false,
    session: null,
    profile: null,
    accountLocked: false,
    notice,
  })
  if (!supabase) return
  await supabase.auth.signOut()
}

async function syncSession(session: Session | null) {
  const current = ++ticket
  if (!supabase) return

  if (!session) {
    leaveSession()
    if (current !== ticket) return
    useAuthStore.setState({ loading: false, session: null, profile: null, accountLocked: false })
    return
  }

  const existing = useAuthStore.getState()
  const sameUser = existing.profile?.id === session.user.id
  if (existing.profile && !sameUser) leaveSession()
  if (!sameUser) useAuthStore.setState({ loading: true, session })
  else useAuthStore.setState({ session })

  const { data, error } = await supabase.from('profiles').select(profileColumns).eq('id', session.user.id).maybeSingle()

  if (current !== ticket) return

  if (error) {
    await rejectSession(error.message)
    return
  }

  const profile = profileFrom(data)
  if (!profile) {
    await rejectSession('No staff profile was found for this login.')
    return
  }

  const open = await settle(session, profile, () => current === ticket, true)
  if (!open || current !== ticket) return
  enterApp(session, profile)
}

export function listenToAuth(): () => void {
  if (!supabase) {
    useAuthStore.setState({ loading: false })
    return () => {}
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      void syncSession(session)
    }, 0)
  })

  return () => data.subscription.unsubscribe()
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  ticket += 1
  reloadTicket += 1
  leaveSession()
  const notice = useAuthStore.getState().notice
  useAuthStore.setState({ loading: false, session: null, profile: null, accountLocked: false, notice })
  await supabase.auth.signOut()
}

/** Re-read the staff row after navigation so a turned-off, locked, or expired account is caught. */
export async function reloadProfile(): Promise<void> {
  if (!supabase) return
  const session = useAuthStore.getState().session
  if (!session) return

  const current = ++reloadTicket
  const { data, error } = await supabase.from('profiles').select(profileColumns).eq('id', session.user.id).maybeSingle()

  if (current !== reloadTicket) return
  if (useAuthStore.getState().session?.user.id !== session.user.id) return
  if (error || !data) return

  const profile = profileFrom(data)
  if (!profile) return

  const wasLocked = useAuthStore.getState().accountLocked
  const stillHere = () => current === reloadTicket && useAuthStore.getState().session?.user.id === session.user.id
  const open = await settle(session, profile, stillHere, false)
  if (!stillHere() || !open) return

  const next = { ...profile, active: true } as const
  const currentProfile = useAuthStore.getState().profile
  const same =
    currentProfile &&
    currentProfile.id === next.id &&
    currentProfile.email === next.email &&
    currentProfile.full_name === next.full_name &&
    currentProfile.role === next.role &&
    currentProfile.locked === next.locked &&
    currentProfile.accessExpiresOn === next.accessExpiresOn &&
    currentProfile.passwordSetAt === next.passwordSetAt
  if (wasLocked) {
    enterApp(session, next)
    return
  }
  if (same) return
  useAuthStore.setState({ profile: { ...next }, accountLocked: false })
}
