import type { Rect } from '../../domain/geometry.ts'
import { mixHex } from '../../utils/color.ts'

interface ProfileProps {
  /** Outside edge of the frame or sash. */
  outer: Rect
  /** Inside edge, where the glass (or the next profile) starts. */
  inner: Rect
  color: string
  patternId?: string
}

function points(values: number[]): string {
  const out: string[] = []
  for (let index = 0; index < values.length; index += 2) out.push(`${values[index]},${values[index + 1]}`)
  return out.join(' ')
}

/**
 * A uPVC-style profile: four mitred lengths, lit from the top left, so the
 * corner joints show as fine diagonal lines like a real welded frame.
 */
export function Profile({ outer, inner, color, patternId }: ProfileProps) {
  const o = outer
  const i = inner
  if (o.width < 2 || o.height < 2 || i.width < 1 || i.height < 1) return null
  const ox2 = o.x + o.width
  const oy2 = o.y + o.height
  const ix2 = i.x + i.width
  const iy2 = i.y + i.height
  const edge = mixHex(color, '#1b2328', 0.42)
  const sides = [
    { key: 'top', shade: mixHex(color, '#ffffff', 0.55), pts: [o.x, o.y, ox2, o.y, ix2, i.y, i.x, i.y] },
    { key: 'left', shade: mixHex(color, '#ffffff', 0.28), pts: [o.x, oy2, o.x, o.y, i.x, i.y, i.x, iy2] },
    { key: 'right', shade: mixHex(color, '#000000', 0.05), pts: [ox2, o.y, ox2, oy2, ix2, iy2, ix2, i.y] },
    { key: 'bottom', shade: mixHex(color, '#000000', 0.11), pts: [ox2, oy2, o.x, oy2, i.x, iy2, ix2, iy2] },
  ]
  return (
    <g>
      {sides.map((side) => (
        <polygon key={side.key} points={points(side.pts)} fill={side.shade} stroke={edge} strokeWidth={0.45} strokeLinejoin="round" />
      ))}
      {patternId
        ? sides.map((side) => <polygon key={`grain-${side.key}`} points={points(side.pts)} fill={`url(#${patternId})`} opacity={0.4} />)
        : null}
      {/* Soft shadow where the profile meets what it holds. */}
      <rect x={i.x} y={i.y} width={i.width} height={i.height} fill="none" stroke="#1b2328" strokeOpacity={0.28} strokeWidth={0.9} />
      <rect x={o.x} y={o.y} width={o.width} height={o.height} fill="none" stroke={edge} strokeWidth={0.8} />
    </g>
  )
}
