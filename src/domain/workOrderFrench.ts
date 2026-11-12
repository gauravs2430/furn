import type { PanelKind, QuoteItem, SectionRow, WorkOrderData } from './models.ts'
import { findColour } from './catalogue.ts'
import type { CellBox, Edge } from './layout.ts'
import { cellBoxes, gridBars, layoutCells, layoutOf } from './layout.ts'
import { toughened } from '../data/technicalPresets.ts'
import { formatMm } from '../utils/money.ts'
import { endPrep, frameCuts, frameName, grouped, metres } from './workOrderLayout.ts'

/*
 * Cut list for French doors with fixed side and top lights. The allowances were
 * read off the factory work orders for job 340 and reproduce their figures.
 */

function isFrench(kind: PanelKind): boolean {
  return kind === 'french-left' || kind === 'french-right'
}

export function usesFrenchEngine(item: QuoteItem): boolean {
  if (item.productType !== 'door') return false
  const cells = layoutCells(layoutOf(item))
  return cells.some((cell) => isFrench(cell.kind)) && cells.every((cell) => cell.kind === 'fixed' || isFrench(cell.kind))
}

// Fixed lights: bead allowance per side.
const FIXED_BEAD = { frame: 48, bar: 19 }
// Door leaves: sash allowance per side, and where the two leaves meet.
const LEAF = { frame: 37.5, bar: 8.5 }
const LEAF_MEET = 3.5
/** With a bar on one side only, the leaf beside the frame is this much wider than the other. */
const LEAF_OFFSET = 2
const LEAF_TO_BEAD = 175
const BEAD_TO_GLASS = 10
const LEAF_REINFORCE = 215
const GASKET_JOIN = 40
const FRAME_EXTRA = 5
/** Bar ends: a door transom/mullion (next to the leaves), and a T transom/mullion between fixed lights. */
const DOOR_BAR_END = { frame: 4.5, bar: 37.5 }
const T_BAR_END = { frame: 1.5, bar: 52.5 }
/** Pieces of a bar that changes type along its length. */
const DOOR_PIECE_EXTRA = 7
const T_PIECE_EXTRA = 17
const PAIR_BEFORE_LESS = 2
/** The French mullion is the leaf height less this, or 4 mm less when a transom is above. */
const FRENCH_MULLION_LESS = 87
const FRENCH_MULLION_UNDER_BAR = 4

const floorMm = (value: number) => Math.floor(value + 1e-6)

/** The two leaves of a French pair, as sash width and height. */
function leaves(box: CellBox): { left: number; right: number; height: number } {
  const side = (edge: Edge) => LEAF[edge]
  const total = box.width - side(box.edges.left) - side(box.edges.right) - LEAF_MEET * 2
  const half = total / 2
  const offset = box.edges.left === box.edges.right ? 0 : LEAF_OFFSET
  return {
    left: box.edges.left === 'frame' ? half + offset : half - offset,
    right: box.edges.right === 'frame' ? half + offset : half - offset,
    height: box.height - side(box.edges.top) - side(box.edges.bottom),
  }
}

