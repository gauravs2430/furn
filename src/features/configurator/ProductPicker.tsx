import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { ProductTypeId } from '../../domain/models.ts'
import { cx } from '../../utils/cx.ts'

type ArtKind =
  | 'casement'
  | 'tilt'
  | 'fixed'
  | 'slider'
  | 'bay'
  | 'bow'
  | 'coupled'
  | 'door'
  | 'sidelight'
  | 'french'
  | 'patio'
  | 'bifold'

interface PickerItem {
  id: string
  name: string
  /** Catalogue family used when the item is added to the quote. */
  type: ProductTypeId
  /** Shown in the "Select Type" filter. */
  kind: string
  art: ArtKind
  panels: number
}

interface PickerGroup {
  id: string
  label: string
  items: PickerItem[]
}

const groups: PickerGroup[] = [
  {
    id: 'windows',
    label: 'Windows',
    items: [
      { id: 'casement', name: 'Casement', type: 'window', kind: 'Casement', art: 'casement', panels: 2 },
      { id: 'tilt-turn', name: 'Tilt & turn', type: 'window', kind: 'Tilt & turn', art: 'tilt', panels: 2 },
      { id: 'fixed', name: 'Fixed light', type: 'window', kind: 'Fixed', art: 'fixed', panels: 1 },
      { id: 'sliding-sash', name: 'Sliding sash', type: 'window', kind: 'Sliding', art: 'slider', panels: 2 },
      { id: 'bay', name: 'Bay window', type: 'window', kind: 'Bay', art: 'bay', panels: 3 },
      { id: 'bow', name: 'Bow window', type: 'window', kind: 'Bow', art: 'bow', panels: 3 },
      { id: 'coupled', name: 'Coupled window', type: 'window', kind: 'Coupled', art: 'coupled', panels: 3 },
    ],
  },
  {
    id: 'single-door',
    label: 'Single door',
    items: [
      { id: 'single-half', name: 'Half-glazed door', type: 'door', kind: 'Half glazed', art: 'door', panels: 1 },
      { id: 'single-solid', name: 'Solid panel door', type: 'door', kind: 'Solid', art: 'door', panels: 1 },
      { id: 'single-side', name: 'Door with side light', type: 'door', kind: 'Side light', art: 'sidelight', panels: 2 },
    ],
  },
  {
    id: 'french-door',
    label: 'French door',
    items: [
      { id: 'french-2', name: 'French door, 2 leaf', type: 'door', kind: '2 leaf', art: 'french', panels: 2 },
      { id: 'french-3', name: 'French door, 3 leaf', type: 'door', kind: '3 leaf', art: 'french', panels: 3 },
    ],
  },
  {
    id: 'sliding-patio',
    label: 'Sliding Patio',
    items: [
      { id: 'patio-2', name: 'Sliding patio, 2 panel', type: 'patio', kind: '2 panel', art: 'patio', panels: 2 },
      { id: 'patio-3', name: 'Sliding patio, 3 panel', type: 'patio', kind: '3 panel', art: 'patio', panels: 3 },
      { id: 'patio-4', name: 'Sliding patio, 4 panel', type: 'patio', kind: '4 panel', art: 'patio', panels: 4 },
    ],
  },
  {
    id: 'bifold-door',
    label: 'Bi-fold door',
    items: [
      { id: 'bifold-3', name: 'Bi-fold, 3 panel', type: 'bifold', kind: '3 panel', art: 'bifold', panels: 3 },
      { id: 'bifold-4', name: 'Bi-fold, 4 panel', type: 'bifold', kind: '4 panel', art: 'bifold', panels: 4 },
      { id: 'bifold-5', name: 'Bi-fold, 5 panel', type: 'bifold', kind: '5 panel', art: 'bifold', panels: 5 },
    ],
  },
]

function lines(count: number) {
  return Array.from({ length: Math.max(0, count - 1) }, (_, index) => (index + 1) / count)
}

