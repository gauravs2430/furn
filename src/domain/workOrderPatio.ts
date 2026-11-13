import type { PanelKind, QuoteItem, SectionRow, WorkOrderData } from './models.ts'
import { findColour } from './catalogue.ts'
import { cellBoxes, layoutOf } from './layout.ts'
import { toughened } from '../data/technicalPresets.ts'
import { formatMm } from '../utils/money.ts'
import { grouped, metres } from './workOrderLayout.ts'

/*
 * Cut list for in-line sliding patio doors. Every pane is a sliding sash in the
 * sliding frame (fixed panes are sashes that do not move). The allowances were
 * read off the factory work orders for job 316 and reproduce their figures.
 */

export function isSlider(kind: PanelKind): boolean {
  return kind === 'slide-left' || kind === 'slide-right'
}

/**
 * Added to the overall width before it is shared between the sashes, by number of
 * panes: what the interlocks overlap less what the frame takes. Read off the sheets
 * for 2, 3 and 4 panes.
 */
const SASH_WIDTH_EXTRA: Record<number, number> = { 2: 14, 3: 9, 4: 101 }

export function usesPatioEngine(item: QuoteItem): boolean {
  if (item.productType !== 'patio') return false
  const layout = layoutOf(item)
  if (layout.split !== 'cols' || SASH_WIDTH_EXTRA[layout.sections.length] === undefined) return false
  const kinds = layout.sections.map((section) => (section.cells.length === 1 ? section.cells[0]?.kind : undefined))
  return kinds.some((kind) => kind !== undefined && isSlider(kind)) && kinds.every((kind) => kind === 'fixed' || (kind !== undefined && isSlider(kind)))
}

const FRAME_EXTRA = 5
const FRAME_REINFORCE_LESS = 111
const SASH_HEIGHT_LESS = 78
const SASH_REINFORCE_LESS = 185
const SASH_TO_BEAD = 135
const BEAD_TO_GLASS = 10
const GASKET_JOIN = 40
const FIXED_PANEL_SUPPORTS = 7
/** Glazing bridge packers: 8 for every pane, and 8 more for each sash that slides to the left. */
const GLAZING_PACKERS = { pane: 8, slidesLeft: 8 }
const BRIDGE_PACKERS = { fixed: 6, slider: 2 }
/**
 * Woolpile per pane: six runs across its width, and up its height four runs on a
 * fixed pane or eight on a sliding one, plus a fixed amount. Where two sliding sashes
 * meet (a centre pair) each loses one run and 151 mm.
 */
const WOOLPILE = { widthRuns: 6, fixedRuns: 4, fixedExtra: -30, sliderRuns: 8, sliderExtra: 68, meetingExtra: -151 }

/** Splits a total in tenths of a mm between panes in proportion, keeping the sum exact. */
function tenths(exact: number[], total: number): number[] {
  const floors = exact.map((value) => Math.floor(value * 10 + 1e-6))
  let left = Math.round(total * 10) - floors.reduce((sum, value) => sum + value, 0)
  const order = exact
    .map((value, index) => ({ index, frac: value * 10 - Math.floor(value * 10 + 1e-6) }))
    .sort((a, b) => b.frac - a.frac || b.index - a.index)
  for (const { index } of order) {
    if (left <= 0) break
    floors[index] = (floors[index] ?? 0) + 1
    left -= 1
  }
  return floors.map((value) => value / 10)
}

/** Rows of one kind merged, widest runs first, as the sheets list them. */
function byQty(rows: SectionRow[]): SectionRow[] {
  return grouped(rows).sort((a, b) => b.qty - a.qty || b.length - a.length)
}