export function buildFrenchWorkOrder(item: QuoteItem): WorkOrderData {
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
  const pairs = boxes.filter((box) => isFrench(box.kind))
  const masterLeft = pairs.every((box) => box.kind === 'french-left')

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
    { label: 'Cylinder', value: 'Brass Cylinder' },
    { label: 'Handle (Door)', value: tech.handle },
    { label: 'Hinge (Door)', value: tech.hinge },
    { label: 'Hinge Colour (Door)', value: `${external.name} ${tech.hinge}` },
    { label: 'Hinge Position (Door)', value: '3 Hinges' },
    { label: 'Lock (Door) (Double Door)', value: tech.locking },
    { label: 'Glazing Method', value: tech.glazingMethod },
    { label: 'Glass Type', value: glassType },
    { label: 'Glass Gas Fill', value: tech.gasFill },
    { label: 'Opening Direction', value: 'Open Out' },
    { label: 'Master Leaf', value: masterLeft ? 'Left' : 'Right' },
    { label: 'Component Type', value: tech.componentType },
    { label: 'Drainage', value: tech.drainage },
    { label: 'Location', value: item.location.trim() || 'Please Specify' },
    { label: 'Horizontal Split Position', value: tech.horizontalSplit },
  )
  if (hasTransom) mainOptions.push({ label: 'Vertical Split Position', value: 'By Dimensions' })

  const beads: SectionRow[] = []
  const sashes: SectionRow[] = []
  const glass: WorkOrderData['glass'] = []
  let gasket01 = 0
  let gasket02 = 0
  let packers = 0

  const addPane = (beadW: number, beadH: number, packer: number) => {
    beads.push(
      { orientation: 'Hor', section: 'Bead', description: bead, qty: 2 * qty, length: beadW, endPrep: '[ - ]', reinforcing: '', reinforcingLength: '' },
      { orientation: 'Vert', section: 'Bead', description: bead, qty: 2 * qty, length: beadH, endPrep: '[ - ]', reinforcing: '', reinforcingLength: '' },
    )
    gasket02 += 2 * (beadW + beadH) - GASKET_JOIN
    packers += packer
    if (glassType !== 'None') {
      glass.push({
        reference: `${String(glass.length + 1).padStart(2, '0')} (Frame-01) ${glassType} : Thermal Spacer Bar`,
        qty,
        width: floorMm(beadW - BEAD_TO_GLASS),
        length: floorMm(beadH - BEAD_TO_GLASS),
      })
    }
  }

  for (const box of boxes) {
    if (!isFrench(box.kind)) {
      const side = (edge: Edge) => FIXED_BEAD[edge]
      addPane(box.width - side(box.edges.left) - side(box.edges.right), box.height - side(box.edges.top) - side(box.edges.bottom), 5)
      continue
    }
    const pair = leaves(box)
    for (const width of [pair.left, pair.right]) {
      for (const [orientation, length] of [
        ['Vert', pair.height],
        ['Hor', width],
      ] as const) {
        sashes.push({
          orientation,
          section: 'Sash',
          description: 'Door Sash T',
          qty: 2 * qty,
          length,
          endPrep: '\\ - /',
          reinforcing: '28 x 44.5 U Steel Reinforcement',
          reinforcingLength: formatMm(length - LEAF_REINFORCE),
        })
      }
      gasket01 += 4 * (width + pair.height) - GASKET_JOIN
      addPane(width - LEAF_TO_BEAD, pair.height - LEAF_TO_BEAD, 8)
    }
    const mullion = pair.height - FRENCH_MULLION_LESS + (box.edges.top === 'bar' ? FRENCH_MULLION_UNDER_BAR : 0)
    sashes.push({
      orientation: 'Vert',
      section: 'Sash group',
      description: 'French Mullion',
      qty,
      length: mullion,
      endPrep: '[ - ]',
      reinforcing: '28 x 24 Steel Reinforcement',
      reinforcingLength: formatMm(mullion),
    })
  }

  // Outer frame, cut where a door bar meets it.
  const frame: SectionRow[] = []
  const sides = frameCuts(bars, item.widthMm, item.heightMm)
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

  /** True when the French pair is on the left of (or above) a bar; those pieces come out 2 mm shorter. */
  const pairBefore = (bar: (typeof bars)[number]) =>
    boxes.some(
      (box) =>
        isFrench(box.kind) &&
        (bar.orientation === 'vert' ? Math.abs(box.x + box.width - bar.pos) < 0.5 : Math.abs(box.y + box.height - bar.pos) < 0.5),
    )

  // Door transoms/mullions beside the leaves (shown without a description, as on the factory sheets),
  // and T transoms/mullions between fixed lights.
  const barRows: SectionRow[] = []
  for (const bar of bars) {
    const span = bar.end - bar.start
    bar.segments.forEach((segment, index) => {
      const door = segment.type === 'Z'
      const ends = door ? DOOR_BAR_END : T_BAR_END
      const whole = bar.segments.length === 1
      barRows.push({
        orientation: 'Hor',
        section: 'Frame',
        description: door ? '' : 'T Transom/Mullion',
        qty,
        length: whole
          ? span + ends[bar.startEdge] + ends[bar.endEdge]
          : segment.to - segment.from + (door ? DOOR_PIECE_EXTRA : T_PIECE_EXTRA) - (pairBefore(bar) ? PAIR_BEFORE_LESS : 0),
        endPrep: endPrep(index, bar.segments.length, '< - >', '[Y - >', '< - Y]'),
        reinforcing: '',
        reinforcingLength: '',
      })
    })
  }

  const sections = grouped([...beads, ...frame, ...barRows, ...sashes])
  const count = (value: number) => formatMm(value * qty)
  const n = pairs.length
  const accessories: WorkOrderData['accessories'] = [
    { item: 'Gasket 02', qty: metres(gasket02 * qty), unit: 'Metres' },
    { item: 'Glazing Bridge Packer', qty: count(packers), unit: 'Unit' },
    { item: 'French Door End Cap', qty: count(2 * n), unit: 'Unit' },
    { item: 'Run Up Block', qty: count(2 * n), unit: 'Unit' },
    { item: 'Gasket 01', qty: metres(gasket01 * qty), unit: 'Metres' },
    { item: tech.handle, qty: count(2 * n), unit: 'Unit' },
    { item: `${tech.hinge} ${external.name}`, qty: count(6 * n), unit: 'Unit' },
    { item: masterLeft ? 'L/H Keep Set' : 'R/H Keep Set', qty: count(n), unit: 'Unit' },
    { item: tech.locking, qty: count(n), unit: 'Unit' },
    { item: 'Brass Cylinder', qty: count(2 * n), unit: 'Unit' },
    { item: 'Double Shootbolt Keep Set', qty: count(n), unit: 'Unit' },
    { item: 'Standard Slave Door Lock', qty: count(n), unit: 'Unit' },
  ]

  return { mainOptions, sections, accessories, glass }
}
