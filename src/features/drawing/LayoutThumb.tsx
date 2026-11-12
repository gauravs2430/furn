import type { LayoutPreset } from '../../data/technicalPresets.ts'
import { presetLayout } from '../../data/technicalPresets.ts'
import { cx } from '../../utils/cx.ts'
import { OpeningDrawing } from './OpeningDrawing.tsx'

interface LayoutThumbProps {
  preset: LayoutPreset
  pressed: boolean
  onSelect: () => void
}

export function LayoutThumb({ preset, pressed, onSelect }: LayoutThumbProps) {
  return (
    <button type="button" className={cx('preset', pressed && 'is-active')} aria-pressed={pressed} onClick={onSelect}>
      <span className="preset-art" aria-hidden="true">
        <OpeningDrawing
          widthMm={preset.sample.width}
          heightMm={preset.sample.height}
          layout={presetLayout(preset)}
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
