import { useRef, useState } from 'react'
import { FlipHorizontal2 } from 'lucide-react'
import type { LayoutCell, LayoutSection, OpeningLayout, PanelKind, QuoteItem } from '../../domain/models.ts'
import { isDrawingFamily, itemProductId } from '../../domain/models.ts'
import { findProduct } from '../../domain/catalogue.ts'
import { panelKindLabels, panelKindsFor } from '../../data/productCatalog.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { matchPreset, presetsFor, tileFor } from '../../data/technicalPresets.ts'
import { applyProductType, describeConfiguration, equalPanelWidths, layoutForPreset, productGroup, withLayout } from '../../domain/factories.ts'
import {
  canMirror,
  crossTotal,
  layoutOf,
  mainTotal,
  mirrorLayout,
  resizeLayout,
  sizeTotal,
} from '../../domain/layout.ts'
import { LIMITS } from '../../data/pricingDefaults.ts'
import { createId } from '../../utils/ids.ts'
import { cx } from '../../utils/cx.ts'
import { NumberField, TextField } from '../../components/ui/Field.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { LayoutThumb } from '../drawing/LayoutThumb.tsx'

interface OpeningFormProps {
  item: QuoteItem
  onChange: (item: QuoteItem) => void
}

/** Most cells one column (or row) can be divided into. */
const MAX_CELLS = 3

function sectionIds(layout: OpeningLayout): string {
  return layout.sections.map((section) => `${section.id}:${section.cells.map((cell) => cell.id).join(',')}`).join('|')
}

function SectionHead({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <summary className="config-section-head">
      <span className="config-section-title">{title}</span>
      <span className="config-section-value">{value}</span>
      <span className="chevron" aria-hidden="true" />
    </summary>
  )
}

