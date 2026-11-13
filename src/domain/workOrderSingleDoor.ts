import type { PanelKind, QuoteItem, SectionRow, WorkOrderData } from './models.ts'
import { findColour } from './catalogue.ts'
import type { CellBox, Edge } from './layout.ts'
import { cellBoxes, gridBars, layoutCells, layoutOf } from './layout.ts'
import { toughened } from '../data/technicalPresets.ts'
import { formatMm } from '../utils/money.ts'
import { frameName, grouped, metres } from './workOrderLayout.ts'

/*
 * Cut list for a single glazed door leaf (opening in) with fixed side and top
 * lights. The allowances were read off the factory work orders for job 341
 * and reproduce their figures.
 */

export function isDoorLeaf(kind: PanelKind): boolean {
  return kind === 'door-left' || kind === 'door-right'
}

export function usesSingleDoorEngine(item: QuoteItem): boolean {
  if (item.productType !== 'door') return false
  const cells = layoutCells(layoutOf(item))
  return cells.filter((cell) => isDoorLeaf(cell.kind)).length === 1 && cells.every((cell) => cell.kind === 'fixed' || isDoorLeaf(cell.kind))
}

// Fixed lights: bead allowance per side.
const FIXED_BEAD = { frame: 48, bar: 19 }
// The door leaf: sash allowance per side.
const LEAF = { frame: 37.5, bar: 8.5 }
const LEAF_TO_BEAD = 175
const BEAD_TO_GLASS = 10
const LEAF_REINFORCE = 215
const GASKET_JOIN = 40
const FRAME_EXTRA = 5
/** T transom/mullion ends, by what each end meets. */
const BAR_END = { frame: 12.5, bar: 41.5 }
/** Bars this long or longer are reinforced, the steel being this much shorter. */
const BAR_REINFORCE_FROM = 1060
const BAR_REINFORCE_LESS = 161
const PACKERS = { fixed: 5, leaf: 8 }

const floorMm = (value: number) => Math.floor(value + 1e-6)

function inside(box: CellBox, allowance: { frame: number; bar: number }) {
  const side = (edge: Edge) => allowance[edge]
  return {
    width: box.width - side(box.edges.left) - side(box.edges.right),
    height: box.height - side(box.edges.top) - side(box.edges.bottom),
  }
}

