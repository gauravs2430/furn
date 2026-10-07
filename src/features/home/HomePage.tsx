import { useAuthStore } from '../../auth/session.ts'

export function HomePage() {
  const profile = useAuthStore((state) => state.profile)
  const name = profile?.full_name.trim() || profile?.email || 'there'

  return (
    <div className="page">
      <header className="home-welcome">
        <p className="home-kicker">{profile?.role === 'admin' ? 'Admin' : 'Staff'}</p>
        <h1>Welcome back, {name}</h1>
        <p className="lede">Internal order desk for SunnyPlast staff.</p>
      </header>
      <div className="home-panel" aria-hidden="true" />
    </div>
  )
}
