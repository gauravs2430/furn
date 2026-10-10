import { Link } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { useAppStore } from '../../store/useAppStore.ts'

export function HomePage() {
  const profile = useAuthStore((state) => state.profile)
  const name = profile?.full_name.trim() || profile?.email || 'there'
  const hydrated = useAppStore((state) => state.hydrated)
  const quotes = useAppStore((state) => state.quotes)
  const drafts = quotes.filter((quote) => quote.status === 'draft').length
  const quoted = quotes.filter((quote) => quote.status === 'quoted').length
  const booked = quotes.filter((quote) => quote.status === 'booked').length

  return (
    <div className="page">
      <header className="home-welcome">
        <p className="home-kicker">{profile?.role === 'admin' ? 'Admin' : 'Staff'}</p>
        <h1>Welcome back, {name}</h1>
        <p className="lede">Your own drafts, quotes, and booked jobs. New work starts from the sidebar.</p>
      </header>
      <div className="home-desk">
        <Link className="home-stat" to="/orders?status=draft">
          <span>Drafts</span>
          <strong>{hydrated ? drafts : '—'}</strong>
          <em>Open your unfinished jobs</em>
        </Link>
        <Link className="home-stat" to="/orders?status=quoted">
          <span>Quotation</span>
          <strong>{hydrated ? quoted : '—'}</strong>
          <em>Jobs marked ready to send</em>
        </Link>
        <Link className="home-stat" to="/orders?status=booked">
          <span>Bookings</span>
          <strong>{hydrated ? booked : '—'}</strong>
          <em>Orders already booked</em>
        </Link>
      </div>
    </div>
  )
}
