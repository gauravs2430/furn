import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Percent, RotateCcw, Save, ShieldCheck, TrendingUp, Receipt, Sliders, Info, Sparkles } from 'lucide-react'
import { pricingDefaults } from '../../data/pricingDefaults.ts'
import type { PricingConfig } from '../../domain/models.ts'
import { missingPriceListMessage, savePricingConfig } from '../../repositories/PricingConfigRepository.ts'
import { useAuthStore } from '../../auth/session.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { Button } from '../../components/ui/Button.tsx'
import { NumberField } from '../../components/ui/Field.tsx'

function messageFrom(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message.trim()
    if (message) return message
  }
  return 'Could not save prices.'
}

export function PricesPage() {
  const profile = useAuthStore((state) => state.profile)
  const pricingConfig = useAppStore((state) => state.pricingConfig)
  const pricingStatus = useAppStore((state) => state.pricingStatus)
  const pricingNotice = useAppStore((state) => state.pricingNotice)
  const setPricingConfig = useAppStore((state) => state.setPricingConfig)
  const pushToast = useAppStore((state) => state.pushToast)
  const [draft, setDraft] = useState<PricingConfig | null>(() => {
    const state = useAppStore.getState()
    return state.pricingStatus === 'ready' ? structuredClone(state.pricingConfig) : null
  })
  const [synced, setSynced] = useState<PricingConfig | null>(() => {
    const state = useAppStore.getState()
    return state.pricingStatus === 'ready' ? state.pricingConfig : null
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (pricingStatus === 'ready' && pricingConfig !== synced) {
    setSynced(pricingConfig)
    setDraft(structuredClone(pricingConfig))
  }

  if (!profile) return <p className="boot">Checking login…</p>
  if (profile.role !== 'admin') return <Navigate to="/" replace />
  if (pricingStatus === 'loading' || (pricingStatus === 'ready' && !draft)) return <p className="boot">Loading prices…</p>
  if (pricingStatus !== 'ready' || !draft) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Pricing Engine</p>
            <h1>Prices & Margins</h1>
          </div>
        </div>
        <p className="form-error">{pricingNotice ?? missingPriceListMessage}</p>
      </div>
    )
  }

  const config = draft

  function patch(partial: Partial<PricingConfig>) {
    setDraft((current) => (current ? { ...current, ...partial } : current))
  }

  async function persist(next: PricingConfig, toast: string) {
    setBusy(true)
    setError(null)
    try {
      const saved = structuredClone(next)
      await savePricingConfig(saved)
      setPricingConfig(saved)
      pushToast(toast)
    } catch (saveError) {
      setError(messageFrom(saveError))
    } finally {
      setBusy(false)
    }
  }

  // Calculate a sample live breakdown for intuition
  const sampleCost = 1000
  const sampleMarkup = sampleCost * (1 + (config.markupPercent || 0) / 100)
  const sampleTax = sampleMarkup * ((config.taxPercent || 0) / 100)
  const sampleTotal = sampleMarkup + sampleTax

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="eyebrow">
            <Sliders size={13} style={{ color: 'var(--accent)' }} />
            <span>Pricing Engine</span>
          </div>
          <h1>Pricing & Margins</h1>
          <p className="lede">
            Global baseline rates applied to newly generated quotes, parts markup formulas, and maximum sales discount limits.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {/* Main Settings Card */}
        <div className="card prices-card" style={{ maxWidth: 'none', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--line)' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(14, 165, 233, 0.1)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>Default Markup & Tax Rates</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Applied across all standard window & door assemblies</p>
            </div>
          </div>

          <div className="form-grid">
            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Percent size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Parts Markup</span>
              </div>
              <NumberField
                label="Cost Markup"
                suffix="%"
                value={config.markupPercent}
                min={0}
                onChange={(markupPercent) => patch({ markupPercent })}
              />
              <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                Added on top of raw bill-of-materials and aluminium extrusion costs.
              </span>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Receipt size={15} style={{ color: 'var(--ok)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Default VAT Rate</span>
              </div>
              <NumberField
                label="Standard Tax"
                suffix="%"
                value={config.taxPercent}
                min={0}
                onChange={(taxPercent) => patch({ taxPercent })}
              />
              <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                Standard Value Added Tax initialized on all newly configured quotations.
              </span>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={15} style={{ color: 'var(--warn)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Maximum Discount Cap</span>
              </div>
              <NumberField
                label="Discount ceiling"
                suffix="%"
                value={config.discountMaxPercent ?? 100}
                min={0}
                max={100}
                onChange={(discountMaxPercent) => patch({ discountMaxPercent })}
              />
              <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                Highest allowable discount percentage a sales representative can assign to a quote without manager override.
              </span>
            </div>
          </div>

          {error ? <p className="form-error" style={{ marginTop: '14px' }}>{error}</p> : null}

          <div className="dialog-actions" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <Button
              variant="secondary"
              disabled={busy}
              aria-busy={busy}
              onClick={() => void persist(pricingDefaults, 'Rates reset to system defaults')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={14} />
              <span>{busy ? 'Saving…' : 'Reset defaults'}</span>
            </Button>
            <Button
              disabled={busy}
              onClick={() => void persist(config, 'Pricing configuration saved')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={14} />
              <span>{busy ? 'Saving…' : 'Save changes'}</span>
            </Button>
          </div>
        </div>

        {/* Live Calculation Simulation Card */}
        <div className="card" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Info size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>Live Calculation Preview</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Here is how a benchmark job with £1,000 base materials cost will be quoted under the currently drafted rates:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ink-soft)' }}>
              <span>Base Materials Cost:</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>£1,000.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ink-soft)' }}>
              <span>Markup (+{config.markupPercent}%):</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--accent)' }}>
                +£{(sampleMarkup - sampleCost).toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ink-soft)' }}>
              <span>Subtotal before Tax:</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>£{sampleMarkup.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ink-soft)' }}>
              <span>VAT (+{config.taxPercent}%):</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--ok)' }}>
                +£{sampleTax.toFixed(2)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--ink)',
              paddingTop: '10px',
              marginTop: '4px',
              borderTop: '1px dashed var(--line-strong)',
            }}>
              <span>Quoted Grand Total:</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--accent)' }}>£{sampleTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(14, 165, 233, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(14, 165, 233, 0.15)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Sparkles size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-soft)', lineHeight: 1.45 }}>
              Active quotes already locked or booked will retain their original snapshot pricing and are not retroactively modified.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
