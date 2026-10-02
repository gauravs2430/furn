import type { Rect } from '../../domain/geometry.ts'

export function GlassPane({ rect, gradientId }: { rect: Rect; gradientId: string }) {
  if (rect.width < 1 || rect.height < 1) return null
  const sheen = `${rect.x},${rect.y} ${rect.x + rect.width * 0.58},${rect.y} ${rect.x},${rect.y + rect.height * 0.42}`
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={`url(#${gradientId})`}
        stroke="#7f97a1"
        strokeWidth={0.6}
      />
      <polygon points={sheen} fill="#ffffff" opacity={0.38} />
    </g>
  )
}
