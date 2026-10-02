import type { DrawnPanel } from '../../domain/geometry.ts'
import { GlassPane } from './GlassPane.tsx'
import { OpeningIndicator } from './OpeningIndicator.tsx'

interface PanelProps {
  panel: DrawnPanel
  frameColor: string
  gradientId: string
}

export function Panel({ panel, frameColor, gradientId }: PanelProps) {
  const indicatorRect = panel.glass ?? panel.solid ?? panel.cell
  return (
    <g>
      {panel.sash ? (
        <rect
          x={panel.sash.x}
          y={panel.sash.y}
          width={panel.sash.width}
          height={panel.sash.height}
          fill={frameColor}
          stroke="#243036"
          strokeWidth={1}
        />
      ) : null}
      {panel.solid ? (
        <rect
          x={panel.solid.x}
          y={panel.solid.y}
          width={panel.solid.width}
          height={panel.solid.height}
          fill="#d9d3c8"
          stroke="#6d6256"
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
          stroke="#243036"
          strokeWidth={0.6}
        />
      ) : null}
      {panel.indicator ? <OpeningIndicator kind={panel.indicator} rect={indicatorRect} /> : null}
      {panel.handle ? (
        <g>
          <rect x={panel.handle.x - 1.1} y={panel.handle.y - 9} width={2.3} height={18} rx={1} fill="#3e474c" />
          <rect x={panel.handle.x - 8} y={panel.handle.y - 1.6} width={9} height={3.1} rx={1} fill="#c6a15a" />
        </g>
      ) : null}
    </g>
  )
}
