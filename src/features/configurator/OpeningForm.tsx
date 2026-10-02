import type { Panel, PanelKind, QuoteItem } from '../../domain/models.ts'
import { findProduct, panelKindLabels, panelKindsFor, products } from '../../data/productCatalog.ts'
import { findPreset, matchPreset, presetsFor, technicalDefaults } from '../../data/technicalPresets.ts'
import { applyProductType, describeConfiguration, equalPanelWidths, panelWidthTotal, panelsForPreset } from '../../domain/factories.ts'
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

function withPanels(item: QuoteItem, panels: Panel[]): QuoteItem {
  const defaults = technicalDefaults(
    item.productType,
    item.materialId,
    item.glazingId,
    panels.map((panel) => panel.kind),
  )
  return {
    ...item,
    panels,
    technical: {
      ...item.technical,
      mullion: panels.length > 1 ? defaults.mullion : 'None',
      sashType: defaults.sashType,
      locking: defaults.locking,
      handle: defaults.handle,
      hinge: defaults.hinge,
      glazingMethod: defaults.glazingMethod,
      glassType: defaults.glassType === 'None' ? defaults.glassType : item.technical.glassType || defaults.glassType,
      gasFill: defaults.gasFill === 'None' ? defaults.gasFill : item.technical.gasFill || defaults.gasFill,
    },
  }
}

export function OpeningForm({ item, onChange }: OpeningFormProps) {
  const presets = presetsFor(item.productType)
  const active = matchPreset(item.panels.map((panel) => panel.kind))
  const total = panelWidthTotal(item.panels)
  const delta = item.widthMm - total
  const matched = item.panels.length > 0 && delta === 0
  const product = findProduct(item.productType)

  function selectPreset(presetId: string) {
    const preset = findPreset(presetId)
    const sampleSum = preset?.sampleWidths?.reduce((sum, width) => sum + width, 0)
    const explicit = preset?.sampleWidths && sampleSum === item.widthMm ? preset.sampleWidths : undefined
    onChange(withPanels(item, panelsForPreset(presetId, item.widthMm, explicit)))
  }

  function updatePanel(id: string, patch: Partial<Panel>) {
    onChange(
      withPanels(
        item,
        item.panels.map((panel) => (panel.id === id ? { ...panel, ...patch } : panel)),
      ),
    )
  }

  return (
    <section className="card" aria-labelledby="opening-heading">
      <div className="card-head">
        <h2 id="opening-heading">Opening</h2>
        <p>
          {product.name} · {describeConfiguration(item.panels)}
        </p>
      </div>

      <div className="product-grid" role="radiogroup" aria-label="Product">
        {products.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={item.productType === entry.id}
            className={cx('product-choice', item.productType === entry.id && 'is-active')}
            onClick={() => {
              if (item.productType !== entry.id) onChange(applyProductType(item, entry.id))
            }}
          >
            <span className="product-name">{entry.name}</span>
            <span className="product-summary">{entry.summary}</span>
          </button>
        ))}
      </div>

      <h3 className="subhead">Layout</h3>
      <div className="preset-grid">
        {presets.map((preset) => (
          <LayoutThumb
            key={preset.id}
            preset={preset}
            pressed={active?.id === preset.id}
            onSelect={() => selectPreset(preset.id)}
          />
        ))}
        <div className={cx('preset preset-static', !active && 'is-active')} aria-current={!active ? 'true' : undefined}>
          <span className="preset-art preset-custom">Custom</span>
          <span className="preset-label">Custom</span>
        </div>
      </div>

      <div className="form-grid measure-grid">
        <NumberField
          label="Overall width"
          suffix="mm"
          value={item.widthMm}
          min={LIMITS.widthMin}
          max={LIMITS.widthMax}
          step={10}
          stepper
          onChange={(widthMm) => onChange({ ...item, widthMm })}
        />
        <NumberField
          label="Overall height"
          suffix="mm"
          value={item.heightMm}
          min={LIMITS.heightMin}
          max={LIMITS.heightMax}
          step={10}
          stepper
          onChange={(heightMm) => onChange({ ...item, heightMm })}
        />
        <NumberField
          label="Quantity"
          value={item.quantity}
          min={1}
          max={LIMITS.quantityMax}
          step={1}
          stepper
          onChange={(quantity) => onChange({ ...item, quantity: Math.max(1, Math.round(quantity)) })}
        />
        <TextField
          label="Room / location"
          value={item.location}
          placeholder="Living room"
          onChange={(location) => onChange({ ...item, location })}
        />
      </div>

      <div className="panel-editor">
        <div className="panel-editor-head">
          <h3 className="subhead">Panel widths</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const widths = equalPanelWidths(item.widthMm, item.panels.length)
              onChange(
                withPanels(
                  item,
                  item.panels.map((panel, index) => ({ ...panel, widthMm: widths[index] ?? panel.widthMm })),
                ),
              )
            }}
          >
            Equalise widths
          </Button>
        </div>
        <ul className="panel-list">
          {item.panels.map((panel, index) => (
            <li key={panel.id} className="panel-row">
              <span className="panel-index">{index + 1}</span>
              <NumberField
                label={`Panel ${index + 1} width`}
                suffix="mm"
                value={panel.widthMm}
                min={1}
                step={5}
                onChange={(widthMm) => updatePanel(panel.id, { widthMm: Math.round(widthMm) })}
              />
              <label className="field">
                <span className="field-label">Opening</span>
                <select
                  className="input"
                  aria-label={`Panel ${index + 1} opening`}
                  value={panel.kind}
                  onChange={(event) => updatePanel(panel.id, { kind: event.target.value as PanelKind })}
                >
                  {panelKindsFor(item.productType).map((kind) => (
                    <option key={kind} value={kind}>
                      {panelKindLabels[kind]}
                    </option>
                  ))}
                  {panelKindsFor(item.productType).includes(panel.kind) ? null : (
                    <option value={panel.kind}>{panelKindLabels[panel.kind]}</option>
                  )}
                </select>
              </label>
              <Button
                size="sm"
                variant="ghost"
                disabled={item.panels.length <= 1}
                onClick={() => onChange(withPanels(item, item.panels.filter((entry) => entry.id !== panel.id)))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="panel-foot">
          <p className={cx('width-sum', matched ? 'is-ok' : 'is-bad')} aria-live="polite">
            {matched
              ? `Total ${total} mm. Matches the overall width.`
              : delta > 0
                ? `Total ${total} mm. ${delta} mm remaining.`
                : `Total ${total} mm. ${Math.abs(delta)} mm over.`}
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={item.panels.length >= LIMITS.maxPanels}
            onClick={() => {
              const last = item.panels[item.panels.length - 1]
              const next: Panel = {
                id: createId(),
                widthMm: last?.widthMm ?? 600,
                kind: item.productType === 'bifold' ? 'bifold' : item.productType === 'patio' ? 'sliding' : 'fixed',
              }
              onChange(withPanels(item, [...item.panels, next]))
            }}
          >
            Add panel
          </Button>
        </div>
      </div>

      <TextField label="Notes" value={item.notes} placeholder="Obscure glass, restrictor, pet door" onChange={(notes) => onChange({ ...item, notes })} />
    </section>
  )
}
