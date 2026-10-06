import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { useAppStore } from '../../store/useAppStore.ts'

export function HomePage() {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const hydrated = useAppStore((state) => state.hydrated)
  const quotes = useAppStore((state) => state.quotes)
  const createQuote = useAppStore((state) => state.createQuote)
  const [starting, setStarting] = useState(false)
  const startingRef = useRef(false)

  function startQuote() {
    if (startingRef.current) return
    startingRef.current = true
    setStarting(true)
    void createQuote().then((quote) => {
      if (quote) {
        navigate(`/quote/${quote.id}`)
        return
      }
      startingRef.current = false
      setStarting(false)
    })
  }

  if (!hydrated) return <p className="boot">Loading your orders…</p>

  const name = profile?.full_name.trim() || profile?.email || 'SunnyPlast'
  const latest = [...quotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
  const orderCount = quotes.length === 1 ? '1 quote' : `${quotes.length} quotes`

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{name}</h1>
          <p className="lede">Internal order desk for SunnyPlast staff.</p>
        </div>
      </div>
      <div className="home-grid">
        <button type="button" className="home-box" disabled={starting} aria-busy={starting} onClick={startQuote}>
          <h2>{starting ? 'Starting…' : 'New quote'}</h2>
          <p>{starting ? 'Opening the new quote.' : 'Start a quote and open it.'}</p>
        </button>
        <Link to="/orders" className="home-box">
          <h2>My orders</h2>
          <p>{orderCount}</p>
        </Link>
        {profile?.role === 'admin' ? (
          <>
            <Link to="/admin/users" className="home-box">
              <h2>People</h2>
              <p>Staff who can log in.</p>
            </Link>
            <Link to="/admin/prices" className="home-box">
              <h2>Prices</h2>
              <p>Company price list.</p>
            </Link>
            <Link to="/admin/orders" className="home-box">
              <h2>All orders</h2>
              <p>Every staff order.</p>
            </Link>
          </>
        ) : null}
      </div>
      <section className="home-latest" aria-labelledby="latest-orders">
        <h2 id="latest-orders">Latest orders</h2>
        {latest.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <ul>
            {latest.map((quote) => {
              const customer = quote.customer.name.trim()
              return (
                <li key={quote.id}>
                  <Link to={`/quote/${quote.id}`}>
                    {quote.jobNo}
                    {customer ? ` · ${customer}` : ''}
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
