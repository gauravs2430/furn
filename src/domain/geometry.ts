import type { PanelKind, ProductTypeId } from './models.ts'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface DimensionSpec {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  orientation: 'h' | 'v'
  extend: 'up' | 'down' | 'left' | 'right'
}

export type IndicatorKind =
  | 'casement-left'
  | 'casement-right'
  | 'tilt-left'
  | 'tilt-right'
  | 'sliding'
  | 'bifold'
  | 'door-swing'

export interface DrawnPanel {
  id: string
  kind: PanelKind
  module: Rect
  cell: Rect
  sash: Rect | null
  glass: Rect | null
  solid: Rect | null
  railY: number | null
  indicator: IndicatorKind | null
  handle: { x: number; y: number } | null
}

export interface DrawModel {
  viewWidth: number
  viewHeight: number
  scale: number
  outer: Rect
  cill: Rect | null
  panels: DrawnPanel[]
  mullions: Rect[]
  gap: Rect | null
  dimensions: DimensionSpec[]
}

export interface LayoutInput {
  widthMm: number
  heightMm: number
  panels: { id: string; widthMm: number; kind: PanelKind }[]
  viewportWidth: number
  viewportHeight: number
  showDimensions: boolean
  showCill: boolean
  productType: ProductTypeId
}

export function drawingScale(
  availableWidth: number,
  availableHeight: number,
  widthMm: number,
  heightMm: number,
): number {
  const width = Math.max(widthMm, 1)
  const height = Math.max(heightMm, 1)
  return Math.min(Math.max(availableWidth, 1) / width, Math.max(availableHeight, 1) / height)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function inset(rect: Rect, amount: number): Rect {
  const next = amount * 2
  return {
    x: rect.x + amount,
    y: rect.y + amount,
    width: Math.max(1, rect.width - next),
    height: Math.max(1, rect.height - next),
  }
}

function indicatorFor(kind: PanelKind): IndicatorKind | null {
  switch (kind) {
    case 'casement-left':
      return 'casement-left'
    case 'casement-right':
      return 'casement-right'
    case 'tilt-turn-left':
      return 'tilt-left'
    case 'tilt-turn-right':
      return 'tilt-right'
    case 'sliding':
      return 'sliding'
    case 'bifold':
      return 'bifold'
    case 'solid':
    case 'half-glazed':
      return 'door-swing'
    default:
      return null
  }
}

function handlePoint(rect: Rect, kind: PanelKind, productType: ProductTypeId): { x: number; y: number } | null {
  if (kind === 'fixed') return null
  const onRight =
    kind === 'casement-left' ||
    kind === 'tilt-turn-left' ||
    kind === 'solid' ||
    kind === 'half-glazed' ||
    kind === 'sliding' ||
    kind === 'bifold'
  const tall = productType !== 'window'
  const y = rect.y + rect.height * (tall ? 0.62 : 0.5)
  const x = onRight ? rect.x + rect.width - Math.min(14, rect.width * 0.18) : rect.x + Math.min(14, rect.width * 0.18)
  return { x, y }
}

export function layoutDrawing(input: LayoutInput): DrawModel {
  const viewWidth = Math.max(input.viewportWidth, 40)
  const viewHeight = Math.max(input.viewportHeight, 40)
  const widthMm = Math.max(input.widthMm, 1)
  const heightMm = Math.max(input.heightMm, 1)
  const panels = input.panels.length > 0 ? input.panels : [{ id: 'panel', widthMm, kind: 'fixed' as const }]

  const pad = input.showDimensions
    ? { top: 34, right: 22, bottom: input.panels.length > 1 ? 48 : 36, left: 56 }
    : { top: 8, right: 10, bottom: 10, left: 10 }
  if (input.showCill) {
    pad.left += 6
    pad.right += 6
  }

  const availableWidth = Math.max(viewWidth - pad.left - pad.right, 12)
  const availableHeight = Math.max(viewHeight - pad.top - pad.bottom, 12)
  const scale = drawingScale(availableWidth, availableHeight, widthMm, heightMm)
  const drawW = widthMm * scale
  const drawH = heightMm * scale
  const outer: Rect = {
    x: pad.left + (availableWidth - drawW) / 2,
    y: pad.top + (availableHeight - drawH) / 2,
    width: drawW,
    height: drawH,
  }

  const mini = !input.showDimensions
  const framePx = clamp(70 * scale, mini ? 3 : 7, mini ? 9 : 20)
  const mullionPx = clamp(48 * scale, mini ? 2.5 : 5, mini ? 7 : 13)
  const sashPx = clamp(42 * scale, mini ? 2 : 4.5, mini ? 6 : 11)
  const cillPx = input.showCill ? clamp(30 * scale, mini ? 3 : 5, mini ? 7 : 12) : 0
  const horn = input.showCill ? clamp(50 * scale, 4, 14) : 0

  const sum = panels.reduce((total, panel) => total + Math.max(panel.widthMm, 0), 0)
  const denom = Math.max(widthMm, sum, 1)
  let cursorMm = 0
  const modules = panels.map((panel) => {
    const start = cursorMm / denom
    const width = Math.max(panel.widthMm, 0)
    cursorMm += width
    const end = cursorMm / denom
    const module: Rect = {
      x: outer.x + start * outer.width,
      y: outer.y,
      width: Math.max((end - start) * outer.width, 0),
      height: outer.height,
    }
    return { panel, module }
  })

  const mullions: Rect[] = []
  for (let index = 0; index < modules.length - 1; index += 1) {
    const current = modules[index]
    if (!current) continue
    const boundary = current.module.x + current.module.width
    mullions.push({
      x: boundary - mullionPx / 2,
      y: outer.y + framePx,
      width: mullionPx,
      height: Math.max(4, outer.height - framePx * 2 - cillPx),
    })
  }

  const drawn: DrawnPanel[] = modules.map(({ panel, module }, index) => {
    const last = index === modules.length - 1
    const leftInset = index === 0 ? framePx : mullionPx / 2
    const rightInset = last ? framePx : mullionPx / 2
    const cell: Rect = {
      x: module.x + leftInset,
      y: module.y + framePx,
      width: Math.max(1, module.width - leftInset - rightInset),
      height: Math.max(1, module.height - framePx * 2 - cillPx),
    }
    const openingInset = panel.kind === 'fixed' ? Math.min(2, cell.width / 5) : panel.kind === 'sliding' || panel.kind === 'bifold' ? sashPx * 0.72 : sashPx
    const glassRect = inset(cell, openingInset)
    const solidKind = panel.kind === 'solid'
    const half = panel.kind === 'half-glazed'
    let glass: Rect | null = solidKind ? null : glassRect
    let solid: Rect | null = solidKind ? inset(cell, Math.max(2, sashPx * 0.4)) : null
    let railY: number | null = null
    if (half && glass) {
      railY = cell.y + cell.height * 0.46
      glass = {
        x: glass.x,
        y: glass.y,
        width: glass.width,
        height: Math.max(1, railY - glass.y - sashPx * 0.35),
      }
      solid = {
        x: cell.x + openingInset,
        y: railY + sashPx * 0.35,
        width: Math.max(1, cell.width - openingInset * 2),
        height: Math.max(1, cell.y + cell.height - openingInset - (railY + sashPx * 0.35)),
      }
    }
    const indicatorRect = glass ?? solid ?? cell
    return {
      id: panel.id,
      kind: panel.kind,
      module,
      cell,
      sash: panel.kind === 'fixed' ? null : cell,
      glass,
      solid,
      railY,
      indicator: indicatorFor(panel.kind),
      handle: handlePoint(indicatorRect, panel.kind, input.productType),
    }
  })

  let gap: Rect | null = null
  if (sum < widthMm - 0.5 && denom === widthMm) {
    const start = sum / widthMm
    const x = outer.x + start * outer.width
    gap = {
      x: x + (modules.length === 0 ? framePx : mullionPx / 2),
      y: outer.y + framePx,
      width: Math.max(0, outer.x + outer.width - framePx - x),
      height: Math.max(1, outer.height - framePx * 2 - cillPx),
    }
    if (gap.width < 2) gap = null
  }

  const cill: Rect | null = input.showCill
    ? {
        x: outer.x - horn,
        y: outer.y + outer.height - cillPx,
        width: outer.width + horn * 2,
        height: cillPx + 1.5,
      }
    : null

  const dimensions: DimensionSpec[] = []
  if (input.showDimensions) {
    dimensions.push({
      x1: outer.x,
      y1: outer.y - 16,
      x2: outer.x + outer.width,
      y2: outer.y - 16,
      label: `${Math.round(widthMm)}`,
      orientation: 'h',
      extend: 'down',
    })
    dimensions.push({
      x1: outer.x - 18,
      y1: outer.y,
      x2: outer.x - 18,
      y2: outer.y + outer.height,
      label: `${Math.round(heightMm)}`,
      orientation: 'v',
      extend: 'right',
    })
    if (panels.length > 1) {
      for (const entry of modules) {
        dimensions.push({
          x1: entry.module.x,
          y1: outer.y + outer.height + 18,
          x2: entry.module.x + entry.module.width,
          y2: outer.y + outer.height + 18,
          label: `${Math.round(entry.panel.widthMm)}`,
          orientation: 'h',
          extend: 'up',
        })
      }
    }
  }

  return {
    viewWidth,
    viewHeight,
    scale,
    outer,
    cill,
    panels: drawn,
    mullions,
    gap,
    dimensions,
  }
}
