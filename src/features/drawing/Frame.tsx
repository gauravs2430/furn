import type { Rect } from '../../domain/geometry.ts'
import { Profile } from './Profile.tsx'

interface FrameProps {
  outer: Rect
  width: number
  color: string
  patternId?: string
  shadowId?: string
}

export function Frame({ outer, width, color, patternId, shadowId }: FrameProps) {
  const inner: Rect = {
    x: outer.x + width,
    y: outer.y + width,
    width: Math.max(1, outer.width - width * 2),
    height: Math.max(1, outer.height - width * 2),
  }
  return (
    <g>
      {/* Drop shadow behind the whole window, cast down and slightly right. */}
      <rect
        x={outer.x}
        y={outer.y}
        width={outer.width}
        height={outer.height}
        fill={color}
        filter={shadowId ? `url(#${shadowId})` : undefined}
      />
      <Profile outer={outer} inner={inner} color={color} patternId={patternId} />
    </g>
  )
}
