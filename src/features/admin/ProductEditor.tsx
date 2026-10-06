import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ADMIN_QUANTITY_RULES, QUANTITY_RULE_LABELS, type AdminQuantityRule } from '../../domain/catalogAdmin.ts'
import type { CatalogPart, ProductPartLink, QuantityRule } from '../../domain/catalogue.ts'
import { isDrawingFamily, type ProductFamily } from '../../domain/models.ts'
import { presetsFor } from '../../data/technicalPresets.ts'
import {
  attachPart,
  createPartOnProduct,
  loadProductBundle,
  savePartPricing,
  setPartIncluded,
  updateProduct,
  searchPartsToAdd,
  type ProductBundle,
  type ProductPatch,
} from '../../repositories/CatalogAdminRepository.ts'
import { refreshCatalogue } from '../../store/useAppStore.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog, Modal } from '../../components/ui/Dialog.tsx'
import { NumberField, SelectField, TextField } from '../../components/ui/Field.tsx'
import { ActiveCheck, Pager, messageFrom, usePagedQuery } from './catalogUi.tsx'

function patchFrom(bundle: ProductBundle): ProductPatch {
  return {
    name: bundle.product.name,
    summary: bundle.product.summary,
    factor: bundle.product.factor,
    defaultWidth: bundle.product.defaultWidth,
    defaultHeight: bundle.product.defaultHeight,
    defaultPreset: bundle.product.defaultPreset,
    active: bundle.product.active,
  }
}

function shortRule(rule: QuantityRule): string {
  if (rule === 'builtin') return 'Built-in'
  return QUANTITY_RULE_LABELS[rule].split(' — ')[0] ?? rule
}