function ProductArt({ art, panels }: { art: ArtKind; panels: number }) {
  const frame = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinejoin: 'round' as const }

  switch (art) {
    case 'bay':
    case 'bow':
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <path d="M14 34 L34 22 H86 L106 34 V96 H14 Z" {...frame} />
          <path d="M34 22 V96 M86 22 V96" {...frame} strokeWidth={1.6} />
          <path d="M14 34 H106" {...frame} strokeWidth={1.6} />
        </svg>
      )
    case 'bifold':
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <rect x="14" y="18" width="92" height="84" {...frame} />
          <path d="M14 18 L38 60 L14 102 M38 18 L14 60 L38 102" {...frame} strokeWidth={1.5} opacity="0.7" />
          <path d="M62 18 V102 M86 18 V102" {...frame} strokeWidth={1.6} />
        </svg>
      )
    case 'french':
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <rect x="16" y="14" width="88" height="92" {...frame} />
          {lines(panels).map((ratio) => (
            <line key={ratio} x1={16 + 88 * ratio} y1="14" x2={16 + 88 * ratio} y2="106" {...frame} strokeWidth={1.6} />
          ))}
          <path d="M16 84 H104" {...frame} strokeWidth={1.4} />
          <circle cx="56" cy="70" r="2.4" fill="currentColor" />
          <circle cx="64" cy="70" r="2.4" fill="currentColor" />
        </svg>
      )
    case 'patio':
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <rect x="12" y="16" width="96" height="88" {...frame} />
          <rect x="18" y="22" width={96 / panels - 4} height="76" {...frame} strokeWidth={1.6} />
          {lines(panels).map((ratio) => (
            <line key={ratio} x1={12 + 96 * ratio} y1="16" x2={12 + 96 * ratio} y2="104" {...frame} strokeWidth={1.8} />
          ))}
          <path d="M46 96 h8 M54 92 v8" {...frame} strokeWidth={1.4} />
        </svg>
      )
    case 'door':
    case 'sidelight':
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <rect x={art === 'sidelight' ? 20 : 30} y="12" width={art === 'sidelight' ? 52 : 60} height="96" {...frame} />
          <rect x={art === 'sidelight' ? 20 : 30} y="12" width={art === 'sidelight' ? 52 : 60} height="44" {...frame} strokeWidth={1.5} />
          <circle cx={art === 'sidelight' ? 64 : 80} cy="68" r="2.6" fill="currentColor" />
          {art === 'sidelight' ? <rect x="76" y="12" width="24" height="96" {...frame} strokeWidth={1.6} /> : null}
        </svg>
      )
    case 'slider':
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <rect x="14" y="18" width="92" height="84" {...frame} />
          <rect x="20" y="24" width="40" height="72" {...frame} strokeWidth={1.6} />
          <rect x="60" y="24" width="40" height="72" {...frame} strokeWidth={1.6} />
          <path d="M54 60 H86 M80 54 L86 60 L80 66" {...frame} strokeWidth={1.4} />
        </svg>
      )
    case 'fixed':
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <rect x="16" y="16" width="88" height="88" {...frame} />
          <rect x="24" y="24" width="72" height="72" {...frame} strokeWidth={1.2} opacity="0.5" />
          <path d="M16 60 H104 M60 16 V104" {...frame} strokeWidth={1.2} opacity="0.4" />
        </svg>
      )
    case 'tilt':
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <rect x="14" y="18" width="92" height="84" {...frame} />
          <line x1="60" y1="18" x2="60" y2="102" {...frame} strokeWidth={1.6} />
          <path d="M14 66 H106" {...frame} strokeWidth={1.4} />
          <circle cx="68" cy="76" r="2.2" fill="currentColor" />
        </svg>
      )
    case 'coupled':
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <rect x="10" y="18" width="100" height="84" {...frame} />
          {lines(panels).map((ratio) => (
            <line key={ratio} x1={10 + 100 * ratio} y1="18" x2={10 + 100 * ratio} y2="102" {...frame} strokeWidth={1.6} />
          ))}
          <path d="M10 58 H110" {...frame} strokeWidth={1.2} opacity="0.6" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <rect x="14" y="18" width="92" height="84" {...frame} />
          {lines(panels).map((ratio) => (
            <line key={ratio} x1={14 + 92 * ratio} y1="18" x2={14 + 92 * ratio} y2="102" {...frame} strokeWidth={1.6} />
          ))}
          <path d="M60 60 h2" {...frame} />
          <circle cx={14 + 92 * 0.72} cy="66" r="2.2" fill="currentColor" />
        </svg>
      )
  }
}

export interface PickedProduct extends PickerItem {
  quantity: number
}

interface ProductPickerProps {
  onClose: () => void
  onPick: (product: PickedProduct) => void
}

export function ProductPicker({ onClose, onPick }: ProductPickerProps) {
  const [activeGroupId, setActiveGroupId] = useState(groups[0].id)
  const [typeFilter, setTypeFilter] = useState('all')

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0]

  function selectGroup(groupId: string) {
    setActiveGroupId(groupId)
    setTypeFilter('all')
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const kinds = useMemo(() => Array.from(new Set(activeGroup.items.map((item) => item.kind))), [activeGroup])

  const visibleItems = typeFilter === 'all' ? activeGroup.items : activeGroup.items.filter((item) => item.kind === typeFilter)

  return (
    <div className="product-chooser" role="dialog" aria-modal="true" aria-label="Choose a product">
      <aside className="pp-rail">
        <div className="pp-rail-head">
          <h1 className="pp-title">Choose a product</h1>
        </div>
        <nav className="pp-groups" aria-label="Product groups">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={cx('pp-group', group.id === activeGroup.id && 'is-active')}
              aria-current={group.id === activeGroup.id ? 'true' : undefined}
              onClick={() => selectGroup(group.id)}
            >
              <span>{group.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="pp-main">
        <div className="pp-bar">
          <div className="pp-filters">
            <span className="pp-filter-label">Filter By:</span>

            <label className="pp-field">
              <span className="sr-only">Select group</span>
              <select value={activeGroup.id} onChange={(event) => selectGroup(event.target.value)}>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
            </label>

            <label className="pp-field">
              <span className="sr-only">Select type</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">All types</option>
                {kinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
            </label>
          </div>

          <button type="button" className="pp-close" aria-label="Close product picker" onClick={onClose}>
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <div className="pp-grid">
          {visibleItems.map((item) => (
            <article key={item.id} className="pp-card">
              <div className="pp-art">
                <ProductArt art={item.art} panels={item.panels} />
              </div>
              <p className="pp-name">{item.name}</p>
              <button type="button" className="pp-add" onClick={() => onPick({ ...item, quantity: 1 })}>
                Add
              </button>
            </article>
          ))}
        </div>

        {visibleItems.length === 0 ? <p className="pp-empty">No products match this filter.</p> : null}
      </section>
    </div>
  )
}
