import type { Rect } from '../../domain/geometry.ts'
import { mixHex } from '../../utils/color.ts'

/** A mullion or transom: rounded faces, lit from above and the left. */
export function Mullion({ rect, color }: { rect: Rect; color: string }) {
  const horizontal = rect.width > rect.height
  const edge = mixHex(color, '#1b2328', 0.42)
  const light = mixHex(color, '#ffffff', horizontal ? 0.55 : 0.3)
  const shade = mixHex(color, '#000000', horizontal ? 0.1 : 0.06)
  return (
    <g>
      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={color} stroke={edge} strokeWidth={0.6} />
      {horizontal ? (
        <>
          <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height / 2} fill={light} />
          <rect x={rect.x} y={rect.y + rect.height / 2} width={rect.width} height={rect.height / 2} fill={shade} />
        </>
      ) : (
        <>
          <rect x={rect.x} y={rect.y} width={rect.width / 2} height={rect.height} fill={light} />
          <rect x={rect.x + rect.width / 2} y={rect.y} width={rect.width / 2} height={rect.height} fill={shade} />
        </>
      )}
      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="none" stroke={edge} strokeWidth={0.6} />
    </g>
  )
}
