import type { LayoutPreset } from '../../data/technicalPresets.ts'
import type { PanelKind } from '../../domain/models.ts'
import { cx } from '../../utils/cx.ts'
import { OpeningDrawing } from './OpeningDrawing.tsx'

interface LayoutThumbProps {
  preset: LayoutPreset
  pressed: boolean
  onSelect: () => void
}

export function LayoutThumb({ preset, pressed, onSelect }: LayoutThumbProps) {
  const panels = preset.panels.map((kind, index) => ({
    id: `${preset.id}-${index}`,
    widthMm: preset.sampleWidths?.[index] ?? 100,
    kind: kind as PanelKind,
  }))
  const width = panels.reduce((sum, panel) => sum + panel.widthMm, 0)
  return (
    <button type="button" className={cx('preset', pressed && 'is-active')} aria-pressed={pressed} onClick={onSelect}>
      <span className="preset-art" aria-hidden="true">
        <OpeningDrawing
          widthMm={width}
          heightMm={Math.max(width * 0.72, 80)}
          panels={panels}
          frameColor="#f3f0e8"
          showDimensions={false}
          showCill={false}
          productType={preset.products[0] ?? 'window'}
        />
      </span>
      <span className="preset-label">{preset.label}</span>
    </button>
  )
}
