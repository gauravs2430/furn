import type { Rect } from '../../domain/geometry.ts'

export function Mullion({ rect, color }: { rect: Rect; color: string }) {
  const horizontal = rect.width > rect.height
  return (
    <g>
      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={color} stroke="#243036" strokeWidth={0.8} />
      <line
        x1={horizontal ? rect.x + 1 : rect.x + rect.width / 2}
        y1={horizontal ? rect.y + rect.height / 2 : rect.y + 1}
        x2={horizontal ? rect.x + rect.width - 1 : rect.x + rect.width / 2}
        y2={horizontal ? rect.y + rect.height / 2 : rect.y + rect.height - 1}
        stroke="#ffffff"
        strokeOpacity={0.28}
        strokeWidth={0.6}
      />
    </g>
  )
}
