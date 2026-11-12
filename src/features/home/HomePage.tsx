import { useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/session.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { findPreset, presetLayout } from '../../data/technicalPresets.ts'
import { Button } from '../../components/ui/Button.tsx'
import { OpeningDrawing } from '../drawing/OpeningDrawing.tsx'
import { TodayActivity } from './TodayActivity.tsx'

export function HomePage() {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const name = profile?.full_name.trim() || profile?.email || 'there'
  const hydrated = useAppStore((state) => state.hydrated)
  const quotes = useAppStore((state) => state.quotes)
  const createQuote = useAppStore((state) => state.createQuote)
  const pushToast = useAppStore((state) => state.pushToast)
  const drafts = quotes.filter((quote) => quote.status === 'draft').length
  const quoted = quotes.filter((quote) => quote.status === 'quoted').length
  const booked = quotes.filter((quote) => quote.status === 'booked').length
  const [starting, setStarting] = useState(false)
  const startingRef = useRef(false)

  async function startQuote() {
    if (startingRef.current) return
    startingRef.current = true
    setStarting(true)
    try {
      const quote = await createQuote()
      if (quote) navigate(`/quote/${quote.id}`)
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'Could not start a quote.'
      pushToast(message, 'danger')
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }

  return (
    <div className="page">
      <header className="home-welcome">
        <p className="home-kicker">{profile?.role === 'admin' ? 'Admin' : 'Staff'}</p>
        <h1>Welcome back, {name}</h1>
        <p className="lede">Your own drafts, quotes, and booked jobs. Start a new quote or pick up where you left off.</p>
        <div className="home-welcome-actions">
          <Button icon={<Plus size={18} />} disabled={starting} aria-busy={starting} onClick={startQuote}>
            {starting ? 'Starting…' : 'New quote'}
          </Button>
        </div>
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

      <TodayActivity />

      <DesignShowcase starting={starting} onStart={startQuote} />
    </div>
  )
}

/** Our own drawing on a tablet, with a shortcut to start designing. */
function DesignShowcase({ starting, onStart }: { starting: boolean; onStart: () => void }) {
  const preset = findPreset('casement-top-hung-stack-casement')
  const layout = useMemo(() => (preset ? presetLayout(preset) : null), [preset])
  return (
    <section className="home-showcase" aria-labelledby="showcase-heading">
      <div className="home-showcase-art" aria-hidden="true">
        <div className="device-tablet">
          <div className="device-screen">
            {preset && layout ? (
              <OpeningDrawing
                widthMm={preset.sample.width}
                heightMm={preset.sample.height}
                layout={layout}
                frameColor="#f4f1ea"
                showDimensions
                showCill={false}
                productType="window"
              />
            ) : null}
          </div>
        </div>
        <div className="device-phone">
          <div className="device-screen">
            <OpeningDrawing
              widthMm={700}
              heightMm={1600}
              layout={{
                split: 'cols',
                sections: [
                  {
                    id: 'phone',
                    sizeMm: 700,
                    cells: [
                      { id: 'phone-top', sizeMm: 450, kind: 'top-hung' },
                      { id: 'phone-bottom', sizeMm: 1150, kind: 'casement-left' },
                    ],
                  },
                ],
              }}
              frameColor="#3a4146"
              showDimensions={false}
              showCill={false}
              productType="window"
            />
          </div>
        </div>
      </div>
      <div className="home-showcase-copy">
        <h2 id="showcase-heading">Design it with your customer</h2>
        <p>
          Pick a layout, set the sizes and colours, and watch the drawing and price update as you go. When it’s right,
          print the quotation and the factory work order in one click.
        </p>
        <Button icon={<Plus size={18} />} disabled={starting} aria-busy={starting} onClick={onStart}>
          {starting ? 'Starting…' : 'Start a new quote'}
        </Button>
        <p className="home-showcase-note">Over 30 window layouts, with top lights, side-hung and top-hung sashes.</p>
      </div>
    </section>
  )
}
