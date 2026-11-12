import type { LayoutCell, LayoutSection, OpeningLayout, Panel, PanelKind, QuoteItem } from './models.ts'
import { createId } from '../utils/ids.ts'

/** Which way each opening type is handed, so a layout can be flipped left to right. */
const MIRRORED: Partial<Record<PanelKind, PanelKind>> = {
  'casement-left': 'casement-right',
  'casement-right': 'casement-left',
  'tilt-turn-left': 'tilt-turn-right',
  'tilt-turn-right': 'tilt-turn-left',
}

export function mirrorKind(kind: PanelKind): PanelKind {
  return MIRRORED[kind] ?? kind
}

/** Anything that is not glazed straight into the frame. */
export function isSashKind(kind: PanelKind): boolean {
  return kind !== 'fixed'
}

/* ── Building and reading layouts ─────────────────────────────────────── */

export function layoutFromPanels(panels: Panel[], heightMm: number): OpeningLayout {
  return {
    split: 'cols',
    sections: panels.map((panel) => ({
      id: panel.id,
      sizeMm: panel.widthMm,
      cells: [{ id: `${panel.id}-cell`, sizeMm: heightMm, kind: panel.kind }],
    })),
  }
}

function isLayout(value: unknown): value is OpeningLayout {
  if (!value || typeof value !== 'object') return false
  const layout = value as OpeningLayout
  return (
    (layout.split === 'cols' || layout.split === 'rows') &&
    Array.isArray(layout.sections) &&
    layout.sections.length > 0 &&
    layout.sections.every((section) => Array.isArray(section.cells) && section.cells.length > 0)
  )
}

/** The layout to draw and build from. Older quotes only have a single row of panels. */
export function layoutOf(item: Pick<QuoteItem, 'layout' | 'panels' | 'heightMm'>): OpeningLayout {
  if (isLayout(item.layout)) return item.layout
  return layoutFromPanels(item.panels ?? [], item.heightMm)
}

export function mainTotal(layout: OpeningLayout, widthMm: number, heightMm: number): number {
  return layout.split === 'cols' ? widthMm : heightMm
}

export function crossTotal(layout: OpeningLayout, widthMm: number, heightMm: number): number {
  return layout.split === 'cols' ? heightMm : widthMm
}

export function sizeTotal(items: { sizeMm: number }[]): number {
  return items.reduce((sum, entry) => sum + (Number.isFinite(entry.sizeMm) ? entry.sizeMm : 0), 0)
}

/** Every cell in reading order: column by column top to bottom, or row by row left to right. */
export function layoutCells(layout: OpeningLayout): LayoutCell[] {
  return layout.sections.flatMap((section) => section.cells)
}

export function layoutKinds(layout: OpeningLayout): PanelKind[] {
  return layoutCells(layout).map((cell) => cell.kind)
}

/* ── Sizes ─────────────────────────────────────────────────────────────── */

/** Whole-millimetre sizes in the same proportions that add up to `total`. */
export function distribute(sizes: number[], total: number): number[] {
  const safeTotal = Math.max(0, Math.round(total))
  if (sizes.length === 0) return []
  const weights = sizes.map((size) => (Number.isFinite(size) && size > 0 ? size : 0))
  const sum = weights.reduce((acc, size) => acc + size, 0)
  const shares = sum > 0 ? weights.map((size) => size / sum) : weights.map(() => 1 / sizes.length)
  const out = shares.map((share) => Math.round(share * safeTotal))
  const drift = safeTotal - out.reduce((acc, size) => acc + size, 0)
  out[out.length - 1] = (out[out.length - 1] ?? 0) + drift
  return out
}

/** Scales every column/row and every cell so the layout fits a new overall size. */
export function resizeLayout(layout: OpeningLayout, widthMm: number, heightMm: number): OpeningLayout {
  const mains = distribute(
    layout.sections.map((section) => section.sizeMm),
    mainTotal(layout, widthMm, heightMm),
  )
  const cross = crossTotal(layout, widthMm, heightMm)
  return {
    split: layout.split,
    sections: layout.sections.map((section, index) => {
      const cells = distribute(
        section.cells.map((cell) => cell.sizeMm),
        cross,
      )
      return {
        ...section,
        sizeMm: mains[index] ?? section.sizeMm,
        cells: section.cells.map((cell, cellIndex) => ({ ...cell, sizeMm: cells[cellIndex] ?? cell.sizeMm })),
      }
    }),
  }
}

/** Fresh ids so a copied layout never shares React keys or saved ids with its source. */
export function cloneLayout(layout: OpeningLayout): OpeningLayout {
  return {
    split: layout.split,
    sections: layout.sections.map((section) => ({
      id: createId(),
      sizeMm: section.sizeMm,
      cells: section.cells.map((cell) => ({ id: createId(), sizeMm: cell.sizeMm, kind: cell.kind })),
    })),
  }
}

/* ── Mirror and identity ──────────────────────────────────────────────── */