export function buildPatioWorkOrder(item: QuoteItem): WorkOrderData {
  const qty = Math.max(1, item.quantity)
  const layout = layoutOf(item)
  const panes = cellBoxes(layout, item.widthMm, item.heightMm).sort((a, b) => a.x - b.x)
  const n = panes.length
  const extra = SASH_WIDTH_EXTRA[n] ?? 0
  const tech = item.technical
  const external = findColour(item.externalColourId)
  const internal = findColour(item.internalColourId)
  const glassType = toughened(tech.glassType)
  const bead = `${tech.bead} Bead`

  const exact = panes.map((pane) => pane.width + extra / n)
  const sashWidths = tenths(exact, item.widthMm + extra)
  const sashHeight = item.heightMm - SASH_HEIGHT_LESS
  const beadHeight = sashHeight - SASH_TO_BEAD

  const mainOptions: WorkOrderData['mainOptions'] = [
    { label: 'Colour (External)', value: `${external.name} [SP]` },
    { label: 'Colour (Internal)', value: `${internal.name} [SP]` },
    { label: 'Interlock', value: 'PVC Interlock' },
    { label: 'Cylinder', value: 'Brass Cylinder' },
    { label: 'Handle (Sliding Door)', value: external.name },
    { label: 'Glazing Method', value: tech.glazingMethod },
    { label: 'Glass Type', value: glassType },
    { label: 'Glass Gas Fill', value: tech.gasFill },
    { label: 'Drainage', value: tech.drainage },
    { label: 'Location', value: item.location.trim() || 'Please Specify' },
  ]

  const row = (orientation: 'Hor' | 'Vert', section: string, description: string, count: number, length: number, reinforcing = '', less = 0): SectionRow => ({
    orientation,
    section,
    description,
    qty: count * qty,
    length,
    endPrep: section === 'Bead' ? '[ - ]' : '\\ - /',
    reinforcing,
    reinforcingLength: reinforcing ? formatMm(length - less) : '',
  })

  const beadsUp: SectionRow[] = []
  const beadsAcross: SectionRow[] = []
  const sashUp: SectionRow[] = []
  const sashAcross: SectionRow[] = []
  const glass: WorkOrderData['glass'] = []
  let gasket02 = 0
  let woolpile = 0
  let glazingPackers = 0
  let bridgePackers = 0
  let fixedPanes = 0
  let sliders = 0

  panes.forEach((pane, index) => {
    const sashWidth = sashWidths[index] ?? 0
    const beadWidth = Math.round((sashWidth - SASH_TO_BEAD) * 10) / 10
    beadsUp.push(row('Vert', 'Bead', bead, 2, beadHeight))
    beadsAcross.push(row('Hor', 'Bead', bead, 2, beadWidth))
    sashUp.push(row('Vert', 'Sash', 'Sliding Sash', 2, sashHeight, '25 x 27 U Steel Reinforcement', SASH_REINFORCE_LESS))
    sashAcross.push(row('Hor', 'Sash', 'Sliding Sash', 2, sashWidth, '25 x 27 U Steel Reinforcement', SASH_REINFORCE_LESS))
    gasket02 += 2 * (beadWidth + beadHeight) - GASKET_JOIN
    glazingPackers += GLAZING_PACKERS.pane + (pane.kind === 'slide-left' ? GLAZING_PACKERS.slidesLeft : 0)

    const sliding = isSlider(pane.kind)
    const widthPart = WOOLPILE.widthRuns * (exact[index] ?? 0)
    if (sliding) {
      sliders += 1
      bridgePackers += BRIDGE_PACKERS.slider
      woolpile += widthPart + WOOLPILE.sliderRuns * sashHeight + WOOLPILE.sliderExtra
      const neighbours = [panes[index - 1], panes[index + 1]]
      if (neighbours.some((other) => other && isSlider(other.kind))) woolpile -= sashHeight - WOOLPILE.meetingExtra
    } else {
      fixedPanes += 1
      bridgePackers += BRIDGE_PACKERS.fixed
      woolpile += widthPart + WOOLPILE.fixedRuns * sashHeight + WOOLPILE.fixedExtra
    }

    if (glassType !== 'None') {
      glass.push({
        reference: `${String(glass.length + 1).padStart(2, '0')} (Frame-01) ${glassType} : Thermal Spacer Bar`,
        qty,
        width: Math.round((exact[index] ?? 0) - SASH_TO_BEAD - BEAD_TO_GLASS),
        length: Math.round(beadHeight - BEAD_TO_GLASS),
      })
    }
  })

  const frame = [
    row('Hor', 'Frame', 'Sliding Frame', 2, item.widthMm + FRAME_EXTRA, '44 x 12 Steel Reinforcement', FRAME_REINFORCE_LESS),
    row('Vert', 'Frame', 'Sliding Frame', 2, item.heightMm + FRAME_EXTRA, '44 x 12 Steel Reinforcement', FRAME_REINFORCE_LESS),
  ]
  const sections = [...grouped(beadsUp), ...byQty(beadsAcross), ...frame, ...grouped(sashUp), ...byQty(sashAcross)]

  const count = (value: number) => formatMm(value * qty)
  const stopper = { item: 'Panel Stopper', qty: count(sliders), unit: 'Unit' }
  const supports = { item: 'Fixed Panel Support', qty: count(FIXED_PANEL_SUPPORTS * fixedPanes), unit: 'Unit' }
  const glazing: WorkOrderData['accessories'] = [
    { item: 'Gasket 02', qty: metres(gasket02 * qty), unit: 'Metres' },
    { item: 'Bridge Packer', qty: count(bridgePackers), unit: 'Unit' },
    { item: 'Glazing Bridge Packer', qty: count(glazingPackers), unit: 'Unit' },
  ]
  const hardware: WorkOrderData['accessories'] = [
    { item: `${external.name} Patio Handle`, qty: count(sliders), unit: 'Unit' },
    { item: 'Brass Cylinder', qty: count(sliders), unit: 'Unit' },
    { item: 'Patio Lock & Keep Set', qty: count(sliders), unit: 'Unit' },
    { item: 'Ciilock Patio Roller', qty: count(2 * sliders), unit: 'None' },
    { item: 'Bottom Brush Block', qty: count(sliders), unit: 'Unit' },
    { item: 'Top Brush Block', qty: count(sliders), unit: 'Unit' },
  ]
  const wool = { item: 'Woolpile', qty: metres(woolpile * qty), unit: 'Metres' }
  // The sheets list the sliding hardware first when the left-hand pane is the one that slides.
  const accessories = isSlider(panes[0]?.kind ?? 'fixed')
    ? [wool, stopper, ...hardware, ...glazing, supports]
    : [wool, stopper, supports, ...glazing, ...hardware]

  return { mainOptions, sections, accessories, glass }
}
