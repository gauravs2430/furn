import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Package, Plus, Search, X, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../../auth/session.ts'
import { currentCatalogue, fallbackCatalogue } from '../../domain/catalogue.ts'
import { presetsFor } from '../../data/technicalPresets.ts'
import { isDrawingFamily, PRODUCT_FAMILIES, type ProductFamily } from '../../domain/models.ts'
import { createProduct, searchProducts, type ProductListRow } from '../../repositories/CatalogAdminRepository.ts'
import { refreshCatalogue } from '../../store/useAppStore.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { Button } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Dialog.tsx'
import { NumberField, SelectField, TextField } from '../../components/ui/Field.tsx'
import { formatDateTime } from '../../utils/dates.ts'
import { CatalogOptions } from './CatalogOptions.tsx'
import { ProductEditor } from './ProductEditor.tsx'
import { ActiveCheck, Pager, messageFrom, usePagedQuery } from './catalogUi.tsx'

function familyDefaults(family: ProductFamily) {
  if (!isDrawingFamily(family)) {
    return { summary: '', factor: 1, width: 1000, height: 1000, preset: '' }
  }
  const seed =
    currentCatalogue().products.find((product) => product.id === family) ??
    fallbackCatalogue().products.find((product) => product.id === family)
  return {
    summary: seed?.summary ?? '',
    factor: seed?.factor ?? 1,
    width: seed?.defaultWidth ?? 1000,
    height: seed?.defaultHeight ?? 1000,
    preset: seed?.defaultPreset || presetsFor(family)[0]?.id || '',
  }
}

export function CatalogPage() {
  const profile = useAuthStore((state) => state.profile)
  const pushToast = useAppStore((state) => state.pushToast)
  const [query, setQuery] = useState('')
  const { needle, page, setPage } = usePagedQuery(query)
  const [reload, setReload] = useState(0)
  const [rows, setRows] = useState<ProductListRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [family, setFamily] = useState<ProductFamily>('window')
  const initial = familyDefaults('window')
  const [name, setName] = useState('')
  const [summary, setSummary] = useState(initial.summary)
  const [factor, setFactor] = useState(initial.factor)
  const [width, setWidth] = useState(initial.width)
  const [height, setHeight] = useState(initial.height)
  const [preset, setPreset] = useState(initial.preset)
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (profile?.role !== 'admin') return
    let cancelled = false
    void searchProducts(needle, page)
      .then((result) => {
        if (cancelled) return
        setRows(result.rows)
        setTotal(result.total)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(messageFrom(loadError, 'Could not load the catalogue.'))
      })
    return () => {
      cancelled = true
    }
  }, [profile?.role, needle, page, reload])

  if (!profile) return <p className="boot">Checking login…</p>
  if (profile.role !== 'admin') return <Navigate to="/" replace />

  function applyFamily(value: string) {
    if (!(PRODUCT_FAMILIES as readonly string[]).includes(value)) return
    const next = value as ProductFamily
    const defaults = familyDefaults(next)
    setFamily(next)
    setSummary(defaults.summary)
    setFactor(defaults.factor)
    setWidth(defaults.width)
    setHeight(defaults.height)
    setPreset(defaults.preset)
  }

  function openNew() {
    applyFamily('window')
    setName('')
    setActive(true)
    setFormError(null)
    setCreating(true)
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setFormError(null)
    try {
      const id = await createProduct({
        name,
        family,
        summary,
        factor,
        defaultWidth: width,
        defaultHeight: height,
        defaultPreset: preset,
        active,
      })
      setCreating(false)
      setEditingId(id)
      setReload((current) => current + 1)
      try {
        await refreshCatalogue()
        pushToast('Product added')
      } catch (refreshError) {
        pushToast(messageFrom(refreshError, 'Saved. Reload the page to see it on quotes.'), 'info')
      }
    } catch (createError) {
      setFormError(messageFrom(createError, 'Could not add that product.'))
    } finally {
      setBusy(false)
    }
  }

  const presets = isDrawingFamily(family) ? presetsFor(family) : []

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="eyebrow">
            <Package size={13} style={{ color: 'var(--accent)' }} />
            <span>Master Inventory</span>
          </div>
          <h1>System Catalogue</h1>
          <p className="lede">Products, extrusion assemblies, hardware parts, and technical dimensions used in quote generation.</p>
        </div>
        <Button onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={15} />
          <span>New product</span>
        </Button>
      </div>

      <div className="toolbar" style={{ marginBottom: '18px' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          flex: '1 1 360px',
          maxWidth: '480px',
        }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={query}
            placeholder="Search catalog products by name or family…"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            style={{
              width: '100%',
              paddingLeft: '34px',
              paddingRight: query ? '34px' : '12px',
            }}
            className="input"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {rows === null && !error ? <p className="boot">Loading catalogue…</p> : null}
      {rows && rows.length === 0 ? <p style={{ color: 'var(--muted)', padding: '20px 0' }}>{needle ? 'Nothing matches that search.' : 'No products yet.'}</p> : null}
      {rows && rows.length > 0 ? (
        <div className="table-scroll">
          <table className="people-table catalog-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Family</th>
                <th>Factor</th>
                <th>Status</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="catalog-row" onClick={() => setEditingId(row.id)}>
                  <td>
                    <button type="button" className="row-open" onClick={() => setEditingId(row.id)} style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {row.name}
                    </button>
                  </td>
                  <td>
                    <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--ink-soft)', border: '1px solid var(--line)', textTransform: 'capitalize', fontSize: '11px' }}>
                      {row.family}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--ink-soft)' }}>
                      {row.factor}
                    </span>
                  </td>
                  <td>
                    {row.active ? (
                      <span className="badge badge-ok" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={11} />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="badge" style={{ fontSize: '11px', background: 'var(--bg-subtle)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {formatDateTime(row.updatedAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {rows && total > 0 ? <Pager page={page} total={total} onPage={setPage} /> : null}

      <div style={{ marginTop: '36px' }}>
        <CatalogOptions />
      </div>

      <Modal open={creating} title="New Catalogue Product" onOpenChange={setCreating}>
        <form className="catalog-editor" onSubmit={(event) => void onCreate(event)}>
          <div className="form-grid">
            <TextField label="Name" value={name} hint="The ID is automatically slugified from this name." onChange={setName} />
            <SelectField label="Family" value={family} onChange={applyFamily}>
              {PRODUCT_FAMILIES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </SelectField>
            <TextField label="Summary" value={summary} onChange={setSummary} />
            <NumberField label="Factor" value={factor} min={0} step={0.1} onChange={setFactor} />
            <NumberField label="Default width" suffix="mm" value={width} min={1} step={10} onChange={setWidth} />
            <NumberField label="Default height" suffix="mm" value={height} min={1} step={10} onChange={setHeight} />
            {family !== 'accessory' ? (
              <SelectField label="Default preset" value={preset} onChange={setPreset}>
                {preset && !presets.some((entry) => entry.id === preset) ? <option value={preset}>{preset}</option> : null}
                {presets.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </SelectField>
            ) : null}
            <ActiveCheck checked={active} onChange={setActive} />
          </div>
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="dialog-actions" style={{ marginTop: '16px' }}>
            <Button type="submit" disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} />
              <span>{busy ? 'Saving…' : 'Save product'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {editingId ? (
        <ProductEditor key={editingId} productId={editingId} onClose={() => setEditingId(null)} onSaved={() => setReload((current) => current + 1)} />
      ) : null}
    </div>
  )
}
