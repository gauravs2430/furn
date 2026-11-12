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
  onSelect?: (cellId: string) => void
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

/** Door lever on a backplate, with the lever pointing towards the hinges. */
function Lever({ x, y, size, color, towards }: { x: number; y: number; size: number; color: string; towards: 'left' | 'right' }) {
  const body = mixHex(color, '#ffffff', 0.35)
  const edge = mixHex(color, '#1b2328', 0.5)
  const plateW = size * 0.26
  const plateH = size * 1.2
  const leverL = size * 0.95
  const dir = towards === 'left' ? -1 : 1
  return (
    <g>
      <rect x={x - plateW / 2} y={y - plateH * 0.35} width={plateW} height={plateH} rx={plateW / 2} fill={body} stroke={edge} strokeWidth={0.6} />
      <rect
        x={dir < 0 ? x - leverL : x}
        y={y - size * 0.11}
        width={leverL}
        height={size * 0.22}
        rx={size * 0.11}
        fill={body}
        stroke={edge}
        strokeWidth={0.6}
      />
      <circle cx={x} cy={y + plateH * 0.42} r={plateW * 0.28} fill="#c9a24e" stroke="#8a6b2a" strokeWidth={0.4} />
    </g>
  )
}

/** Flag hinge: a small leaf sitting across the frame and sash on the hinge side. */
function Hinge({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const w = size * 0.55
  const h = size * 0.95
  return (
    <rect
      x={x - w / 2}
      y={y - h / 2}
      width={w}
      height={h}
      rx={w * 0.3}
      fill={mixHex(color, '#ffffff', 0.25)}
      stroke={mixHex(color, '#1b2328', 0.5)}
      strokeWidth={0.6}
    />
  )
}

export function Panel({ panel, frameColor, gradientId, patternId, onSelect }: PanelProps) {
  const indicatorRect = panel.glass ?? panel.solid ?? panel.cell
  const sashInner = panel.glass ?? panel.solid
  const handleSize = Math.max(7, Math.min(34, Math.min(panel.cell.width, panel.cell.height) * 0.2))
  const select = onSelect ? () => onSelect(panel.cellId) : undefined
  return (
    <g
      className={onSelect ? 'drawing-cell is-clickable' : 'drawing-cell'}
      onClick={select}
      onKeyDown={
        select
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                select()
              }
            }
          : undefined
      }
      role={select ? 'button' : undefined}
      tabIndex={select ? 0 : undefined}
      aria-label={select ? 'Edit the size of this panel' : undefined}
    >
      {select ? <rect x={panel.module.x} y={panel.module.y} width={panel.module.width} height={panel.module.height} fill="transparent" /> : null}
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
      {panel.hinges?.map((hinge, index) => (
        <Hinge key={index} x={hinge.x} y={hinge.y} size={handleSize * 0.6} color={frameColor} />
      ))}
      {panel.handle && panel.lever ? (
        <Lever x={panel.handle.x} y={panel.handle.y} size={handleSize * 0.8} color={frameColor} towards={panel.lever} />
      ) : panel.handle ? (
        <Handle x={panel.handle.x} y={panel.handle.y} size={handleSize} color={frameColor} flat={panel.kind === 'top-hung'} />
      ) : null}
    </g>
  )
}
