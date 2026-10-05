import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.ts'

export function HomePage() {
  const navigate = useNavigate()
  const hydrated = useAppStore((state) => state.hydrated)
  const createQuote = useAppStore((state) => state.createQuote)
  const [starting, setStarting] = useState(false)

  if (!hydrated) return <p className="boot">Opening the workspace…</p>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Welcome</h1>
          <p className="lede">Internal order desk for SunnyPlast staff.</p>
        </div>
      </div>
      <div className="home-grid">
        <button
          type="button"
          className="home-box"
          disabled={starting}
          onClick={() => {
            if (starting) return
            setStarting(true)
            void createQuote().then((quote) => {
              if (quote) navigate(`/quote/${quote.id}`)
              else setStarting(false)
            })
          }}
        >
          <h2>New quote</h2>
          <p>Start a quote and open it.</p>
        </button>
        <Link to="/orders" className="home-box">
          <h2>Orders</h2>
          <p>Open saved quotes.</p>
        </Link>
        <Link to="/account" className="home-box">
          <h2>Account</h2>
          <p>Staff account.</p>
        </Link>
      </div>
    </div>
  )
}
