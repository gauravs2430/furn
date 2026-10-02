import type { QuoteItem } from '../../domain/models.ts'
import { colours, findGlazing, glazingOptions, materials } from '../../data/productCatalog.ts'
import { technicalDefaults } from '../../data/technicalPresets.ts'
import { cx } from '../../utils/cx.ts'

interface AppearanceFormProps {
  item: QuoteItem
  onChange: (item: QuoteItem) => void
}

export function AppearanceForm({ item, onChange }: AppearanceFormProps) {
  function setMaterial(materialId: string) {
    const defaults = technicalDefaults(
      item.productType,
      materialId,
      item.glazingId,
      item.panels.map((panel) => panel.kind),
    )
    onChange({
      ...item,
      materialId,
      technical: {
        ...item.technical,
        frameProfile: defaults.frameProfile,
        mullion: item.panels.length > 1 ? defaults.mullion : 'None',
        joint: defaults.joint,
      },
    })
  }

  function setGlazing(glazingId: string) {
    const option = findGlazing(glazingId)
    const defaults = technicalDefaults(
      item.productType,
      item.materialId,
      glazingId,
      item.panels.map((panel) => panel.kind),
    )
    onChange({
      ...item,
      glazingId,
      technical: {
        ...item.technical,
        bead: defaults.bead,
        glassType: defaults.glazingMethod === 'Unglazed' ? 'None' : option.glassType,
        gasFill: defaults.glazingMethod === 'Unglazed' ? 'None' : option.gasFill,
        glazingMethod: defaults.glazingMethod,
      },
    })
  }

  return (
    <section className="card" aria-labelledby="appearance-heading">
      <div className="card-head">
        <h2 id="appearance-heading">Material, glass & colour</h2>
        <p>Frame finish is shown on the drawing. Internal colour is kept for the work order.</p>
      </div>

      <h3 className="subhead">Frame material</h3>
      <div className="segment" role="radiogroup" aria-label="Frame material">
        {materials.map((material) => (
          <button
            key={material.id}
            type="button"
            role="radio"
            aria-checked={item.materialId === material.id}
            className={cx('segment-btn', item.materialId === material.id && 'is-active')}
            onClick={() => setMaterial(material.id)}
          >
            {material.name}
          </button>
        ))}
      </div>

      <h3 className="subhead">Glazing</h3>
      <div className="glazing-grid">
        {glazingOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cx('glazing-card', item.glazingId === option.id && 'is-active')}
            aria-pressed={item.glazingId === option.id}
            onClick={() => setGlazing(option.id)}
          >
            <span className="product-name">{option.name}</span>
            <span className="product-summary">{option.description}</span>
          </button>
        ))}
      </div>

      <h3 className="subhead">External colour</h3>
      <div className="swatches" role="radiogroup" aria-label="External colour">
        {colours.map((colour) => (
          <button
            key={colour.id}
            type="button"
            role="radio"
            aria-checked={item.externalColourId === colour.id}
            className={cx('swatch', item.externalColourId === colour.id && 'is-active')}
            onClick={() => onChange({ ...item, externalColourId: colour.id })}
          >
            <span className="swatch-chip" style={{ background: colour.hex }} />
            <span>{colour.name}</span>
          </button>
        ))}
      </div>

      <h3 className="subhead">Internal colour</h3>
      <div className="swatches" role="radiogroup" aria-label="Internal colour">
        {colours.map((colour) => (
          <button
            key={`in-${colour.id}`}
            type="button"
            role="radio"
            aria-checked={item.internalColourId === colour.id}
            className={cx('swatch', item.internalColourId === colour.id && 'is-active')}
            onClick={() => onChange({ ...item, internalColourId: colour.id })}
          >
            <span className="swatch-chip" style={{ background: colour.hex }} />
            <span>{colour.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
