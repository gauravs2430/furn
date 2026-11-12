import type { Rect } from '../../domain/geometry.ts'

/** Neutral grey glass with a dark gasket line and a soft reflection. */
export function GlassPane({ rect, gradientId }: { rect: Rect; gradientId: string }) {
  if (rect.width < 1 || rect.height < 1) return null
  const { x, y, width: w, height: h } = rect
  const band = `${x + w * 0.18},${y} ${x + w * 0.46},${y} ${x + w * 0.08},${y + h} ${x},${y + h} ${x},${y + h * 0.62}`
  const thin = `${x + w * 0.56},${y} ${x + w * 0.62},${y} ${x + w * 0.26},${y + h} ${x + w * 0.2},${y + h}`
  return (
    <g>
      <rect className="glass-face" x={x} y={y} width={w} height={h} fill={`url(#${gradientId})`} />
      <polygon points={band} fill="#ffffff" opacity={0.22} />
      <polygon points={thin} fill="#ffffff" opacity={0.16} />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#2c3438" strokeWidth={Math.min(1.6, Math.max(0.8, w / 120))} />
    </g>
  )
}
