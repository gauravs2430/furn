import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { useAppStore } from '../../store/useAppStore.ts'

export function HomePage() {
  const profile = useAuthStore((state) => state.profile)
  const hydrated = useAppStore((state) => state.hydrated)
  const quotes = useAppStore((state) => state.quotes)

  if (!hydrated) return <p className="boot">Loading your orders…</p>

  const name = profile?.full_name.trim() || profile?.email || 'there'
  const latest = [...quotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
  const orderCount = quotes.length === 1 ? '1 quote' : `${quotes.length} quotes`

  return (
    <div className="page">
      <header className="home-welcome">
        <p className="home-kicker">{profile?.role === 'admin' ? 'Admin' : 'Staff'}</p>
        <h1>Welcome back, {name}</h1>
        <p className="lede">Internal order desk for SunnyPlast staff.</p>
      </header>
      <section className="home-panel" aria-labelledby="latest-orders">
        <div className="home-panel-head">
          <h2 id="latest-orders">Latest orders</h2>
          <p>{orderCount}</p>
        </div>
        {latest.length === 0 ? (
          <p className="home-empty">No orders yet. Start one from New quote.</p>
        ) : (
          <ul className="home-orders">
            {latest.map((quote) => {
              const customer = quote.customer.name.trim()
              return (
                <li key={quote.id}>
                  <Link to={`/quote/${quote.id}`}>
                    <span>
                      {quote.jobNo}
                      {customer ? ` · ${customer}` : ''}
                    </span>
                    <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
