import type { OpeningLayout, PanelKind, ProductTypeId } from './models.ts'
import { cellBoxes, layoutBars } from './layout.ts'

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
  | 'top-hung'
  | 'sliding'
  | 'bifold'
  | 'door-swing'

export interface DrawnPanel {
  id: string
  /** The layout cell this belongs to; both leaves of a French pair share one. */
  cellId: string
  kind: PanelKind
  module: Rect
  cell: Rect
  sash: Rect | null
  glass: Rect | null
  solid: Rect | null
  railY: number | null
  indicator: IndicatorKind | null
  handle: { x: number; y: number } | null
  /** Door lever handle (points towards the hinges) instead of a window handle. */
  lever?: 'left' | 'right'
  /** Flag hinges on the outer edge of a door leaf. */
  hinges?: { x: number; y: number }[]
}

export interface DrawModel {
  viewWidth: number
  viewHeight: number
  scale: number
  /** Drawn width of the outer frame, in pixels. */
  frameWidth: number
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
  layout: OpeningLayout
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

function insetRect(rect: Rect, amount: number): Rect {
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
    case 'top-hung':
      return 'top-hung'
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
  if (kind === 'top-hung') return { x: rect.x + rect.width / 2, y: rect.y + rect.height - Math.min(14, rect.height * 0.18) }
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

/**
 * A French pair drawn as two leaves that open out from the middle: each leaf is
 * hinged on its outer edge (three flag hinges) with a lever handle at the meeting
 * stiles, and the leaves meet without a mullion.
 */
function frenchLeaves(id: string, module: Rect, cell: Rect, sashPx: number): DrawnPanel[] {
  const meet = Math.max(1, sashPx * 0.12)
  const half = (cell.width - meet) / 2
  const leaves: { side: 'left' | 'right'; rect: Rect }[] = [
    { side: 'left', rect: { x: cell.x, y: cell.y, width: half, height: cell.height } },
    { side: 'right', rect: { x: cell.x + half + meet, y: cell.y, width: half, height: cell.height } },
  ]
  return leaves.map(({ side, rect }) => {
    const glass = insetRect(rect, sashPx)
    const hingeX = side === 'left' ? rect.x : rect.x + rect.width
    const handleX = side === 'left' ? glass.x + glass.width + (rect.x + rect.width - glass.x - glass.width) / 2 : rect.x + (glass.x - rect.x) / 2
    return {
      id: `${id}-${side}`,
      cellId: id,
      kind: side === 'left' ? 'casement-left' : 'casement-right',
      module,
      cell: rect,
      sash: rect,
      glass,
      solid: null,
      railY: null,
      indicator: side === 'left' ? 'casement-left' : 'casement-right',
      handle: { x: handleX, y: rect.y + rect.height * 0.5 },
      lever: side === 'left' ? 'left' : 'right',
      hinges: [0.12, 0.5, 0.88].map((share) => ({ x: hingeX, y: rect.y + rect.height * share })),
    }
  })
}

export function layoutDrawing(input: LayoutInput): DrawModel {
  const viewWidth = Math.max(input.viewportWidth, 40)
  const viewHeight = Math.max(input.viewportHeight, 40)
  const widthMm = Math.max(input.widthMm, 1)
  const heightMm = Math.max(input.heightMm, 1)
  const layout: OpeningLayout =
    input.layout.sections.length > 0
      ? input.layout
      : { split: 'cols', sections: [{ id: 'panel', sizeMm: widthMm, cells: [{ id: 'cell', sizeMm: heightMm, kind: 'fixed' }] }] }

  const boxes = cellBoxes(layout, widthMm, heightMm)
  const bars = layoutBars(layout, widthMm, heightMm)

  // Which runs of sizes get their own dimension lines, as on the factory drawings.
  const bottomSizes = bottomRun(layout, boxes)
  const sideSizes = sideRun(layout, boxes)

  const pad = input.showDimensions
    ? { top: 34, right: sideSizes ? 48 : 22, bottom: bottomSizes ? 48 : 36, left: 56 }
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
  const framePx = clamp(70 * scale, mini ? 3 : 7, mini ? 9 : 26)
  const mullionPx = clamp(56 * scale, mini ? 2.5 : 5, mini ? 7 : 18)
  const sashPx = clamp(66 * scale, mini ? 2 : 5, mini ? 6 : 24)
  const cillPx = input.showCill ? clamp(30 * scale, mini ? 3 : 5, mini ? 7 : 12) : 0
  const horn = input.showCill ? clamp(50 * scale, 4, 14) : 0

  // Millimetres to pixels. The cill sits over the bottom of the frame.
  const innerH = Math.max(outer.height - cillPx, 1)
  const px = (mm: number) => outer.x + (mm / widthMm) * outer.width
  const py = (mm: number) => outer.y + (mm / heightMm) * innerH
  const inset = (edge: 'frame' | 'bar') => (edge === 'frame' ? framePx : mullionPx / 2)

  const drawn: DrawnPanel[] = boxes.flatMap((box): DrawnPanel[] => {
    const module: Rect = {
      x: px(box.x),
      y: py(box.y),
      width: px(box.x + box.width) - px(box.x),
      height: py(box.y + box.height) - py(box.y),
    }
    const left = inset(box.edges.left)
    const right = inset(box.edges.right)
    const top = inset(box.edges.top)
    const bottom = inset(box.edges.bottom)
    const cell: Rect = {
      x: module.x + left,
      y: module.y + top,
      width: Math.max(1, module.width - left - right),
      height: Math.max(1, module.height - top - bottom),
    }
    const kind = box.kind
    const openingInset =
      kind === 'fixed' ? Math.min(2, cell.width / 5) : kind === 'sliding' || kind === 'bifold' ? sashPx * 0.72 : sashPx
    const glassRect = insetRect(cell, openingInset)
    const solidKind = kind === 'solid'
    const half = kind === 'half-glazed'
    let glass: Rect | null = solidKind ? null : glassRect
    let solid: Rect | null = solidKind ? insetRect(cell, Math.max(2, sashPx * 0.4)) : null
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
    if (kind === 'french-left' || kind === 'french-right') return frenchLeaves(box.id, module, cell, sashPx)
    const indicatorRect = glass ?? solid ?? cell
    return [
      {
        id: box.id,
        cellId: box.id,
        kind,
        module,
        cell,
        sash: kind === 'fixed' ? null : cell,
        glass,
        solid,
        railY,
        indicator: indicatorFor(kind),
        handle: handlePoint(indicatorRect, kind, input.productType),
      },
    ]
  })

  // Sub bars first so the frame-to-frame bars sit over their ends.
  const ordered = [...bars.filter((bar) => bar.level === 'sub'), ...bars.filter((bar) => bar.level === 'main')]
  const mullions: Rect[] = ordered.map((bar) => {
    const startInset = bar.startEdge === 'frame' ? framePx : mullionPx / 2
    const endInset = bar.endEdge === 'frame' ? framePx : mullionPx / 2
    if (bar.orientation === 'vert') {
      const y0 = py(bar.start) + startInset
      const y1 = py(bar.end) - endInset
      return { x: px(bar.pos) - mullionPx / 2, y: y0, width: mullionPx, height: Math.max(4, y1 - y0) }
    }
    const x0 = px(bar.start) + startInset
    const x1 = px(bar.end) - endInset
    return { x: x0, y: py(bar.pos) - mullionPx / 2, width: Math.max(4, x1 - x0), height: mullionPx }
  })

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
    for (const run of bottomSizes ?? []) {
      dimensions.push({
        x1: px(run.from),
        y1: outer.y + outer.height + 18,
        x2: px(run.to),
        y2: outer.y + outer.height + 18,
        label: `${Math.round(run.size)}`,
        orientation: 'h',
        extend: 'up',
      })
    }
    for (const run of sideSizes ?? []) {
      dimensions.push({
        x1: outer.x + outer.width + 20,
        y1: py(run.from),
        x2: outer.x + outer.width + 20,
        y2: py(run.to),
        label: `${Math.round(run.size)}`,
        orientation: 'v',
        extend: 'left',
      })
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
    gap: null,
    dimensions,
    frameWidth: framePx,
  }
}

interface SizeRun {
  from: number
  to: number
  size: number
}

/** Widths along the bottom: the columns, or the most divided row. */
function bottomRun(layout: OpeningLayout, boxes: ReturnType<typeof cellBoxes>): SizeRun[] | null {
  if (layout.split === 'cols') {
    if (layout.sections.length < 2) return null
    return layout.sections.map((section, index) => {
      const box = boxes.find((entry) => entry.sectionIndex === index)
      return { from: box?.x ?? 0, to: (box?.x ?? 0) + (box?.width ?? 0), size: section.sizeMm }
    })
  }
  const row = layout.sections.findIndex((section) => section.cells.length > 1)
  if (row < 0) return null
  return (layout.sections[row]?.cells ?? []).map((cell, index) => {
    const box = boxes.find((entry) => entry.sectionIndex === row && entry.cellIndex === index)
    return { from: box?.x ?? 0, to: (box?.x ?? 0) + (box?.width ?? 0), size: cell.sizeMm }
  })
}

/** Heights up the right side: the rows, or the first stacked column. */
function sideRun(layout: OpeningLayout, boxes: ReturnType<typeof cellBoxes>): SizeRun[] | null {
  if (layout.split === 'rows') {
    if (layout.sections.length < 2) return null
    return layout.sections.map((section, index) => {
      const box = boxes.find((entry) => entry.sectionIndex === index)
      return { from: box?.y ?? 0, to: (box?.y ?? 0) + (box?.height ?? 0), size: section.sizeMm }
    })
  }
  const column = layout.sections.findIndex((section) => section.cells.length > 1)
  if (column < 0) return null
  return (layout.sections[column]?.cells ?? []).map((cell, index) => {
    const box = boxes.find((entry) => entry.sectionIndex === column && entry.cellIndex === index)
    return { from: box?.y ?? 0, to: (box?.y ?? 0) + (box?.height ?? 0), size: cell.sizeMm }
  })
}
