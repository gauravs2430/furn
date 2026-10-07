import { useState } from 'react'
import { Navigate } from 'react-router-dom'
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
        <h1>Prices</h1>
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Prices</h1>
        </div>
      </div>
      <p className="lede">Company markup, and the VAT rate a new quote starts with. Product and part prices live in the catalogue.</p>
      <div className="card prices-card">
        <div className="form-grid">
          <NumberField label="Markup" suffix="%" value={config.markupPercent} min={0} onChange={(markupPercent) => patch({ markupPercent })} />
          <NumberField
            label="Default VAT"
            suffix="%"
            value={config.taxPercent}
            min={0}
            onChange={(taxPercent) => patch({ taxPercent })}
          />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="dialog-actions">
        <Button variant="secondary" disabled={busy} aria-busy={busy} onClick={() => void persist(pricingDefaults, 'Rates reset')}>
          {busy ? 'Saving…' : 'Reset rates'}
        </Button>
        <Button disabled={busy} onClick={() => void persist(config, 'Prices saved')}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        </div>
      </div>
    </div>
  )
}
