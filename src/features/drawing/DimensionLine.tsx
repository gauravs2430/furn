import type { DimensionSpec } from '../../domain/geometry.ts'

function arrowHead(x: number, y: number, dx: number, dy: number): string {
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const size = 8
  const wing = 3.4
  const px = -uy
  const py = ux
  const bx = x - ux * size
  const by = y - uy * size
  return `M ${bx + px * wing} ${by + py * wing} L ${x} ${y} L ${bx - px * wing} ${by - py * wing}`
}

export function DimensionLine({ spec }: { spec: DimensionSpec }) {
  const { x1, y1, x2, y2, label, orientation, extend } = spec
  const extension = 12
  const extensions =
    extend === 'down'
      ? [
          [x1, y1, x1, y1 + extension],
          [x2, y2, x2, y2 + extension],
        ]
      : extend === 'up'
        ? [
            [x1, y1, x1, y1 - extension],
            [x2, y2, x2, y2 - extension],
          ]
        : extend === 'right'
          ? [
              [x1, y1, x1 + extension, y1],
              [x2, y2, x2 + extension, y2],
            ]
          : [
              [x1, y1, x1 - extension, y1],
              [x2, y2, x2 - extension, y2],
            ]

  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const textX = orientation === 'h' ? midX : x1 - 9
  const textY = orientation === 'h' ? y1 - 5 : midY

  return (
    <g className="dimension">
      {extensions.map((line, index) => (
        <line
          key={index}
          x1={line[0]}
          y1={line[1]}
          x2={line[2]}
          y2={line[3]}
          stroke="#8d7040"
          strokeWidth={0.7}
        />
      ))}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9a6f12" strokeWidth={1.15} />
      <path d={arrowHead(x1, y1, x1 - x2, y1 - y2)} fill="none" stroke="#9a6f12" strokeWidth={1.15} strokeLinejoin="miter" />
      <path d={arrowHead(x2, y2, x2 - x1, y2 - y1)} fill="none" stroke="#9a6f12" strokeWidth={1.15} strokeLinejoin="miter" />
      <text
        x={textX}
        y={textY}
        fill="#1c2830"
        stroke="#f6f4ef"
        strokeWidth={3.5}
        paintOrder="stroke"
        fontFamily="Barlow, sans-serif"
        fontSize={12}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={orientation === 'v' ? `rotate(-90 ${textX} ${textY})` : undefined}
      >
        {label}
      </text>
    </g>
  )
}
