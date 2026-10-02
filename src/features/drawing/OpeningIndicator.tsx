import type { IndicatorKind } from '../../domain/geometry.ts'
import type { Rect } from '../../domain/geometry.ts'

interface OpeningIndicatorProps {
  kind: IndicatorKind
  rect: Rect
}

export function OpeningIndicator({ kind, rect }: OpeningIndicatorProps) {
  const { x, y, width: w, height: h } = rect
  if (w < 8 || h < 8) return null
  const stroke = '#243038'
  const shared = { fill: 'none', stroke, strokeWidth: 1.15, strokeLinejoin: 'miter' as const }

  if (kind === 'casement-left' || kind === 'tilt-left' || kind === 'door-swing') {
    return (
      <g>
        <path d={`M ${x} ${y} L ${x + w} ${y + h / 2} L ${x} ${y + h}`} {...shared} />
        {kind === 'tilt-left' ? (
          <path d={`M ${x} ${y + h} L ${x + w / 2} ${y} L ${x + w} ${y + h}`} {...shared} strokeDasharray="3 2.5" />
        ) : null}
      </g>
    )
  }

  if (kind === 'casement-right' || kind === 'tilt-right') {
    return (
      <g>
        <path d={`M ${x + w} ${y} L ${x} ${y + h / 2} L ${x + w} ${y + h}`} {...shared} />
        {kind === 'tilt-right' ? (
          <path d={`M ${x} ${y + h} L ${x + w / 2} ${y} L ${x + w} ${y + h}`} {...shared} strokeDasharray="3 2.5" />
        ) : null}
      </g>
    )
  }

  if (kind === 'sliding') {
    const mid = y + h / 2
    const start = x + w * 0.22
    const end = x + w * 0.78
    return <path d={`M ${start} ${mid} H ${end} l -6.5 -5.5 M ${end} ${mid} l -6.5 5.5`} {...shared} strokeWidth={1.25} />
  }

  const mid = y + h / 2
  const left = x + w * 0.32
  const right = x + w * 0.68
  return (
    <path
      d={`M ${left - 7} ${mid - 6} L ${left} ${mid} L ${left - 7} ${mid + 6} M ${right + 7} ${mid - 6} L ${right} ${mid} L ${right + 7} ${mid + 6}`}
      {...shared}
      strokeWidth={1.25}
    />
  )
}
