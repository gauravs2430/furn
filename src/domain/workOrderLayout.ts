import type { OpeningLayout, PanelKind, QuoteItem, SectionRow, WorkOrderData } from './models.ts'
import { findColour } from './catalogue.ts'
import type { Bar, CellBox, Edge } from './layout.ts'
import { cellBoxes, layoutBars, layoutCells, layoutOf } from './layout.ts'
import { formatMm } from '../utils/money.ts'

/*
 * Cut list for windows made of fixed, side-hung and top-hung lights.
 * Every allowance below was read off the factory work orders for job 347
 * (37 pages, 28 layouts) and reproduces their figures.
 */

/** Kinds this engine knows. Anything else (tilt & turn, sliding, doors) uses the older builder. */
const SUPPORTED: PanelKind[] = ['fixed', 'casement-left', 'casement-right', 'top-hung']

export function usesLayoutEngine(item: QuoteItem): boolean {
  if (item.productType !== 'window') return false
  const cells = layoutCells(layoutOf(item))
  return cells.length > 0 && cells.every((cell) => SUPPORTED.includes(cell.kind))
}

// Allowances per side of a cell, by what that side meets.
const FIXED_BEAD = { frame: 48, bar: 13.5 }
const SASH = { frame: 37.5, bar: 3 }
const SASH_TO_BEAD = 123
const BEAD_TO_GLASS = 10
const SASH_REINFORCE = 163
const FRAME_EXTRA = 5
const BAR_END = { frame: 1.5, bar: 36 }
const SPLIT_PIECE_EXTRA = 4
const BAR_REINFORCE_FROM = 1050
const BAR_REINFORCE_LESS = 136
const GASKET_JOIN = 40
/** A cill takes this much off the bottom of the frame (reference sample, 1815 × 1130 with cill). */
const CILL_TAKES = 30

const ESPAG_STEP = 200
const ESPAG_CLEARANCE = 50
const HINGE_CLEARANCE = 135
const TOP_HUNG_HINGES = [10, 12, 16, 20, 24]
const SIDE_HUNG_HINGES = [12, 16, 20, 24]

const floorMm = (value: number) => Math.floor(value + 1e-6)

function across(box: CellBox, allowance: { frame: number; bar: number }) {
  const side = (edge: Edge) => allowance[edge]
  return {
    width: box.width - side(box.edges.left) - side(box.edges.right),
    height: box.height - side(box.edges.top) - side(box.edges.bottom),
  }
}

export function espagSize(dimension: number): number {
  return Math.max(ESPAG_STEP, Math.floor((dimension - ESPAG_CLEARANCE) / ESPAG_STEP) * ESPAG_STEP)
}

/** Largest friction hinge that fits, in inches, or null when none does. */
export function hingeSize(dimension: number, topHung: boolean): number | null {
  const room = (dimension - HINGE_CLEARANCE) / 25.4
  const sizes = topHung ? TOP_HUNG_HINGES : SIDE_HUNG_HINGES
  const fits = sizes.filter((size) => size <= room)
  return fits.length ? (fits[fits.length - 1] ?? null) : null
}

function metres(mm: number): string {
  return String(Number((mm / 1000).toFixed(3)))
}

function frameName(item: QuoteItem): string {
  return item.materialId === 'aluminium' ? 'Aluminium Frame' : item.materialId === 'timber' ? 'Timber Frame' : 'Frame 6 Chamber'
}

function endPrep(index: number, count: number, whole: string, first: string, last: string): string {
  if (count === 1) return whole
  if (index === 0) return first
  if (index === count - 1) return last
  return '[Y - Y]'
}

/** Pieces of one frame side, cut wherever a Z bar meets it. */
function frameSide(length: number, cuts: number[]): number[] {
  const points = [0, ...[...new Set(cuts)].filter((cut) => cut > 0.5 && cut < length - 0.5).sort((a, b) => a - b), length]
  return points.slice(1).map((point, index) => point - (points[index] ?? 0))
}