export function ProductEditor({
  productId,
  onClose,
  onSaved,
}: {
  productId: string
  onClose: () => void
  onSaved: () => void
}) {
  const pushToast = useAppStore((state) => state.pushToast)
  const [bundle, setBundle] = useState<ProductBundle | null>(null)
  const [draft, setDraft] = useState<ProductPatch | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const keepDraft = useRef(false)
  const seenId = useRef(productId)

  useEffect(() => {
    let cancelled = false
    const switched = seenId.current !== productId
    seenId.current = productId
    const replaceForm = switched || !keepDraft.current
    keepDraft.current = false
    setLoading(true)
    if (switched) {
      setBundle(null)
      setDraft(null)
    }
    void loadProductBundle(productId)
      .then((next) => {
        if (cancelled) return
        setBundle(next)
        setDraft((current) => (replaceForm || !current ? patchFrom(next) : current))
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(messageFrom(loadError, 'Could not open that product.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [productId, version])

  async function afterWrite(toast: string, resetForm: boolean) {
    keepDraft.current = !resetForm
    onSaved()
    setVersion((current) => current + 1)
    try {
      await refreshCatalogue()
      pushToast(toast)
    } catch (refreshError) {
      pushToast(messageFrom(refreshError, 'Saved. Reload the page to see it on quotes.'), 'info')
    }
  }

  async function onSaveProduct(event: FormEvent) {
    event.preventDefault()
    if (!draft || saving) return
    setSaving(true)
    setError(null)
    try {
      await updateProduct(productId, draft)
      await afterWrite('Product saved', true)
    } catch (saveError) {
      setError(messageFrom(saveError, 'Could not save that product.'))
    } finally {
      setSaving(false)
    }
  }

  const product = bundle?.product
  const included =
    bundle?.links
      .filter((link) => link.included)
      .flatMap((link) => {
        const part = bundle.parts.find((entry) => entry.id === link.partId)
        return part ? [{ link, part }] : []
      })
      .sort((left, right) => left.part.sortOrder - right.part.sortOrder || left.part.name.localeCompare(right.part.name)) ?? []
  const showQtyColumn = product?.family === 'accessory' || included.some((row) => row.part.quantityRule === 'fixed')
  const removePart = included.find((row) => row.part.id === removeId)?.part ?? null
  const drawing = product && isDrawingFamily(product.family) ? product.family : null
  const presets = drawing ? presetsFor(drawing) : []

  return (
    <>
      <Modal open className="dialog-catalog" title={product?.name ?? 'Product'} onOpenChange={(open) => { if (!open) onClose() }}>
        {loading && !draft ? <p className="boot">Loading product…</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {draft && product ? (
          <div className="catalog-editor">
            <form className="catalog-editor" onSubmit={(event) => void onSaveProduct(event)}>
              <p className="field-hint">Family {product.family}. Id {product.id}.</p>
              <div className="form-grid">
                <TextField label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
                <TextField label="Summary" value={draft.summary} onChange={(summary) => setDraft({ ...draft, summary })} />
                <NumberField label="Factor" value={draft.factor} min={0} step={0.1} onChange={(factor) => setDraft({ ...draft, factor })} />
                <NumberField
                  label="Default width"
                  suffix="mm"
                  value={draft.defaultWidth}
                  min={1}
                  step={10}
                  onChange={(defaultWidth) => setDraft({ ...draft, defaultWidth })}
                />
                <NumberField
                  label="Default height"
                  suffix="mm"
                  value={draft.defaultHeight}
                  min={1}
                  step={10}
                  onChange={(defaultHeight) => setDraft({ ...draft, defaultHeight })}
                />
                {drawing ? (
                  <SelectField
                    label="Default preset"
                    value={draft.defaultPreset}
                    onChange={(defaultPreset) => setDraft({ ...draft, defaultPreset })}
                  >
                    {draft.defaultPreset && !presets.some((preset) => preset.id === draft.defaultPreset) ? (
                      <option value={draft.defaultPreset}>{draft.defaultPreset}</option>
                    ) : null}
                    {presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </SelectField>
                ) : null}
                <ActiveCheck checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
              </div>
              <div className="dialog-actions">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save product'}
                </Button>
              </div>
            </form>

            <h3 className="subhead">Parts on this product</h3>
            <p className="field-hint">An empty override uses the company price. The company price is shared. Saving it leaves stored quotes untouched.</p>
            {included.length === 0 ? <p>No parts on this product yet.</p> : (
              <div className="table-scroll">
                <table className="catalog-parts">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Unit</th>
                      <th>Rule</th>
                      <th>Company price</th>
                      <th>Override</th>
                      {showQtyColumn ? <th>Qty</th> : null}
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {included.map((row) => (
                      <PartRow
                        key={`${row.part.id}:${row.part.price}:${row.link.priceOverride}:${row.link.fixedQty}`}
                        part={row.part}
                        link={row.link}
                        family={product.family}
                        showQtyColumn={showQtyColumn}
                        onSaved={() => void afterWrite('Part price saved', false)}
                        onRemove={() => setRemoveId(row.part.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <AddPart
              productId={product.id}
              family={product.family}
              excludeIds={included.map((row) => row.part.id)}
              onAdded={() => void afterWrite('Part added', false)}
            />
          </div>
        ) : null}
      </Modal>
      <ConfirmDialog
        open={removePart !== null}
        title="Remove part"
        description={removePart ? `Remove ${removePart.name} from this product? It stays in the catalogue for other products.` : ''}
        confirmLabel="Remove"
        tone="danger"
        onOpenChange={(open) => {
          if (!open) setRemoveId(null)
        }}
        onConfirm={() => {
          if (!removeId) return
          const partId = removeId
          setRemoveId(null)
          void setPartIncluded(productId, partId, false)
            .then(() => afterWrite('Part removed', false))
            .catch((removeError: unknown) => setError(messageFrom(removeError, 'Could not remove that part.')))
        }}
      />
    </>
  )
}

function PartRow({
  part,
  link,
  family,
  showQtyColumn,
  onSaved,
  onRemove,
}: {
  part: CatalogPart
  link: ProductPartLink
  family: ProductFamily
  showQtyColumn: boolean
  onSaved: () => void
  onRemove: () => void
}) {
  const showQty = family === 'accessory' || part.quantityRule === 'fixed'
  const [price, setPrice] = useState(String(part.price))
  const [override, setOverride] = useState(link.priceOverride === null ? '' : String(link.priceOverride))
  const [qty, setQty] = useState(String(link.fixedQty ?? 1))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const company = Number(price)
    if (price.trim() === '' || !Number.isFinite(company)) {
      setError('Enter a company price.')
      return
    }
    let priceOverride: number | null = null
    if (override.trim() !== '') {
      priceOverride = Number(override)
      if (!Number.isFinite(priceOverride)) {
        setError('Enter an override price, or leave it empty.')
        return
      }
    }
    let fixedQty: number | null = null
    if (showQty) {
      fixedQty = Number(qty)
      if (qty.trim() === '' || !Number.isFinite(fixedQty)) {
        setError('Enter a quantity.')
        return
      }
    }
    setBusy(true)
    setError(null)
    try {
      await savePartPricing({ productId: link.productId, partId: part.id, price: company, priceOverride, fixedQty })
      onSaved()
    } catch (saveError) {
      setError(messageFrom(saveError, 'Could not save that price.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr>
      <td>{part.name}</td>
      <td>{part.unit}</td>
      <td title={QUANTITY_RULE_LABELS[part.quantityRule]}>{shortRule(part.quantityRule)}</td>
      <td>
        <input
          className="input"
          inputMode="decimal"
          aria-label={`Company price for ${part.name}`}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </td>
      <td>
        <input
          className="input"
          inputMode="decimal"
          aria-label={`Override price for ${part.name}`}
          placeholder="Company price"
          value={override}
          onChange={(event) => setOverride(event.target.value)}
        />
      </td>
      {showQtyColumn ? (
        <td>
          {showQty ? (
            <input
              className="input"
              inputMode="decimal"
              aria-label={`Quantity for ${part.name}`}
              value={qty}
              onChange={(event) => setQty(event.target.value)}
            />
          ) : (
            '—'
          )}
        </td>
      ) : null}
      <td className="catalog-actions">
        <Button size="sm" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="danger" size="sm" disabled={busy} onClick={onRemove}>
          Remove
        </Button>
        {error ? <span className="form-error">{error}</span> : null}
      </td>
    </tr>
  )
}

function AddPart({
  productId,
  family,
  excludeIds,
  onAdded,
}: {
  productId: string
  family: ProductFamily
  excludeIds: string[]
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { needle, page, setPage } = usePagedQuery(query)
  const [rows, setRows] = useState<CatalogPart[]>([])
  const [total, setTotal] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('each')
  const [price, setPrice] = useState(0)
  const [rule, setRule] = useState<AdminQuantityRule>('one')
  const [material, setMaterial] = useState(false)
  const [productFactor, setProductFactor] = useState(false)
  const [glazing, setGlazing] = useState(false)
  const [fixedQty, setFixedQty] = useState(1)
  const [creating, setCreating] = useState(false)
  const excluded = excludeIds.join('\n')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const ids = excluded ? excluded.split('\n') : []
    void searchPartsToAdd(needle, ids, page)
      .then((result) => {
        if (cancelled) return
        setRows(result.rows)
        setTotal(result.total)
        setReady(true)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(messageFrom(loadError, 'Could not load parts.'))
      })
    return () => {
      cancelled = true
    }
  }, [open, needle, page, excluded])

  async function attach(part: CatalogPart) {
    setBusyId(part.id)
    setError(null)
    try {
      const qty = family === 'accessory' || part.quantityRule === 'fixed' ? 1 : null
      await attachPart(productId, part.id, qty)
      onAdded()
    } catch (attachError) {
      setError(messageFrom(attachError, 'Could not attach that part.'))
    } finally {
      setBusyId(null)
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      await createPartOnProduct(productId, family, {
        name,
        unit,
        price,
        quantityRule: rule,
        appliesMaterialFactor: material,
        appliesProductFactor: productFactor,
        appliesGlazingAddon: glazing,
        fixedQty: family === 'accessory' || rule === 'fixed' ? fixedQty : null,
      })
      setName('')
      setPrice(0)
      setRule('one')
      setMaterial(false)
      setProductFactor(false)
      setGlazing(false)
      setFixedQty(1)
      onAdded()
    } catch (createError) {
      setError(messageFrom(createError, 'Could not add that part.'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="catalog-add">
      <Button variant="secondary" onClick={() => setOpen((current) => !current)}>
        {open ? 'Hide add part' : 'Add part'}
      </Button>
      {open ? (
        <div className="catalog-add-panel">
          <label className="search">
            <span className="sr-only">Search parts</span>
            <input value={query} placeholder="Search parts" autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
          </label>
          {!ready ? <p className="boot">Loading parts…</p> : rows.length === 0 ? <p>{needle ? 'Nothing matches that search.' : 'No other parts to attach.'}</p> : (
            <ul className="catalog-attach">
              {rows.map((part) => (
                <li key={part.id}>
                  <span>
                    {part.name} · {part.unit} · £{part.price}
                  </span>
                  <Button size="sm" variant="secondary" disabled={busyId === part.id} onClick={() => void attach(part)}>
                    {busyId === part.id ? 'Adding…' : 'Attach'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {total > 0 ? <Pager page={page} total={total} onPage={setPage} /> : null}
          <form className="catalog-editor" onSubmit={(event) => void create(event)}>
            <h3 className="subhead">New part</h3>
            <div className="form-grid">
              <TextField label="Name" value={name} onChange={setName} />
              <TextField label="Unit" value={unit} onChange={setUnit} placeholder="each, m, m²" />
              <NumberField label="Company price" value={price} min={0} step={0.1} onChange={setPrice} />
              <SelectField label="Quantity rule" value={rule} onChange={(value) => { if (value !== 'builtin') setRule(value as AdminQuantityRule) }}>
                {ADMIN_QUANTITY_RULES.map((entry) => (
                  <option key={entry} value={entry}>
                    {QUANTITY_RULE_LABELS[entry]}
                  </option>
                ))}
              </SelectField>
              {family === 'accessory' || rule === 'fixed' ? (
                <NumberField label="Quantity" value={fixedQty} min={0} step={1} onChange={setFixedQty} />
              ) : null}
            </div>
            <div className="check-line">
              <ActiveCheck checked={material} label="Material factor" onChange={setMaterial} />
              <ActiveCheck checked={productFactor} label="Product factor" onChange={setProductFactor} />
              <ActiveCheck checked={glazing} label="Glazing add-on" onChange={setGlazing} />
            </div>
            <div className="dialog-actions">
              <Button type="submit" disabled={creating}>
                {creating ? 'Adding…' : 'Create part'}
              </Button>
            </div>
          </form>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