export function mirrorLayout(layout: OpeningLayout): OpeningLayout {
  if (layout.split === 'cols') {
    return {
      split: 'cols',
      sections: [...layout.sections].reverse().map((section) => ({
        ...section,
        cells: section.cells.map((cell) => ({ ...cell, kind: mirrorKind(cell.kind) })),
      })),
    }
  }
  return {
    split: 'rows',
    sections: layout.sections.map((section) => ({
      ...section,
      cells: [...section.cells].reverse().map((cell) => ({ ...cell, kind: mirrorKind(cell.kind) })),
    })),
  }
}

/**
 * The shape and opening types, ignoring sizes. A single row is the same whether it
 * is stored as columns of one cell or one row of cells, and likewise a single column.
 */
export function layoutSignature(layout: OpeningLayout): string {
  const single = layout.sections.length === 1
  const oneCellEach = layout.sections.every((section) => section.cells.length === 1)
  if (layout.split === 'cols' && oneCellEach) return `row:${layout.sections.map((s) => s.cells[0]?.kind).join('|')}`
  if (layout.split === 'rows' && single) return `row:${layout.sections[0]?.cells.map((c) => c.kind).join('|')}`
  if (layout.split === 'rows' && oneCellEach) return `col:${layout.sections.map((s) => s.cells[0]?.kind).join('|')}`
  if (layout.split === 'cols' && single) return `col:${layout.sections[0]?.cells.map((c) => c.kind).join('|')}`
  return `${layout.split}:${layout.sections.map((section) => section.cells.map((cell) => cell.kind).join('/')).join('|')}`
}

/** True when flipping gives a different window, so the Flip button is worth showing. */
export function canMirror(layout: OpeningLayout): boolean {
  return layoutSignature(mirrorLayout(layout)) !== layoutSignature(layout)
}

/* ── Positions in millimetres ─────────────────────────────────────────── */

export type Edge = 'frame' | 'bar'

export interface CellBox {
  id: string
  kind: PanelKind
  sectionIndex: number
  cellIndex: number
  x: number
  y: number
  width: number
  height: number
  edges: { left: Edge; right: Edge; top: Edge; bottom: Edge }
}

function offsets(sizes: number[], total: number): number[] {
  const sum = sizes.reduce((acc, size) => acc + Math.max(size, 0), 0)
  const scale = sum > 0 ? total / sum : 0
  const out: number[] = [0]
  let cursor = 0
  for (const size of sizes) {
    cursor += Math.max(size, 0) * scale
    out.push(cursor)
  }
  return out
}

/**
 * Every cell's rectangle inside the outer frame. Sizes that do not add up are
 * stretched to fit, so the drawing still works while the person is typing.
 */
export function cellBoxes(layout: OpeningLayout, widthMm: number, heightMm: number): CellBox[] {
  const main = mainTotal(layout, widthMm, heightMm)
  const cross = crossTotal(layout, widthMm, heightMm)
  const mainCuts = offsets(layout.sections.map((section) => section.sizeMm), main)
  const lastSection = layout.sections.length - 1
  const boxes: CellBox[] = []
  layout.sections.forEach((section, sectionIndex) => {
    const crossCuts = offsets(section.cells.map((cell) => cell.sizeMm), cross)
    const lastCell = section.cells.length - 1
    section.cells.forEach((cell, cellIndex) => {
      const a0 = mainCuts[sectionIndex] ?? 0
      const a1 = mainCuts[sectionIndex + 1] ?? main
      const b0 = crossCuts[cellIndex] ?? 0
      const b1 = crossCuts[cellIndex + 1] ?? cross
      const mainStart: Edge = sectionIndex === 0 ? 'frame' : 'bar'
      const mainEnd: Edge = sectionIndex === lastSection ? 'frame' : 'bar'
      const crossStart: Edge = cellIndex === 0 ? 'frame' : 'bar'
      const crossEnd: Edge = cellIndex === lastCell ? 'frame' : 'bar'
      boxes.push(
        layout.split === 'cols'
          ? {
              id: cell.id,
              kind: cell.kind,
              sectionIndex,
              cellIndex,
              x: a0,
              y: b0,
              width: a1 - a0,
              height: b1 - b0,
              edges: { left: mainStart, right: mainEnd, top: crossStart, bottom: crossEnd },
            }
          : {
              id: cell.id,
              kind: cell.kind,
              sectionIndex,
              cellIndex,
              x: b0,
              y: a0,
              width: b1 - b0,
              height: a1 - a0,
              edges: { left: crossStart, right: crossEnd, top: mainStart, bottom: mainEnd },
            },
      )
    })
  })
  return boxes
}

/* ── Mullions and transoms ────────────────────────────────────────────── */

export interface BarSegment {
  from: number
  to: number
  /** Z where a sash meets a fixed light, T where both sides are alike. */
  type: 'T' | 'Z'
}