function frameCuts(bars: Bar[], widthMm: number, heightMm: number) {
  const cuts = { top: [] as number[], bottom: [] as number[], left: [] as number[], right: [] as number[] }
  for (const bar of bars) {
    const first = bar.segments[0]
    const last = bar.segments[bar.segments.length - 1]
    if (bar.startEdge === 'frame' && first?.type === 'Z') (bar.orientation === 'vert' ? cuts.top : cuts.left).push(bar.pos)
    if (bar.endEdge === 'frame' && last?.type === 'Z') (bar.orientation === 'vert' ? cuts.bottom : cuts.right).push(bar.pos)
  }
  return {
    top: frameSide(widthMm, cuts.top),
    bottom: frameSide(widthMm, cuts.bottom),
    left: frameSide(heightMm, cuts.left),
    right: frameSide(heightMm, cuts.right),
  }
}

/** Adds rows together when everything but the quantity matches, keeping first-seen order. */
function grouped(rows: SectionRow[]): SectionRow[] {
  const out: SectionRow[] = []
  for (const row of rows) {
    const same = out.find(
      (entry) =>
        entry.orientation === row.orientation &&
        entry.section === row.section &&
        entry.description === row.description &&
        entry.length === row.length &&
        entry.endPrep === row.endPrep &&
        entry.reinforcing === row.reinforcing &&
        entry.reinforcingLength === row.reinforcingLength,
    )
    if (same) same.qty += row.qty
    else out.push({ ...row })
  }
  return out
}

/** Takes the cill's share off the bottom lights only, so top lights keep their size. */
function shortenBottom(layout: OpeningLayout, mm: number): OpeningLayout {
  if (layout.split === 'rows') {
    const last = layout.sections.length - 1
    return { ...layout, sections: layout.sections.map((section, index) => (index === last ? { ...section, sizeMm: section.sizeMm - mm } : section)) }
  }
  return {
    ...layout,
    sections: layout.sections.map((section) => ({
      ...section,
      cells: section.cells.map((cell, index) => (index === section.cells.length - 1 ? { ...cell, sizeMm: cell.sizeMm - mm } : cell)),
    })),
  }
}

