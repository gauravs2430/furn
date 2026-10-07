import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
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
          <h1>Catalogue</h1>
        </div>
        <Button onClick={openNew}>New product</Button>
      </div>
      <p className="lede">Products, parts, and the prices a new quote uses.</p>

      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Search products</span>
          <input
            value={query}
            placeholder="Search products"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {rows === null && !error ? <p className="boot">Loading catalogue…</p> : null}
      {rows && rows.length === 0 ? <p>{needle ? 'Nothing matches that search.' : 'No products yet.'}</p> : null}
      {rows && rows.length > 0 ? (
        <div className="table-scroll">
          <table className="people-table catalog-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Family</th>
                <th>Factor</th>
                <th>Active</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="catalog-row" onClick={() => setEditingId(row.id)}>
                  <td>
                    <button type="button" className="row-open" onClick={() => setEditingId(row.id)}>
                      {row.name}
                    </button>
                  </td>
                  <td>{row.family}</td>
                  <td>{row.factor}</td>
                  <td>{row.active ? 'Active' : 'Off'}</td>
                  <td>{formatDateTime(row.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {rows && total > 0 ? <Pager page={page} total={total} onPage={setPage} /> : null}

      <CatalogOptions />

      <Modal open={creating} title="New product" onOpenChange={setCreating}>
        <form className="catalog-editor" onSubmit={(event) => void onCreate(event)}>
          <div className="form-grid">
            <TextField label="Name" value={name} hint="The id is a slug of this name." onChange={setName} />
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
          <div className="dialog-actions">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save product'}
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