export interface Bar {
  orientation: 'vert' | 'horiz'
  /** Centre line, in mm from the left (vertical bars) or top (horizontal bars). */
  pos: number
  start: number
  end: number
  startEdge: Edge
  endEdge: Edge
  /** Main bars divide sections and run frame to frame; sub bars divide cells inside a section. */
  level: 'main' | 'sub'
  segments: BarSegment[]
}

function barType(a: PanelKind | undefined, b: PanelKind | undefined): 'T' | 'Z' {
  const sashA = a ? isSashKind(a) : false
  const sashB = b ? isSashKind(b) : false
  return sashA === sashB ? 'T' : 'Z'
}

function kindAt(boxes: CellBox[], axis: 'x' | 'y', across: number, along: number): PanelKind | undefined {
  // `across` picks the cell on one side of a bar; `along` is a point on the bar.
  return boxes.find((box) =>
    axis === 'x'
      ? across > box.x && across < box.x + box.width && along > box.y && along < box.y + box.height
      : across > box.y && across < box.y + box.height && along > box.x && along < box.x + box.width,
  )?.kind
}

export function layoutBars(layout: OpeningLayout, widthMm: number, heightMm: number): Bar[] {
  const boxes = cellBoxes(layout, widthMm, heightMm)
  const bars: Bar[] = []
  const cols = layout.split === 'cols'

  // Main bars between sections, frame to frame.
  for (let index = 0; index < layout.sections.length - 1; index += 1) {
    const left = boxes.filter((box) => box.sectionIndex === index)
    const right = boxes.filter((box) => box.sectionIndex === index + 1)
    const sample = left[0]
    if (!sample) continue
    const pos = cols ? sample.x + sample.width : sample.y + sample.height
    const span = cols ? heightMm : widthMm
    const cuts = new Set<number>([0, span])
    for (const box of [...left, ...right]) {
      cuts.add(cols ? box.y : box.x)
      cuts.add(cols ? box.y + box.height : box.x + box.width)
    }
    const points = [...cuts].sort((a, b) => a - b)
    const segments: BarSegment[] = []
    for (let i = 0; i < points.length - 1; i += 1) {
      const from = points[i] ?? 0
      const to = points[i + 1] ?? span
      if (to - from < 0.5) continue
      const mid = (from + to) / 2
      const a = kindAt(boxes, cols ? 'x' : 'y', pos - 1, mid)
      const b = kindAt(boxes, cols ? 'x' : 'y', pos + 1, mid)
      const type = barType(a, b)
      const previous = segments[segments.length - 1]
      if (previous && previous.type === type) previous.to = to
      else segments.push({ from, to, type })
    }
    bars.push({
      orientation: cols ? 'vert' : 'horiz',
      pos,
      start: 0,
      end: span,
      startEdge: 'frame',
      endEdge: 'frame',
      level: 'main',
      segments,
    })
  }

  // Sub bars between cells inside one section.
  layout.sections.forEach((_section, sectionIndex) => {
    const cells = boxes.filter((box) => box.sectionIndex === sectionIndex)
    for (let index = 0; index < cells.length - 1; index += 1) {
      const a = cells[index]
      const b = cells[index + 1]
      if (!a || !b) continue
      const start = cols ? a.x : a.y
      const end = cols ? a.x + a.width : a.y + a.height
      bars.push({
        orientation: cols ? 'horiz' : 'vert',
        pos: cols ? a.y + a.height : a.x + a.width,
        start,
        end,
        startEdge: sectionIndex === 0 ? 'frame' : 'bar',
        endEdge: sectionIndex === layout.sections.length - 1 ? 'frame' : 'bar',
        level: 'sub',
        segments: [{ from: start, to: end, type: barType(a.kind, b.kind) }],
      })
    }
  })

  return bars
}

/* ── Keeping the item in step ─────────────────────────────────────────── */

/** One panel per cell, for pricing and anything that only needs kinds and counts. */
export function flatPanels(layout: OpeningLayout, widthMm: number, heightMm: number): Panel[] {
  return cellBoxes(layout, widthMm, heightMm).map((box) => ({
    id: box.id,
    widthMm: Math.round(box.width),
    kind: box.kind,
  }))
}

/** Ready-made cell lists for a single row, used by doors, patios and bi-folds. */
export function rowLayout(kinds: PanelKind[], widths: number[], heightMm: number): OpeningLayout {
  return {
    split: 'cols',
    sections: kinds.map((kind, index) => ({
      id: createId(),
      sizeMm: widths[index] ?? 0,
      cells: [{ id: createId(), sizeMm: heightMm, kind }],
    })),
  }
}

export function sectionLabel(layout: OpeningLayout): { section: string; sections: string; cell: string } {
  return layout.split === 'cols'
    ? { section: 'Column', sections: 'Column widths', cell: 'Height' }
    : { section: 'Row', sections: 'Row heights', cell: 'Width' }
}

export type { LayoutCell, LayoutSection, OpeningLayout }
