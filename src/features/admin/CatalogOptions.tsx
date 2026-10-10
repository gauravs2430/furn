import { useState, type FormEvent } from 'react'
import type { CatalogColour, CatalogGlazing, CatalogMaterial } from '../../domain/catalogue.ts'
import {
  addColour,
  addGlazing,
  addMaterial,
  removeColour,
  removeGlazing,
  removeMaterial,
  saveColour,
  saveGlazing,
  saveMaterial,
  searchColours,
  searchGlazing,
  searchMaterials,
} from '../../repositories/CatalogAdminRepository.ts'
import { refreshCatalogue } from '../../store/useAppStore.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog, Modal } from '../../components/ui/Dialog.tsx'
import { NumberField, SelectField, TextField } from '../../components/ui/Field.tsx'
import { ActiveCheck, Pager, messageFrom, useCatalogList, usePagedQuery } from './catalogUi.tsx'

async function commit(work: () => Promise<void>, pushToast: (message: string, tone?: 'info' | 'success' | 'danger') => void, toast: string) {
  await work()
  try {
    await refreshCatalogue()
    pushToast(toast)
  } catch (error) {
    pushToast(messageFrom(error, 'Saved. Reload the page to see it on quotes.'), 'info')
  }
}

function SearchBox({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="search">
      <span className="sr-only">{label}</span>
      <input value={value} placeholder={label} autoComplete="off" onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function CatalogOptions() {
  return (
    <>
      <MaterialsSection />
      <ColoursSection />
      <GlazingSection />
    </>
  )
}

function MaterialsSection() {
  const pushToast = useAppStore((state) => state.pushToast)
  const [query, setQuery] = useState('')
  const { needle, page, setPage } = usePagedQuery(query)
  const [reload, setReload] = useState(0)
  const { result, error, loading } = useCatalogList(searchMaterials, needle, page, reload)
  const [name, setName] = useState('')
  const [factor, setFactor] = useState(1)
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<CatalogMaterial | null>(null)

  async function onAdd(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setFormError(null)
    try {
      await commit(() => addMaterial({ name, factor, active }), pushToast, 'Material added')
      setName('')
      setFactor(1)
      setActive(true)
      setAdding(false)
      setReload((current) => current + 1)
    } catch (addError) {
      setFormError(messageFrom(addError, 'Could not add that material.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="catalog-block" aria-labelledby="materials-heading">
      <div className="catalog-block-head">
        <div>
          <h2 id="materials-heading" className="subhead">Materials</h2>
          <p className="field-hint">The factor applies to parts that use the material factor. Turning one off hides it on a new quote.</p>
        </div>
        <Button onClick={() => setAdding(true)}>Add material</Button>
      </div>
      {result?.searchable ? <SearchBox label="Search materials" value={query} onChange={setQuery} /> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {loading && !result ? <p className="boot">Loading materials…</p> : null}
      {result && result.rows.length === 0 ? <p>{needle ? 'Nothing matches that search.' : 'No materials yet.'}</p> : null}
      {result && result.rows.length > 0 ? (
        <div className="table-scroll">
          <table className="catalog-parts">
            <thead>
              <tr>
                <th>Name</th>
                <th>Factor</th>
                <th>Active</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((material) => (
                <MaterialRow
                  key={`${material.id}:${material.name}:${material.factor}:${material.active}`}
                  material={material}
                  onSaved={() => setReload((current) => current + 1)}
                  onRemove={() => setPendingRemove(material)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {result?.searchable ? <Pager page={page} total={result.total} onPage={setPage} /> : null}
      <Modal
        open={adding}
        title="Add material"
        onOpenChange={(open) => {
          setAdding(open)
          if (!open) setFormError(null)
        }}
      >
        <form className="catalog-editor" onSubmit={(event) => void onAdd(event)}>
          <div className="form-grid">
            <TextField label="Name" value={name} onChange={setName} />
            <NumberField label="Factor" value={factor} min={0} step={0.1} onChange={setFactor} />
            <ActiveCheck checked={active} onChange={setActive} />
          </div>
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="dialog-actions">
            <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add material'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove this material?"
        description={pendingRemove ? `${pendingRemove.name} will be taken off the catalogue.` : ''}
        confirmLabel="Remove material"
        tone="danger"
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
        onConfirm={() => {
          const material = pendingRemove
          setPendingRemove(null)
          if (!material) return
          void commit(() => removeMaterial(material.id), pushToast, 'Material removed')
            .then(() => setReload((current) => current + 1))
            .catch((removeError: unknown) => pushToast(messageFrom(removeError, 'Could not remove that material.'), 'danger'))
        }}
      />
    </section>
  )
}

function MaterialRow({ material, onSaved, onRemove }: { material: CatalogMaterial; onSaved: () => void; onRemove: () => void }) {
  const pushToast = useAppStore((state) => state.pushToast)
  const [name, setName] = useState(material.name)
  const [factor, setFactor] = useState(String(material.factor))
  const [active, setActive] = useState(material.active)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const nextFactor = Number(factor)
    if (factor.trim() === '' || !Number.isFinite(nextFactor)) {
      setError('Enter a factor.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await commit(() => saveMaterial({ ...material, name, factor: nextFactor, active }), pushToast, 'Material saved')
      onSaved()
    } catch (saveError) {
      setError(messageFrom(saveError, 'Could not save that material.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr>
      <td>
        <input className="input" aria-label={`Name for ${material.name}`} value={name} onChange={(event) => setName(event.target.value)} />
      </td>
      <td>
        <input className="input" inputMode="decimal" aria-label={`Factor for ${material.name}`} value={factor} onChange={(event) => setFactor(event.target.value)} />
      </td>
      <td>
        <ActiveCheck checked={active} onChange={setActive} />
      </td>
      <td className="catalog-actions">
        <Button size="sm" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={onRemove}>Remove</Button>
        {error ? <span className="form-error">{error}</span> : null}
      </td>
    </tr>
  )
}

function ColoursSection() {
  const pushToast = useAppStore((state) => state.pushToast)
  const [query, setQuery] = useState('')
  const { needle, page, setPage } = usePagedQuery(query)
  const [reload, setReload] = useState(0)
  const { result, error, loading } = useCatalogList(searchColours, needle, page, reload)
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#888888')
  const [finish, setFinish] = useState<'solid' | 'oak'>('solid')
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<CatalogColour | null>(null)

  async function onAdd(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setFormError(null)
    try {
      await commit(() => addColour({ name, hex, finish, active }), pushToast, 'Colour added')
      setName('')
      setHex('#888888')
      setFinish('solid')
      setActive(true)
      setAdding(false)
      setReload((current) => current + 1)
    } catch (addError) {
      setFormError(messageFrom(addError, 'Could not add that colour.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="catalog-block" aria-labelledby="colours-heading">
      <div className="catalog-block-head">
        <div>
          <h2 id="colours-heading" className="subhead">Colours</h2>
          <p className="field-hint">Turning a colour off hides it on a new quote.</p>
        </div>
        <Button onClick={() => setAdding(true)}>Add colour</Button>
      </div>
      {result?.searchable ? <SearchBox label="Search colours" value={query} onChange={setQuery} /> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {loading && !result ? <p className="boot">Loading colours…</p> : null}
      {result && result.rows.length === 0 ? <p>{needle ? 'Nothing matches that search.' : 'No colours yet.'}</p> : null}
      {result && result.rows.length > 0 ? (
        <div className="table-scroll">
          <table className="catalog-parts">
            <thead>
              <tr>
                <th>Name</th>
                <th>Hex</th>
                <th>Finish</th>
                <th>Active</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((colour) => (
                <ColourRow
                  key={`${colour.id}:${colour.name}:${colour.hex}:${colour.finish}:${colour.active}`}
                  colour={colour}
                  onSaved={() => setReload((current) => current + 1)}
                  onRemove={() => setPendingRemove(colour)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {result?.searchable ? <Pager page={page} total={result.total} onPage={setPage} /> : null}
      <Modal
        open={adding}
        title="Add colour"
        onOpenChange={(open) => {
          setAdding(open)
          if (!open) setFormError(null)
        }}
      >
        <form className="catalog-editor" onSubmit={(event) => void onAdd(event)}>
          <div className="form-grid">
            <TextField label="Name" value={name} onChange={setName} />
            <TextField label="Hex" value={hex} onChange={setHex} placeholder="#1C1C1C" />
            <SelectField label="Finish" value={finish} onChange={(value) => setFinish(value === 'oak' ? 'oak' : 'solid')}>
              <option value="solid">solid</option>
              <option value="oak">oak</option>
            </SelectField>
            <ActiveCheck checked={active} onChange={setActive} />
          </div>
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="dialog-actions">
            <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add colour'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove this colour?"
        description={pendingRemove ? `${pendingRemove.name} will be taken off the catalogue.` : ''}
        confirmLabel="Remove colour"
        tone="danger"
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
        onConfirm={() => {
          const colour = pendingRemove
          setPendingRemove(null)
          if (!colour) return
          void commit(() => removeColour(colour.id), pushToast, 'Colour removed')
            .then(() => setReload((current) => current + 1))
            .catch((removeError: unknown) => pushToast(messageFrom(removeError, 'Could not remove that colour.'), 'danger'))
        }}
      />
    </section>
  )
}

function ColourRow({ colour, onSaved, onRemove }: { colour: CatalogColour; onSaved: () => void; onRemove: () => void }) {
  const pushToast = useAppStore((state) => state.pushToast)
  const [name, setName] = useState(colour.name)
  const [hex, setHex] = useState(colour.hex)
  const [finish, setFinish] = useState(colour.finish)
  const [active, setActive] = useState(colour.active)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await commit(() => saveColour({ ...colour, name, hex, finish, active }), pushToast, 'Colour saved')
      onSaved()
    } catch (saveError) {
      setError(messageFrom(saveError, 'Could not save that colour.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr>
      <td>
        <input className="input" aria-label={`Name for ${colour.name}`} value={name} onChange={(event) => setName(event.target.value)} />
      </td>
      <td>
        <input className="input" aria-label={`Hex for ${colour.name}`} value={hex} onChange={(event) => setHex(event.target.value)} />
      </td>
      <td>
        <select className="input" aria-label={`Finish for ${colour.name}`} value={finish} onChange={(event) => setFinish(event.target.value === 'oak' ? 'oak' : 'solid')}>
          <option value="solid">solid</option>
          <option value="oak">oak</option>
        </select>
      </td>
      <td>
        <ActiveCheck checked={active} onChange={setActive} />
      </td>
      <td className="catalog-actions">
        <Button size="sm" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={onRemove}>Remove</Button>
        {error ? <span className="form-error">{error}</span> : null}
      </td>
    </tr>
  )
}

function GlazingSection() {
  const pushToast = useAppStore((state) => state.pushToast)
  const [query, setQuery] = useState('')
  const { needle, page, setPage } = usePagedQuery(query)
  const [reload, setReload] = useState(0)
  const { result, error, loading } = useCatalogList(searchGlazing, needle, page, reload)
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [description, setDescription] = useState('')
  const [glassType, setGlassType] = useState('')
  const [gasFill, setGasFill] = useState('')
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<CatalogGlazing | null>(null)

  async function onAdd(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setFormError(null)
    try {
      await commit(
        () => addGlazing({ name, addonPerM2: price, description, glassType, gasFill, active }),
        pushToast,
        'Glazing added',
      )
      setName('')
      setPrice(0)
      setDescription('')
      setGlassType('')
      setGasFill('')
      setActive(true)
      setAdding(false)
      setReload((current) => current + 1)
    } catch (addError) {
      setFormError(messageFrom(addError, 'Could not add that glazing.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="catalog-block" aria-labelledby="glazing-heading">
      <div className="catalog-block-head">
        <div>
          <h2 id="glazing-heading" className="subhead">Glazing</h2>
          <p className="field-hint">The price is the glass add-on per square metre. Turning one off hides it on a new quote.</p>
        </div>
        <Button onClick={() => setAdding(true)}>Add glazing</Button>
      </div>
      {result?.searchable ? <SearchBox label="Search glazing" value={query} onChange={setQuery} /> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {loading && !result ? <p className="boot">Loading glazing…</p> : null}
      {result && result.rows.length === 0 ? <p>{needle ? 'Nothing matches that search.' : 'No glazing yet.'}</p> : null}
      {result && result.rows.length > 0 ? (
        <div className="table-scroll">
          <table className="catalog-parts">
            <thead>
              <tr>
                <th>Name</th>
                <th>£/m²</th>
                <th>Glass</th>
                <th>Gas</th>
                <th>Active</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((option) => (
                <GlazingRow
                  key={`${option.id}:${option.name}:${option.addonPerM2}:${option.active}`}
                  option={option}
                  onSaved={() => setReload((current) => current + 1)}
                  onRemove={() => setPendingRemove(option)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {result?.searchable ? <Pager page={page} total={result.total} onPage={setPage} /> : null}
      <Modal
        open={adding}
        title="Add glazing"
        onOpenChange={(open) => {
          setAdding(open)
          if (!open) setFormError(null)
        }}
      >
        <form className="catalog-editor" onSubmit={(event) => void onAdd(event)}>
          <div className="form-grid">
            <TextField label="Name" value={name} onChange={setName} />
            <NumberField label="Price" suffix="£/m²" value={price} min={0} step={1} onChange={setPrice} />
            <TextField label="Description" value={description} onChange={setDescription} />
            <TextField label="Glass type" value={glassType} onChange={setGlassType} />
            <TextField label="Gas fill" value={gasFill} onChange={setGasFill} />
            <ActiveCheck checked={active} onChange={setActive} />
          </div>
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="dialog-actions">
            <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add glazing'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove this glazing?"
        description={pendingRemove ? `${pendingRemove.name} will be taken off the catalogue.` : ''}
        confirmLabel="Remove glazing"
        tone="danger"
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
        onConfirm={() => {
          const option = pendingRemove
          setPendingRemove(null)
          if (!option) return
          void commit(() => removeGlazing(option.id), pushToast, 'Glazing removed')
            .then(() => setReload((current) => current + 1))
            .catch((removeError: unknown) => pushToast(messageFrom(removeError, 'Could not remove that glazing.'), 'danger'))
        }}
      />
    </section>
  )
}

function GlazingRow({ option, onSaved, onRemove }: { option: CatalogGlazing; onSaved: () => void; onRemove: () => void }) {
  const pushToast = useAppStore((state) => state.pushToast)
  const [name, setName] = useState(option.name)
  const [price, setPrice] = useState(String(option.addonPerM2))
  const [glassType, setGlassType] = useState(option.glassType)
  const [gasFill, setGasFill] = useState(option.gasFill)
  const [active, setActive] = useState(option.active)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const addonPerM2 = Number(price)
    if (price.trim() === '' || !Number.isFinite(addonPerM2)) {
      setError('Enter a price.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await commit(
        () => saveGlazing({ ...option, name, addonPerM2, glassType, gasFill, active }),
        pushToast,
        'Glazing saved',
      )
      onSaved()
    } catch (saveError) {
      setError(messageFrom(saveError, 'Could not save that glazing.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr>
      <td>
        <input className="input" aria-label={`Name for ${option.name}`} value={name} onChange={(event) => setName(event.target.value)} />
      </td>
      <td>
        <input className="input" inputMode="decimal" aria-label={`Price for ${option.name}`} value={price} onChange={(event) => setPrice(event.target.value)} />
      </td>
      <td>
        <input className="input" aria-label={`Glass type for ${option.name}`} value={glassType} onChange={(event) => setGlassType(event.target.value)} />
      </td>
      <td>
        <input className="input" aria-label={`Gas fill for ${option.name}`} value={gasFill} onChange={(event) => setGasFill(event.target.value)} />
      </td>
      <td>
        <ActiveCheck checked={active} onChange={setActive} />
      </td>
      <td className="catalog-actions">
        <Button size="sm" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={onRemove}>Remove</Button>
        {error ? <span className="form-error">{error}</span> : null}
      </td>
    </tr>
  )
}
