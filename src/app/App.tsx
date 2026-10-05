import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { listenToAuth } from '../auth/session.ts'
import { supabase, supabaseEnvMessage } from '../lib/supabase.ts'
import { AppRouter } from './router.tsx'

export default function App() {
  useEffect(() => listenToAuth(), [])

  if (!supabase) {
    return (
      <div className="login-screen">
        <div className="card login-card">
          <h1>SunnyPlast</h1>
          <p>{supabaseEnvMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
