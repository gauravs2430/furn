import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileEdit,
  FileCheck2,
  PackageCheck,
  Plus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Clock,
  ChevronRight,
  Layers,
  FilePlus,
  FolderOpen,
} from 'lucide-react'
import { useAuthStore } from '../../auth/session.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { StatusBadge } from '../../components/ui/Badge.tsx'
import { formatDate } from '../../utils/dates.ts'

export function HomePage() {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const name = profile?.full_name?.trim() || profile?.email || 'there'
  const isAdmin = profile?.role === 'admin'
  const hydrated = useAppStore((state) => state.hydrated)
  const quotes = useAppStore((state) => state.quotes)
  const createQuote = useAppStore((state) => state.createQuote)
  const pushToast = useAppStore((state) => state.pushToast)

  const [starting, setStarting] = useState(false)
  const startingRef = useRef(false)

  const drafts = quotes.filter((quote) => quote.status === 'draft').length
  const quoted = quotes.filter((quote) => quote.status === 'quoted').length
  const booked = quotes.filter((quote) => quote.status === 'booked').length

  const recentQuotes = [...quotes]
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 4)

  async function handleStartQuote() {
    if (startingRef.current) return
    startingRef.current = true
    setStarting(true)
    try {
      const quote = await createQuote()
      if (quote) navigate(`/quote/${quote.id}`)
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'Could not create quote.'
      pushToast(message, 'danger')
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }

  return (
    <div className="page home-page">
      <header className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-badge">
            <span className="home-hero-dot" />
            {isAdmin ? (
              <span className="home-hero-badge-text">
                <ShieldCheck size={13} className="home-hero-icon" /> Administrator Workspace
              </span>
            ) : (
              <span className="home-hero-badge-text">
                <Sparkles size={13} className="home-hero-icon" /> Joinery Studio &bull; Production Portal
              </span>
            )}
          </div>
          <h1 className="home-hero-title">Welcome back, {name}</h1>
          <p className="home-hero-lede">
            Manage your parametric window & door configurations, client quotations, and workshop production bookings.
          </p>
        </div>

        <div className="home-hero-actions">
          <button
            type="button"
            className="btn btn-primary home-cta-btn"
            disabled={starting}
            onClick={() => void handleStartQuote()}
          >
            {starting ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                <span>Creating quote…</span>
              </>
            ) : (
              <>
                <Plus size={18} strokeWidth={2.2} />
                <span>New quote</span>
              </>
            )}
          </button>
          <Link to="/orders" className="btn btn-secondary home-cta-secondary">
            <FolderOpen size={16} />
            <span>All orders</span>
          </Link>
        </div>
      </header>

      <section className="home-stats-section" aria-label="Quote overview statistics">
        <div className="home-desk">
          <Link className="home-stat home-stat-draft" to="/orders?status=draft">
            <div className="home-stat-head">
              <div className="home-stat-icon-wrap">
                <FileEdit size={20} className="home-stat-icon" />
              </div>
              <span className="home-stat-tag">In progress</span>
            </div>
            <div className="home-stat-body">
              <strong className="home-stat-number">{hydrated ? drafts : '—'}</strong>
              <span className="home-stat-label">Drafts</span>
            </div>
            <div className="home-stat-foot">
              <em>Open your unfinished jobs</em>
              <ArrowRight size={14} className="home-stat-arrow" />
            </div>
          </Link>

          <Link className="home-stat home-stat-quoted" to="/orders?status=quoted">
            <div className="home-stat-head">
              <div className="home-stat-icon-wrap">
                <FileCheck2 size={20} className="home-stat-icon" />
              </div>
              <span className="home-stat-tag">Ready to send</span>
            </div>
            <div className="home-stat-body">
              <strong className="home-stat-number">{hydrated ? quoted : '—'}</strong>
              <span className="home-stat-label">Quotations</span>
            </div>
            <div className="home-stat-foot">
              <em>Jobs marked ready to send</em>
              <ArrowRight size={14} className="home-stat-arrow" />
            </div>
          </Link>

          <Link className="home-stat home-stat-booked" to="/orders?status=booked">
            <div className="home-stat-head">
              <div className="home-stat-icon-wrap">
                <PackageCheck size={20} className="home-stat-icon" />
              </div>
              <span className="home-stat-tag">Confirmed</span>
            </div>
            <div className="home-stat-body">
              <strong className="home-stat-number">{hydrated ? booked : '—'}</strong>
              <span className="home-stat-label">Bookings</span>
            </div>
            <div className="home-stat-foot">
              <em>Orders confirmed for production</em>
              <ArrowRight size={14} className="home-stat-arrow" />
            </div>
          </Link>
        </div>
      </section>

      <section className="home-recent-section">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">Recent Activity</h2>
            <p className="home-section-desc">Quickly jump back into your recent quotes and drafts</p>
          </div>
          {quotes.length > 0 && (
            <Link to="/orders" className="home-section-link">
              <span>View all orders ({quotes.length})</span>
              <ChevronRight size={15} />
            </Link>
          )}
        </div>

        {quotes.length === 0 ? (
          <div className="home-empty-card">
            <div className="home-empty-icon">
              <FilePlus size={32} />
            </div>
            <h3 className="home-empty-title">No orders or quotes yet</h3>
            <p className="home-empty-desc">
              Get started by creating your first quote with our parametric joinery configurator.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={starting}
              onClick={() => void handleStartQuote()}
            >
              <Plus size={16} />
              <span>Create first quote</span>
            </button>
          </div>
        ) : (
          <div className="home-recent-grid">
            {recentQuotes.map((quote) => {
              const itemCount = quote.items?.length || 0
              const customerName = quote.customer?.name?.trim() || 'Unnamed Customer'
              return (
                <Link key={quote.id} to={`/quote/${quote.id}`} className="home-quote-card">
                  <div className="home-quote-card-header">
                    <span className="home-quote-job">Job #{quote.jobNo}</span>
                    <StatusBadge status={quote.status} />
                  </div>
                  <div className="home-quote-card-body">
                    <h3 className="home-quote-customer">{customerName}</h3>
                    {quote.reference ? <p className="home-quote-ref">Ref: {quote.reference}</p> : null}
                  </div>
                  <div className="home-quote-card-footer">
                    <span className="home-quote-meta">
                      <Layers size={13} />
                      <span>{itemCount} {itemCount === 1 ? 'opening' : 'openings'}</span>
                    </span>
                    <span className="home-quote-date">
                      <Clock size={13} />
                      <span>{formatDate(quote.updatedAt)}</span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
