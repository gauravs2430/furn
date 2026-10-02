import type { Rect } from '../../domain/geometry.ts'

interface FrameProps {
  outer: Rect
  color: string
  patternId?: string
}

export function Frame({ outer, color, patternId }: FrameProps) {
  return (
    <g>
      <rect
        x={outer.x}
        y={outer.y}
        width={outer.width}
        height={outer.height}
        fill={color}
        stroke="#243036"
        strokeWidth={1.35}
      />
      {patternId ? (
        <rect
          x={outer.x}
          y={outer.y}
          width={outer.width}
          height={outer.height}
          fill={`url(#${patternId})`}
          opacity={0.45}
        />
      ) : null}
    </g>
  )
}
