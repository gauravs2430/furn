import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
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
}

interface AuthState {
  loading: boolean
  session: Session | null
  profile: StaffProfile | null
  notice: string | null
  clearNotice: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  loading: true,
  session: null,
  profile: null,
  notice: null,
  clearNotice: () => set({ notice: null }),
}))

const turnedOff = 'This account is turned off. Ask an admin.'

let ticket = 0
let reloadTicket = 0

function leaveSession() {
  clearLoadedQuotes()
  clearLoadedPricing()
  clearLoadedCatalogue()
}

async function syncSession(session: Session | null) {
  const current = ++ticket
  if (!supabase) return

  if (!session) {
    leaveSession()
    if (current !== ticket) return
    useAuthStore.setState({ loading: false, session: null, profile: null })
    return
  }

  const existing = useAuthStore.getState()
  if (existing.profile?.id === session.user.id && existing.profile.active) {
    if (current !== ticket) return
    useAuthStore.setState({ session, loading: false })
    loadQuotesForSession(session.user.id)
    loadPricingForSession(session.user.id)
    loadCatalogueForSession(session.user.id)
    return
  }

  if (existing.profile && existing.profile.id !== session.user.id) leaveSession()

  useAuthStore.setState({ loading: true, session })
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, active')
    .eq('id', session.user.id)
    .maybeSingle()

  if (current !== ticket) return

  if (error) {
    leaveSession()
    useAuthStore.setState({ loading: false, session: null, profile: null, notice: error.message })
    await supabase.auth.signOut()
    return
  }

  if (!data) {
    leaveSession()
    useAuthStore.setState({
      loading: false,
      session: null,
      profile: null,
      notice: 'No staff profile was found for this login.',
    })
    await supabase.auth.signOut()
    return
  }

  if (data.active !== true) {
    leaveSession()
    useAuthStore.setState({ loading: false, session: null, profile: null, notice: turnedOff })
    await supabase.auth.signOut()
    return
  }

  useAuthStore.setState({
    loading: false,
    session,
    notice: null,
    profile: {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role === 'admin' ? 'admin' : 'user',
      active: true,
    },
  })
  if (current !== ticket) return
  loadQuotesForSession(session.user.id)
  loadPricingForSession(session.user.id)
  loadCatalogueForSession(session.user.id)
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
  await supabase.auth.signOut()
}

/** Re-read the staff row after navigation so a turned-off account hits the login notice. */
export async function reloadProfile(): Promise<void> {
  if (!supabase) return
  const session = useAuthStore.getState().session
  if (!session) return

  const current = ++reloadTicket
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, active')
    .eq('id', session.user.id)
    .maybeSingle()

  if (current !== reloadTicket) return
  if (useAuthStore.getState().session?.user.id !== session.user.id) return
  if (error || !data) return

  if (data.active !== true) {
    ticket += 1
    leaveSession()
    useAuthStore.setState({ loading: false, session: null, profile: null, notice: turnedOff })
    await supabase.auth.signOut()
    return
  }

  const next = {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role === 'admin' ? 'admin' : 'user',
    active: true,
  } as const
  const currentProfile = useAuthStore.getState().profile
  if (
    currentProfile &&
    currentProfile.id === next.id &&
    currentProfile.email === next.email &&
    currentProfile.full_name === next.full_name &&
    currentProfile.role === next.role
  ) {
    return
  }

  useAuthStore.setState({ profile: { ...next } })
}
