import { useState } from 'react'
import type { QuoteItem, TechnicalOptions } from '../../domain/models.ts'
import { cx } from '../../utils/cx.ts'

const fields: { key: keyof TechnicalOptions; label: string }[] = [
  { key: 'frameProfile', label: 'Frame profile' },
  { key: 'mullion', label: 'Mullion' },
  { key: 'cill', label: 'Cill' },
  { key: 'joint', label: 'Joint' },
  { key: 'bead', label: 'Bead' },
  { key: 'sashType', label: 'Sash type' },
  { key: 'locking', label: 'Locking' },
  { key: 'handle', label: 'Handle' },
  { key: 'hinge', label: 'Hinge' },
  { key: 'glassGroup', label: 'Glass display group' },
  { key: 'glazingMethod', label: 'Glazing method' },
  { key: 'glassType', label: 'Glass type' },
  { key: 'gasFill', label: 'Gas fill' },
  { key: 'componentType', label: 'Component type' },
  { key: 'drainage', label: 'Drainage' },
  { key: 'horizontalSplit', label: 'Horizontal split' },
]

interface TechnicalFormProps {
  item: QuoteItem
  onChange: (item: QuoteItem) => void
}

export function TechnicalForm({ item, onChange }: TechnicalFormProps) {
  const [open, setOpen] = useState(false)
  return (
    <section className="card">
      <button type="button" className="disclosure" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>
          <span className="disclosure-title">Advanced technical details</span>
          <span className="disclosure-copy">Prefilled from the layout. Open this when the factory sheet needs a change.</span>
        </span>
        <span className={cx('chevron', open && 'is-open')} aria-hidden="true" />
      </button>
      {open ? (
        <div className="form-grid tech-grid">
          {fields.map((field) => (
            <label key={field.key} className="field">
              <span className="field-label">{field.label}</span>
              <input
                className="input"
                value={item.technical[field.key]}
                onChange={(event) =>
                  onChange({
                    ...item,
                    technical: { ...item.technical, [field.key]: event.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
      ) : null}
    </section>
  )
}