export function buildLayoutWorkOrder(item: QuoteItem): WorkOrderData {
  const qty = Math.max(1, item.quantity)
  const tech = item.technical
  const withCill = tech.cill !== 'None'
  const frameHeight = item.heightMm - (withCill ? CILL_TAKES : 0)
  const layout = withCill ? shortenBottom(layoutOf(item), CILL_TAKES) : layoutOf(item)
  const boxes = cellBoxes(layout, item.widthMm, frameHeight)
  const bars = layoutBars(layout, item.widthMm, frameHeight)
  const external = findColour(item.externalColourId)
  const internal = findColour(item.internalColourId)
  const bead = `${tech.bead} Bead`
  const glassed = tech.glassType !== 'None'

  const hasTransom = bars.some((bar) => bar.orientation === 'horiz')
  const hasMullion = bars.some((bar) => bar.orientation === 'vert')
  const sashBoxes = boxes.filter((box) => box.kind !== 'fixed')
  const sideHung = sashBoxes.some((box) => box.kind !== 'top-hung')
  const topHung = sashBoxes.some((box) => box.kind === 'top-hung')

  const mainOptions: WorkOrderData['mainOptions'] = [
    { label: 'Colour (External)', value: `${external.name} [SP]` },
    { label: 'Colour (Internal)', value: `${internal.name} [SP]` },
    { label: 'Frame (Standard) (Top)', value: tech.frameProfile },
    { label: 'Frame (Standard) (Bottom)', value: tech.frameProfile },
    { label: 'Frame (Standard) (Left)', value: tech.frameProfile },
    { label: 'Frame (Standard) (Right)', value: tech.frameProfile },
  ]
  if (hasTransom) mainOptions.push({ label: 'Transom', value: tech.mullion })
  if (hasMullion) mainOptions.push({ label: 'Mullion', value: tech.mullion })
  if (hasTransom) mainOptions.push({ label: 'Joint (Structural T/Z) (Transom)', value: tech.joint })
  if (hasMullion) mainOptions.push({ label: 'Joint (Structural T/Z) (Mullion)', value: tech.joint })
  if (tech.cill !== 'None') mainOptions.push({ label: 'Cill', value: tech.cill })
  mainOptions.push({ label: 'Bead', value: tech.bead })
  if (sashBoxes.length > 0) {
    mainOptions.push(
      { label: 'Sash Type', value: tech.sashType },
      { label: 'Locking (Casement)', value: tech.locking },
      { label: 'Handle (Casement)', value: tech.handle },
    )
    if (sideHung) mainOptions.push({ label: 'Hinge (Casement) (S/H)', value: tech.hinge })
    if (topHung) mainOptions.push({ label: 'Hinge (Casement) (T/H)', value: tech.hinge })
  }
  mainOptions.push(
    { label: 'Glass Display Group', value: tech.glassGroup },
    { label: 'Glazing Method', value: tech.glazingMethod },
    { label: 'Glass Type', value: tech.glassType },
    { label: 'Glass Gas Fill', value: tech.gasFill },
    { label: 'Component Type', value: tech.componentType },
    { label: 'Drainage', value: tech.drainage },
    { label: 'Location', value: item.location.trim() || 'Please Specify' },
  )
  if (hasMullion) mainOptions.push({ label: 'Horizontal Split Position', value: tech.horizontalSplit })
  if (hasTransom) mainOptions.push({ label: 'Vertical Split Position', value: tech.horizontalSplit })

  const beads: SectionRow[] = []
  const sashes: SectionRow[] = []
  const glass: WorkOrderData['glass'] = []
  let gasket02 = 0
  let gasket01 = 0
  let packers = 0
  const hardware = { strikers: 0, runUps: 0, handles: 0 }
  const espags = new Map<number, number>()
  const hinges = new Map<number, number>()

  for (const box of boxes) {
    const sash = box.kind !== 'fixed'
    let beadW: number
    let beadH: number
    if (sash) {
      const size = across(box, SASH)
      beadW = size.width - SASH_TO_BEAD
      beadH = size.height - SASH_TO_BEAD
      for (const [orientation, length] of [
        ['Hor', size.width],
        ['Vert', size.height],
      ] as const) {
        sashes.push({
          orientation,
          section: 'Sash',
          description: 'T Sash',
          qty: 2 * qty,
          length,
          endPrep: '\\ - /',
          reinforcing: '28 x 24 Steel Reinforcement',
          reinforcingLength: formatMm(length - SASH_REINFORCE),
        })
      }
      gasket01 += 4 * (size.width + size.height) - GASKET_JOIN
      packers += 8
      const top = box.kind === 'top-hung'
      // Top hung: the handle and espag run along the bottom, hinges up the sides. Side hung is the other way round.
      const espag = espagSize(top ? size.width : size.height)
      const hinge = hingeSize(top ? size.height : size.width, top)
      espags.set(espag, (espags.get(espag) ?? 0) + 1)
      if (hinge !== null) hinges.set(hinge, (hinges.get(hinge) ?? 0) + 1)
      hardware.strikers += espag >= 1000 ? 4 : 2
      hardware.runUps += top ? 2 : 1
      hardware.handles += 1
    } else {
      const size = across(box, FIXED_BEAD)
      beadW = size.width
      beadH = size.height
      packers += 5
    }
    beads.push(
      { orientation: 'Hor', section: 'Bead', description: bead, qty: 2 * qty, length: beadW, endPrep: '[ - ]', reinforcing: '', reinforcingLength: '' },
      { orientation: 'Vert', section: 'Bead', description: bead, qty: 2 * qty, length: beadH, endPrep: '[ - ]', reinforcing: '', reinforcingLength: '' },
    )
    gasket02 += 2 * (beadW + beadH) - GASKET_JOIN
    if (glassed) {
      glass.push({
        reference: `${String(glass.length + 1).padStart(2, '0')} (Frame-01) ${tech.glassType} : Thermal Spacer Bar`,
        qty,
        width: floorMm(beadW - BEAD_TO_GLASS),
        length: floorMm(beadH - BEAD_TO_GLASS),
      })
    }
  }

  // Outer frame, cut where a Z bar meets it.
  const frame: SectionRow[] = []
  const sides = frameCuts(bars, item.widthMm, frameHeight)
  const name = frameName(item)
  for (const [side, orientation] of [
    ['top', 'Hor'],
    ['bottom', 'Hor'],
    ['left', 'Vert'],
    ['right', 'Vert'],
  ] as const) {
    const pieces = sides[side]
    pieces.forEach((piece, index) => {
      frame.push({
        orientation,
        section: 'Frame',
        description: name,
        qty,
        length: piece + FRAME_EXTRA,
        endPrep: endPrep(index, pieces.length, '\\ - /', '\\ - Y]', '[Y - /'),
        reinforcing: '',
        reinforcingLength: '',
      })
    })
  }

  // Mullions and transoms. A bar that changes between Z and T is cut into pieces.
  const bars_: SectionRow[] = []
  for (const bar of bars) {
    const span = bar.end - bar.start
    const reinforced = span > BAR_REINFORCE_FROM
    const reinforcing = reinforced ? '13 x 29 Steel Reinforcement' : ''
    const reinforcingLength = reinforced ? formatMm(span - BAR_REINFORCE_LESS) : ''
    bar.segments.forEach((segment, index) => {
      const whole = bar.segments.length === 1
      bars_.push({
        orientation: 'Hor',
        section: 'Frame',
        description: `Chasement ${segment.type} Sash`,
        qty,
        length: whole ? span + BAR_END[bar.startEdge] + BAR_END[bar.endEdge] : segment.to - segment.from + SPLIT_PIECE_EXTRA,
        endPrep: endPrep(index, bar.segments.length, '< - >', '< - Y]', '[Y - >'),
        reinforcing,
        reinforcingLength,
      })
    })
  }

  const cill: SectionRow[] =
    tech.cill !== 'None'
      ? [
          {
            orientation: 'Hor',
            section: 'Cill',
            description: tech.cill.replace(/^GL-1-00150\s*/, ''),
            qty,
            length: item.widthMm + 100,
            endPrep: '[ - ]',
            reinforcing: '35 x 15 Steel Reinforcement',
            reinforcingLength: formatMm(item.widthMm + 100),
          },
        ]
      : []

  const sections = grouped([...beads, ...cill, ...frame, ...bars_, ...sashes])

  const accessories: WorkOrderData['accessories'] = []
  const count = (value: number) => formatMm(value * qty)
  if (sashBoxes.length > 0) {
    accessories.push(
      { item: 'Mushroom Striker', qty: count(hardware.strikers), unit: 'Unit' },
      { item: 'Run Up Block', qty: count(hardware.runUps), unit: 'Unit' },
    )
  }
  accessories.push(
    { item: 'Gasket 02', qty: metres(gasket02 * qty), unit: 'Metres' },
    { item: 'Glazing Bridge Packer', qty: count(packers), unit: 'Unit' },
  )
  if (sashBoxes.length > 0) {
    accessories.push(
      { item: 'Gasket 01', qty: metres(gasket01 * qty), unit: 'Metres' },
      { item: tech.handle && tech.handle !== 'None' ? tech.handle : 'White Inline Handle', qty: count(hardware.handles), unit: 'Unit' },
    )
    for (const [size, number] of [...espags].sort((a, b) => a[0] - b[0])) {
      accessories.push({ item: `${size}mm Espagnolette`, qty: count(number), unit: 'Unit' })
    }
    for (const [size, number] of [...hinges].sort((a, b) => a[0] - b[0])) {
      accessories.push({ item: `${size}” Friction Hinge`, qty: count(number), unit: 'Unit' })
    }
  }

  return { mainOptions, sections, accessories, glass }
}