export function OpeningForm({ item, onChange }: OpeningFormProps) {
  const catalogue = useAppStore((state) => state.catalogue)
  const [query, setQuery] = useState('')
  const drawing = isDrawingFamily(item.productType) ? item.productType : null
  const layout = layoutOf(item)
  const group = productGroup(item, catalogue)
  const presets = drawing ? presetsFor(drawing, group) : []
  const activeTile = tileFor(matchPreset(layout, drawing ?? 'window', group))
  const product = findProduct(itemProductId(item), catalogue)
  const selectedId = itemProductId(item)
  const needle = query.trim().toLowerCase()
  const results = catalogue.products
    .filter((entry) => entry.active)
    .filter((entry) => (needle ? entry.name.toLowerCase().includes(needle) : true))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))

  const cols = layout.split === 'cols'
  const main = mainTotal(layout, item.widthMm, item.heightMm)
  const cross = crossTotal(layout, item.widthMm, item.heightMm)
  const mainSum = sizeTotal(layout.sections)
  const mainDelta = main - mainSum
  const stacked = layout.sections.filter((section) => section.cells.length > 1)
  const kinds = drawing ? panelKindsFor(drawing, group) : []
  const canStack = drawing === 'window'
  const [keepLevel, setKeepLevel] = useState(true)
  const showLevel = cols && stacked.length > 1

  // Overall width and height changes scale from the proportions the layout had
  // before the person started typing, so in-between values never distort it.
  const base = useRef({ key: sectionIds(layout), layout })

  function commit(next: OpeningLayout, target: QuoteItem = item) {
    base.current = { key: sectionIds(next), layout: next }
    onChange(withLayout(target, next))
  }

  function resize(patch: Partial<Pick<QuoteItem, 'widthMm' | 'heightMm'>>) {
    const next = { ...item, ...patch }
    if (!drawing) {
      onChange(next)
      return
    }
    // A different layout (another opening loaded, or edited elsewhere) becomes the new base.
    if (base.current.key !== sectionIds(layout)) base.current = { key: sectionIds(layout), layout }
    const resized = resizeLayout(base.current.layout, next.widthMm, next.heightMm)
    onChange(withLayout(next, resized))
  }

  function selectPreset(presetId: string) {
    if (activeTile?.id === presetId) return
    commit(layoutForPreset(presetId, item.widthMm, item.heightMm))
  }

  function updateSection(sectionId: string, patch: (section: LayoutSection) => LayoutSection) {
    commit({ ...layout, sections: layout.sections.map((section) => (section.id === sectionId ? patch(section) : section)) })
  }

  /** Sets one cell's size; the neighbouring cell takes up the difference so the column still fits. */
  function resizeCell(section: LayoutSection, cellIndex: number, sizeMm: number) {
    const sizes = section.cells.map((cell) => cell.sizeMm)
    const absorb = cellIndex === sizes.length - 1 ? cellIndex - 1 : sizes.length - 1
    const rounded = Math.max(1, Math.round(sizeMm))
    const spare = cross - sizes.reduce((sum, size, index) => (index === cellIndex || index === absorb ? sum : sum + size), 0)
    sizes[cellIndex] = Math.min(rounded, Math.max(1, spare - 1))
    if (absorb >= 0) sizes[absorb] = Math.max(1, spare - sizes[cellIndex])
    const level = keepLevel && showLevel
    commit({
      ...layout,
      sections: layout.sections.map((entry) => {
        const same = entry.id === section.id || (level && entry.cells.length === sizes.length)
        if (!same) return entry
        return { ...entry, cells: entry.cells.map((cell, index) => ({ ...cell, sizeMm: sizes[index] ?? cell.sizeMm })) }
      }),
    })
  }

  function setCellKind(sectionId: string, cellId: string, kind: PanelKind) {
    updateSection(sectionId, (section) => ({
      ...section,
      cells: section.cells.map((cell) => (cell.id === cellId ? { ...cell, kind } : cell)),
    }))
  }

  function addCell(section: LayoutSection) {
    // A new top light (or left-hand light in a row) takes about a third, at most 450 mm.
    const size = Math.max(150, Math.min(450, Math.round(cross / 3)))
    const fresh: LayoutCell = { id: createId(), sizeMm: size, kind: 'fixed' }
    const rest = section.cells.map((cell, index) =>
      index === 0 ? { ...cell, sizeMm: Math.max(1, cell.sizeMm - size) } : cell,
    )
    updateSection(section.id, (entry) => ({ ...entry, cells: [fresh, ...rest] }))
  }

  function removeCell(section: LayoutSection, cellId: string) {
    const index = section.cells.findIndex((cell) => cell.id === cellId)
    const removed = section.cells[index]
    if (!removed || section.cells.length < 2) return
    const cells = section.cells.filter((cell) => cell.id !== cellId)
    const into = Math.min(index, cells.length - 1)
    updateSection(section.id, (entry) => ({
      ...entry,
      cells: cells.map((cell, cellIndex) => (cellIndex === into ? { ...cell, sizeMm: cell.sizeMm + removed.sizeMm } : cell)),
    }))
  }

  function addSection() {
    const last = layout.sections[layout.sections.length - 1]
    const kind: PanelKind = drawing === 'bifold' ? 'bifold' : drawing === 'patio' ? 'sliding' : 'fixed'
    const section: LayoutSection = {
      id: createId(),
      sizeMm: last?.sizeMm ?? 600,
      cells: [{ id: createId(), sizeMm: cross, kind }],
    }
    commit({ ...layout, sections: [...layout.sections, section] })
  }

  function removeSection(sectionId: string) {
    commit({ ...layout, sections: layout.sections.filter((section) => section.id !== sectionId) })
  }

  function equalise() {
    const sizes = equalPanelWidths(main, layout.sections.length)
    commit({ ...layout, sections: layout.sections.map((section, index) => ({ ...section, sizeMm: sizes[index] ?? section.sizeMm })) })
  }

  const label = cols
    ? { section: 'Column', sizes: 'Column widths', cellSize: 'height', addCell: 'Add top light', addSection: 'Add column', main: 'width' }
    : { section: 'Row', sizes: 'Row heights', cellSize: 'width', addCell: 'Split row', addSection: 'Add row', main: 'height' }

  const cellName = (cellIndex: number, count: number) => {
    if (!cols) return `Part ${cellIndex + 1}`
    if (count === 2) return cellIndex === 0 ? 'Top light' : 'Bottom'
    return cellIndex === 0 ? 'Top light' : cellIndex === count - 1 ? 'Bottom' : 'Middle'
  }

  const sizeSummary = `${layout.sections.length} ${layout.sections.length === 1 ? label.section.toLowerCase() : `${label.section.toLowerCase()}s`}${
    mainDelta === 0 ? '' : ' · check sizes'
  }`

  return (
    <section className="card" aria-labelledby="opening-heading">
      <div className="card-head">
        <h2 id="opening-heading">Opening</h2>
        <p>
          {product.name}
          {drawing ? ` · ${describeConfiguration(item)}` : ' · Accessory'}
        </p>
      </div>

      <details className="config-section">
        <SectionHead title="Product" value={product.name} />
        <div className="product-picker config-section-body">
          <label className="search">
            <span className="sr-only">Search products</span>
            <input value={query} placeholder="Search products" autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
          </label>
          {results.length === 0 ? (
            <p className="product-summary">Nothing matches that search.</p>
          ) : (
            <ul className="product-results" role="listbox" aria-label="Products">
              {results.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedId === entry.id}
                    className={cx('product-choice', selectedId === entry.id && 'is-active')}
                    onClick={() => {
                      if (selectedId !== entry.id) onChange(applyProductType(item, entry.id))
                    }}
                  >
                    <span className="product-name">{entry.name}</span>
                    <span className="product-summary">{entry.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      {drawing ? (
        <details className="config-section">
          <SectionHead title="Layout" value={describeConfiguration(item)} />
          <div className="config-section-body">
            {canMirror(layout) ? (
              <div className="layout-tools">
                <p className="field-hint">Same blocks with the opening sides swapped.</p>
                <Button size="sm" variant="secondary" icon={<FlipHorizontal2 size={15} />} onClick={() => commit(mirrorLayout(layout))}>
                  Flip left / right
                </Button>
              </div>
            ) : null}
            <div className="preset-grid">
              {presets.map((preset) => (
                <LayoutThumb
                  key={preset.id}
                  preset={preset}
                  pressed={activeTile?.id === preset.id}
                  onSelect={() => selectPreset(preset.id)}
                />
              ))}
              <div className={cx('preset preset-static', !activeTile && 'is-active')} aria-current={!activeTile ? 'true' : undefined}>
                <span className="preset-art preset-custom">Custom</span>
                <span className="preset-label">Custom</span>
              </div>
            </div>
          </div>
        </details>
      ) : null}

      <details className="config-section" open>
        <SectionHead
          title="Size & quantity"
          value={`${drawing ? `${item.widthMm} × ${item.heightMm} mm · ` : ''}Qty ${item.quantity}`}
        />
        <div className="form-grid measure-grid config-section-body">
          {drawing ? (
            <NumberField
              label="Overall width"
              suffix="mm"
              value={item.widthMm}
              min={LIMITS.widthMin}
              max={LIMITS.widthMax}
              step={10}
              stepper
              onChange={(widthMm) => resize({ widthMm })}
            />
          ) : null}
          {drawing ? (
            <NumberField
              label="Overall height"
              suffix="mm"
              value={item.heightMm}
              min={LIMITS.heightMin}
              max={LIMITS.heightMax}
              step={10}
              stepper
              onChange={(heightMm) => resize({ heightMm })}
            />
          ) : null}
          <NumberField
            label="Quantity"
            value={item.quantity}
            min={1}
            max={LIMITS.quantityMax}
            step={1}
            stepper
            onChange={(quantity) => onChange({ ...item, quantity: Math.max(1, Math.round(quantity)) })}
          />
          <TextField label="Room / location" value={item.location} placeholder="Living room" onChange={(location) => onChange({ ...item, location })} />
        </div>
      </details>

      {drawing ? (
        <details className="config-section">
          <SectionHead title="Sizes & panels" value={sizeSummary} />
          <div className="panel-editor config-section-body">
            <div className="panel-editor-head">
              <p className="field-hint">
                {label.sizes} must add up to the overall {label.main}. Changing a {label.cellSize} adjusts the part next to it.
                Tip: click a panel in the drawing to jump to it.
              </p>
              <Button size="sm" variant="secondary" onClick={equalise}>
                Equalise
              </Button>
            </div>

            {showLevel ? (
              <label className="check-row">
                <input type="checkbox" checked={keepLevel} onChange={(event) => setKeepLevel(event.target.checked)} />
                <span>Keep top lights level across columns</span>
              </label>
            ) : null}

            <ul className="panel-list">
              {layout.sections.map((section, sectionIndex) => {
                const single = section.cells.length === 1
                const onlyCell = section.cells[0]
                return (
                  <li key={section.id} className="layout-section">
                    <div className="panel-row" data-cell-id={single ? onlyCell?.id : undefined}>
                      <span className="panel-index">{sectionIndex + 1}</span>
                      <NumberField
                        label={label.main === 'width' ? 'Width' : 'Height'}
                        suffix="mm"
                        value={section.sizeMm}
                        min={1}
                        step={5}
                        onChange={(sizeMm) => updateSection(section.id, (entry) => ({ ...entry, sizeMm: Math.round(sizeMm) }))}
                      />
                      {single && onlyCell ? (
                        <KindSelect
                          label={`${label.section} ${sectionIndex + 1} opening`}
                          kinds={kinds}
                          value={onlyCell.kind}
                          onChange={(kind) => setCellKind(section.id, onlyCell.id, kind)}
                        />
                      ) : (
                        <span className="panel-row-note">{section.cells.length} parts</span>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={layout.sections.length <= 1}
                        onClick={() => removeSection(section.id)}
                      >
                        Remove
                      </Button>
                    </div>

                    {!single ? (
                      <ul className="panel-cells">
                        {section.cells.map((cell, cellIndex) => (
                          <li key={cell.id} className="panel-row panel-cell-row" data-cell-id={cell.id}>
                            <NumberField
                              label={`${cellName(cellIndex, section.cells.length)} ${label.cellSize}`}
                              suffix="mm"
                              value={cell.sizeMm}
                              min={1}
                              step={5}
                              onChange={(sizeMm) => resizeCell(section, cellIndex, sizeMm)}
                            />
                            <KindSelect
                              label={`${cellName(cellIndex, section.cells.length)} opening`}
                              kinds={kinds}
                              value={cell.kind}
                              onChange={(kind) => setCellKind(section.id, cell.id, kind)}
                            />
                            <Button size="sm" variant="secondary" onClick={() => removeCell(section, cell.id)}>
                              Remove
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {canStack && section.cells.length < MAX_CELLS ? (
                      <button type="button" className="link-btn panel-add-cell" onClick={() => addCell(section)}>
                        + {label.addCell}
                      </button>
                    ) : null}
                  </li>
                )
              })}
            </ul>

            <div className="panel-foot">
              <p className={cx('width-sum', mainDelta === 0 ? 'is-ok' : 'is-bad')} aria-live="polite">
                {mainDelta === 0
                  ? `Total ${mainSum} mm. Matches the overall ${label.main}.`
                  : mainDelta > 0
                    ? `Total ${mainSum} mm. ${mainDelta} mm remaining.`
                    : `Total ${mainSum} mm. ${Math.abs(mainDelta)} mm over.`}
              </p>
              <Button size="sm" variant="secondary" disabled={layout.sections.length >= LIMITS.maxPanels} onClick={addSection}>
                {label.addSection}
              </Button>
            </div>
          </div>
        </details>
      ) : null}

      <TextField label="Notes" value={item.notes} placeholder="Obscure glass, restrictor, pet door" onChange={(notes) => onChange({ ...item, notes })} />
    </section>
  )
}

function KindSelect({
  label,
  kinds,
  value,
  onChange,
}: {
  label: string
  kinds: PanelKind[]
  value: PanelKind
  onChange: (kind: PanelKind) => void
}) {
  return (
    <label className="field">
      <span className="field-label">Opening</span>
      <select className="input" aria-label={label} value={value} onChange={(event) => onChange(event.target.value as PanelKind)}>
        {kinds.map((kind) => (
          <option key={kind} value={kind}>
            {panelKindLabels[kind]}
          </option>
        ))}
        {kinds.includes(value) ? null : <option value={value}>{panelKindLabels[value]}</option>}
      </select>
    </label>
  )
}
