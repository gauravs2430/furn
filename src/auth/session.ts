import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '../lib/supabase.ts'

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

async function syncSession(session: Session | null) {
  const current = ++ticket
  if (!supabase) return

  if (!session) {
    useAuthStore.setState({ loading: false, session: null, profile: null })
    return
  }

  useAuthStore.setState({ loading: true, session })
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, active')
    .eq('id', session.user.id)
    .maybeSingle()

  if (current !== ticket) return

  if (error) {
    useAuthStore.setState({ loading: false, session: null, profile: null, notice: error.message })
    await supabase.auth.signOut()
    return
  }

  if (!data) {
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
