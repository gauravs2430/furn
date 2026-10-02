import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { Panel as PanelModel, ProductTypeId } from '../../domain/models.ts'
import { layoutDrawing } from '../../domain/geometry.ts'
import { cx } from '../../utils/cx.ts'
import { DimensionLine } from './DimensionLine.tsx'
import { Frame } from './Frame.tsx'
import { Mullion } from './Mullion.tsx'
import { Panel } from './Panel.tsx'

interface OpeningDrawingProps {
  widthMm: number
  heightMm: number
  panels: PanelModel[]
  frameColor: string
  finish?: 'solid' | 'oak'
  showDimensions?: boolean
  showCill?: boolean
  productType?: ProductTypeId
  className?: string
  title?: string
}

export function OpeningDrawing({
  widthMm,
  heightMm,
  panels,
  frameColor,
  finish = 'solid',
  showDimensions = true,
  showCill = true,
  productType = 'window',
  className,
  title,
}: OpeningDrawingProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const reactId = useId().replace(/:/g, '')
  const gradientId = `glass-${reactId}`
  const oakId = `oak-${reactId}`
  const hatchId = `hatch-${reactId}`

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setSize({ w: element.clientWidth, h: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const model =
    size.w > 0 && size.h > 0
      ? layoutDrawing({
          widthMm,
          heightMm,
          panels,
          viewportWidth: size.w,
          viewportHeight: size.h,
          showDimensions,
          showCill,
          productType,
        })
      : null

  const label = title ?? `Opening ${Math.round(widthMm)} by ${Math.round(heightMm)} millimetres`

  return (
    <div ref={ref} className={cx('drawing-frame', className)}>
      {model ? (
        <svg viewBox={`0 0 ${model.viewWidth} ${model.viewHeight}`} role="img" aria-label={label}>
          <title>{label}</title>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f8fcfd" />
              <stop offset="48%" stopColor="#d7e6ec" />
              <stop offset="100%" stopColor="#b7ced6" />
            </linearGradient>
            <pattern id={oakId} width="7" height="7" patternUnits="userSpaceOnUse">
              <path d="M0 4 H7 M0 1 H7" stroke="#6b4120" strokeWidth="0.6" opacity="0.35" />
            </pattern>
            <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse">
              <path d="M0 7 L7 0" stroke="#a63d2f" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width={model.viewWidth} height={model.viewHeight} fill="#f6f4ef" />
          <Frame outer={model.outer} color={frameColor} patternId={finish === 'oak' ? oakId : undefined} />
          {model.panels.map((panel) => (
            <Panel key={panel.id} panel={panel} frameColor={frameColor} gradientId={gradientId} />
          ))}
          {model.gap ? (
            <rect
              x={model.gap.x}
              y={model.gap.y}
              width={model.gap.width}
              height={model.gap.height}
              fill={`url(#${hatchId})`}
              opacity={0.45}
            />
          ) : null}
          {model.mullions.map((mullion, index) => (
            <Mullion key={index} rect={mullion} color={frameColor} />
          ))}
          {model.cill ? (
            <g>
              <rect
                x={model.cill.x}
                y={model.cill.y}
                width={model.cill.width}
                height={model.cill.height}
                fill={frameColor}
                stroke="#243036"
                strokeWidth={1}
              />
              <line
                x1={model.outer.x}
                y1={model.cill.y}
                x2={model.outer.x + model.outer.width}
                y2={model.cill.y}
                stroke="#243036"
                strokeWidth={0.8}
              />
            </g>
          ) : null}
          {model.dimensions.map((dimension, index) => (
            <DimensionLine key={`${dimension.label}-${index}`} spec={dimension} />
          ))}
        </svg>
      ) : null}
    </div>
  )
}