export function buildSingleDoorWorkOrder(item: QuoteItem): WorkOrderData {
  const qty = Math.max(1, item.quantity)
  const layout = layoutOf(item)
  const boxes = cellBoxes(layout, item.widthMm, item.heightMm)
  const bars = gridBars(layout, item.widthMm, item.heightMm)
  const tech = item.technical
  const external = findColour(item.externalColourId)
  const internal = findColour(item.internalColourId)
  const glassType = toughened(tech.glassType)
  const bead = `${tech.bead} Bead`
  const hasTransom = bars.some((bar) => bar.orientation === 'horiz')
  const hasMullion = bars.some((bar) => bar.orientation === 'vert')
  const leaf = boxes.find((box) => isDoorLeaf(box.kind))
  const hingedLeft = leaf?.kind !== 'door-right'
  // With only mullions the sheets list uprights first; otherwise widths first.
  const upright = hasMullion && !hasTransom
  const pair = <T,>(hor: T, vert: T): T[] => (upright ? [vert, hor] : [hor, vert])

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
  mainOptions.push(
    { label: 'Bead', value: tech.bead },
    { label: 'Sash Type', value: hingedLeft ? 'Door left hung' : 'Door right hung' },
    { label: 'Cylinder', value: 'Brass Cylinder' },
    { label: 'Handle (Door)', value: tech.handle },
    { label: 'Hinge (Door)', value: tech.hinge },
    { label: 'Hinge Colour (Door)', value: `${external.name} ${tech.hinge}` },
    { label: 'Hinge Position (Door)', value: '3 Hinges' },
    { label: 'Lock (Door) (Single Door)', value: tech.locking },
    { label: 'Glazing Method', value: tech.glazingMethod },
    { label: 'Glass Type', value: glassType },
    { label: 'Glass Gas Fill', value: tech.gasFill },
    { label: 'Opening Direction', value: 'Open In' },
    { label: 'Component Type', value: tech.componentType },
    { label: 'Drainage', value: tech.drainage },
    { label: 'Location', value: item.location.trim() || 'Please Specify' },
  )
  if (hasMullion) mainOptions.push({ label: 'Horizontal Split Position', value: 'By Dimensions' })
  if (hasTransom) mainOptions.push({ label: 'Vertical Split Position', value: 'By Dimensions' })

  const beadRows = (width: number, height: number): SectionRow[] =>
    pair<SectionRow>(
      { orientation: 'Hor', section: 'Bead', description: bead, qty: 2 * qty, length: width, endPrep: '[ - ]', reinforcing: '', reinforcingLength: '' },
      { orientation: 'Vert', section: 'Bead', description: bead, qty: 2 * qty, length: height, endPrep: '[ - ]', reinforcing: '', reinforcingLength: '' },
    )

  // Glass in drawing order; beads for the fixed lights (each column from the bottom up), then the leaf.
  const glass: WorkOrderData['glass'] = []
  const beadOf = new Map<string, { width: number; height: number }>()
  let gasket02 = 0
  let packers = 0
  for (const box of boxes) {
    const size = isDoorLeaf(box.kind)
      ? (() => {
          const sash = inside(box, LEAF)
          return { width: sash.width - LEAF_TO_BEAD, height: sash.height - LEAF_TO_BEAD }
        })()
      : inside(box, FIXED_BEAD)
    beadOf.set(box.id, size)
    gasket02 += 2 * (size.width + size.height) - GASKET_JOIN
    packers += isDoorLeaf(box.kind) ? PACKERS.leaf : PACKERS.fixed
    if (glassType !== 'None') {
      glass.push({
        reference: `${String(glass.length + 1).padStart(2, '0')} (Frame-01) ${glassType} : Thermal Spacer Bar`,
        qty,
        width: floorMm(size.width - BEAD_TO_GLASS),
        length: floorMm(size.height - BEAD_TO_GLASS),
      })
    }
  }
  const fixedOrder = boxes
    .filter((box) => box.kind === 'fixed')
    .sort((a, b) => (layout.split === 'cols' ? a.x - b.x || b.y - a.y : a.y - b.y || a.x - b.x))
  const beads: SectionRow[] = []
  for (const box of [...fixedOrder, ...(leaf ? [leaf] : [])]) {
    const size = beadOf.get(box.id)
    if (size) beads.push(...beadRows(size.width, size.height))
  }

  // The outer frame is never cut: T bars sit inside it.
  const name = frameName(item)
  const frame: SectionRow[] = [
    ['Hor', item.widthMm],
    ['Hor', item.widthMm],
    ['Vert', item.heightMm],
    ['Vert', item.heightMm],
  ].map(([orientation, length]) => ({
    orientation: orientation as 'Hor' | 'Vert',
    section: 'Frame',
    description: name,
    qty,
    length: (length as number) + FRAME_EXTRA,
    endPrep: '\\ - /',
    reinforcing: '',
    reinforcingLength: '',
  }))

  const barRows: SectionRow[] = bars.map((bar) => {
    const length = bar.end - bar.start + BAR_END[bar.startEdge] + BAR_END[bar.endEdge]
    const steel = length >= BAR_REINFORCE_FROM
    return {
      orientation: 'Hor',
      section: 'Frame',
      description: 'T Transom/Mullion',
      qty,
      length,
      endPrep: '< - >',
      reinforcing: steel ? '26 x 26 U Steel Reinforcement' : '',
      reinforcingLength: steel ? formatMm(length - BAR_REINFORCE_LESS) : '',
    }
  })

  const sashes: SectionRow[] = []
  let gasket01 = 0
  if (leaf) {
    const sash = inside(leaf, LEAF)
    const row = (orientation: 'Hor' | 'Vert', length: number): SectionRow => ({
      orientation,
      section: 'Sash',
      description: 'Door Sash Z',
      qty: 2 * qty,
      length,
      endPrep: '\\ - /',
      reinforcing: '28 x 44.5 U Steel Reinforcement',
      reinforcingLength: formatMm(length - LEAF_REINFORCE),
    })
    sashes.push(...pair(row('Hor', sash.width), row('Vert', sash.height)))
    gasket01 = 4 * (sash.width + sash.height) - GASKET_JOIN
  }

  const sections = grouped([...beads, ...frame, ...barRows, ...sashes])
  const count = (value: number) => formatMm(value * qty)
  const glazing: WorkOrderData['accessories'] = [
    { item: 'Gasket 02', qty: metres(gasket02 * qty), unit: 'Metres' },
    { item: 'Glazing Bridge Packer', qty: count(packers), unit: 'Unit' },
  ]
  const door: WorkOrderData['accessories'] = [
    { item: 'Gasket 01', qty: metres(gasket01 * qty), unit: 'Metres' },
    { item: tech.handle, qty: count(1), unit: 'Unit' },
    { item: `${tech.hinge} ${external.name}`, qty: count(3), unit: 'Unit' },
    { item: hingedLeft ? 'L/H Keep Set' : 'R/H Keep Set', qty: count(1), unit: 'Unit' },
    { item: tech.locking, qty: count(1), unit: 'Unit' },
    { item: 'Brass Cylinder', qty: count(1), unit: 'Unit' },
  ]
  const runUp = { item: 'Run Up Block', qty: count(1), unit: 'Unit' }
  // A leaf on its own lists its glazing last; with side or top lights the glazing comes first.
  const accessories = bars.length ? [runUp, ...glazing, ...door] : [runUp, ...door, ...glazing]

  return { mainOptions, sections, accessories, glass }
}
