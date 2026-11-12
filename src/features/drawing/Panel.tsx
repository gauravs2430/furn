import type { DrawnPanel } from '../../domain/geometry.ts'
import { mixHex } from '../../utils/color.ts'
import { GlassPane } from './GlassPane.tsx'
import { OpeningIndicator } from './OpeningIndicator.tsx'
import { Profile } from './Profile.tsx'

interface PanelProps {
  panel: DrawnPanel
  frameColor: string
  gradientId: string
  patternId?: string
}

/** Handle in the frame colour with a brass key cylinder; lies flat on top-hung sashes. */
function Handle({ x, y, size, color, flat }: { x: number; y: number; size: number; color: string; flat: boolean }) {
  const body = mixHex(color, '#ffffff', 0.35)
  const edge = mixHex(color, '#1b2328', 0.5)
  const w = size * 0.3
  const h = size
  return (
    <g transform={flat ? `rotate(90 ${x} ${y})` : undefined}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={w / 2} fill={body} stroke={edge} strokeWidth={0.6} />
      <rect x={x - w * 0.95} y={y - h * 0.38} width={w * 0.7} height={h * 0.34} rx={w * 0.3} fill={body} stroke={edge} strokeWidth={0.5} />
      <circle cx={x} cy={y + h * 0.26} r={w * 0.28} fill="#c9a24e" stroke="#8a6b2a" strokeWidth={0.4} />
    </g>
  )
}

export function Panel({ panel, frameColor, gradientId, patternId }: PanelProps) {
  const indicatorRect = panel.glass ?? panel.solid ?? panel.cell
  const sashInner = panel.glass ?? panel.solid
  const handleSize = Math.max(7, Math.min(34, Math.min(panel.cell.width, panel.cell.height) * 0.2))
  return (
    <g>
      {panel.sash && sashInner ? (
        <Profile outer={panel.sash} inner={sashInner} color={frameColor} patternId={patternId} />
      ) : null}
      {panel.solid ? (
        <rect
          x={panel.solid.x}
          y={panel.solid.y}
          width={panel.solid.width}
          height={panel.solid.height}
          fill={mixHex(frameColor, '#000000', 0.04)}
          stroke={mixHex(frameColor, '#1b2328', 0.42)}
          strokeWidth={0.6}
        />
      ) : null}
      {panel.glass ? <GlassPane rect={panel.glass} gradientId={gradientId} /> : null}
      {panel.railY !== null ? (
        <rect
          x={panel.cell.x}
          y={panel.railY - 1.5}
          width={panel.cell.width}
          height={3.5}
          fill={frameColor}
          stroke={mixHex(frameColor, '#1b2328', 0.42)}
          strokeWidth={0.6}
        />
      ) : null}
      {panel.indicator ? <OpeningIndicator kind={panel.indicator} rect={indicatorRect} /> : null}
      {panel.handle ? (
        <Handle x={panel.handle.x} y={panel.handle.y} size={handleSize} color={frameColor} flat={panel.kind === 'top-hung'} />
      ) : null}
    </g>
  )
}
