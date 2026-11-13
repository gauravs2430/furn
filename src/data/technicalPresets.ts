import type { OpeningLayout, PanelKind, ProductTypeId, TechnicalOptions } from '../domain/models.ts'
import { findGlazing, findMaterial } from '../domain/catalogue.ts'
import { layoutSignature, mirrorLayout } from '../domain/layout.ts'
import { createId } from '../utils/ids.ts'

type Cell = [kind: PanelKind, sizeMm: number]

interface PresetSection {
  /** Width of a column, or height of a row, at the sample size. */
  size: number
  cells: Cell[]
}

export interface LayoutPreset {
  id: string
  label: string
  products: ProductTypeId[]
  split: 'cols' | 'rows'
  sections: PresetSection[]
  /** The size the proportions come from (the factory sample where there is one). */
  sample: { width: number; height: number }
  /** Set on the flipped twin of a layout. It is reached with the Flip button, not its own tile. */
  mirrorOf?: string
  /**
   * Layouts for one kind of opening within a family, such as French doors among doors.
   * A product uses the group of its default layout; no group is the family's own list.
   */
  group?: string
  /** Kept so older quotes still find their name, but no longer offered as a tile. */
  hidden?: boolean
}

const F: PanelKind = 'fixed'
const TH: PanelKind = 'top-hung'
const SL: PanelKind = 'casement-left'
const SR: PanelKind = 'casement-right'

/** A single row of panels, as every layout was before stacked cells existed. */
function row(
  id: string,
  label: string,
  products: ProductTypeId[],
  kinds: PanelKind[],
  sample?: { widths: number[]; height: number },
  extra: Partial<LayoutPreset> = {},
): LayoutPreset {
  const widths = sample?.widths ?? kinds.map(() => 1000)
  const height = sample?.height ?? Math.round(widths.reduce((sum, width) => sum + width, 0) * 0.72)
  return {
    id,
    label,
    products,
    split: 'cols',
    sections: kinds.map((kind, index) => ({ size: widths[index] ?? 1000, cells: [[kind, height]] })),
    sample: { width: widths.reduce((sum, width) => sum + width, 0), height },
    ...extra,
  }
}

function cols(id: string, label: string, width: number, height: number, sections: PresetSection[]): LayoutPreset {
  return { id, label, products: ['window'], split: 'cols', sections, sample: { width, height } }
}

function rows(id: string, label: string, width: number, height: number, sections: PresetSection[]): LayoutPreset {
  return { id, label, products: ['window'], split: 'rows', sections, sample: { width, height } }
}

const W: ProductTypeId[] = ['window']

const FL: PanelKind = 'french-left'
const PL: PanelKind = 'slide-left'
const PR: PanelKind = 'slide-right'

/** Sliding patio layouts from the factory work orders, at the sizes printed on each sheet. */
function patioPresets(): LayoutPreset[] {
  const patio = (id: string, label: string, width: number, height: number, kinds: PanelKind[]): LayoutPreset => ({
    id,
    label,
    products: ['patio'],
    split: 'cols',
    sections: kinds.map((kind) => ({ size: width / kinds.length, cells: [[kind, height]] })),
    sample: { width, height },
  })
  return [
    patio('patio-2-fixed-slider', '2 Panels, right one slides', 1600, 1800, [F, PL]),
    patio('patio-2-slider-fixed', '2 Panels, left one slides', 2000, 1800, [PR, F]),
    patio('patio-3-middle-slides-left', '3 Panels, middle slides left', 2500, 1800, [F, PL, F]),
    patio('patio-3-middle-slides-right', '3 Panels, middle slides right', 3600, 2100, [F, PR, F]),
    patio('patio-3-right-slides', '3 Panels, right one slides', 2250, 1890, [F, F, PL]),
    patio('patio-3-left-slides', '3 Panels, left one slides', 2000, 1750, [PR, F, F]),
    patio('patio-4-middle-pair', '4 Panels, middle pair slides', 2700, 2100, [F, PL, PR, F]),
  ]
}

const DL: PanelKind = 'door-left'
const DR: PanelKind = 'door-right'

/** Single door layouts from the factory work orders; one per unique shape, Flip gives the rest. */
function singleDoorPresets(): LayoutPreset[] {
  const door = (id: string, label: string, width: number, height: number, sections: PresetSection[]): LayoutPreset => ({
    id,
    label,
    products: ['door'],
    split: 'cols',
    sections,
    sample: { width, height },
  })
  // Every drawing on the work order is its own tile (the "-flipped" ones are the other hand,
  // at the sizes printed on their sheets); Flip still moves between each pair.
  return [
    door('single-door', 'Single Door, hinged left', 1200, 2100, [{ size: 1200, cells: [[DL, 2100]] }]),
    door('single-door-flipped', 'Single Door, hinged right', 1000, 1900, [{ size: 1000, cells: [[DR, 1900]] }]),
    door('single-door-top-light', 'Top Light over Door, hinged left', 1000, 2000, [{ size: 1000, cells: [[F, 350], [DL, 1650]] }]),
    door('single-door-top-light-flipped', 'Top Light over Door, hinged right', 900, 1900, [{ size: 900, cells: [[F, 300], [DR, 1600]] }]),
    door('single-door-side-light', 'Door + Side Light', 1400, 2000, [
      { size: 1000, cells: [[DL, 2000]] },
      { size: 400, cells: [[F, 2000]] },
    ]),
    door('single-door-side-light-flipped', 'Side Light + Door', 1400, 2100, [
      { size: 400, cells: [[F, 2100]] },
      { size: 1000, cells: [[DR, 2100]] },
    ]),
    door('single-door-side-light-hinge-side', 'Door + Side Light, hinged beside it', 1400, 2000, [
      { size: 950, cells: [[DR, 2000]] },
      { size: 450, cells: [[F, 2000]] },
    ]),
    door('single-door-side-light-hinge-side-flipped', 'Side Light + Door, hinged beside it', 1500, 2100, [
      { size: 450, cells: [[F, 2100]] },
      { size: 1050, cells: [[DL, 2100]] },
    ]),
    door('single-door-side-light-top-lights', 'Door + Side Light, with Top Lights', 1400, 2100, [
      { size: 1000, cells: [[F, 400], [DL, 1700]] },
      { size: 400, cells: [[F, 400], [F, 1700]] },
    ]),
    door('single-door-side-light-top-lights-flipped', 'Side Light + Door, with Top Lights', 1400, 1900, [
      { size: 350, cells: [[F, 350], [F, 1550]] },
      { size: 1050, cells: [[F, 350], [DR, 1550]] },
    ]),
    door('single-door-side-light-top-lights-hinge-side', 'Door + Side Light, with Top Lights, hinged beside it', 1400, 2000, [
      { size: 1000, cells: [[F, 450], [DR, 1550]] },
      { size: 400, cells: [[F, 450], [F, 1550]] },
    ]),
    door('single-door-side-light-top-lights-hinge-side-flipped', 'Side Light + Door, with Top Lights, hinged beside it', 1300, 1900, [
      { size: 300, cells: [[F, 350], [F, 1550]] },
      { size: 1000, cells: [[F, 350], [DL, 1550]] },
    ]),
    door('single-door-two-side-lights', 'Door between Side Lights', 1800, 2100, [
      { size: 400, cells: [[F, 2100]] },
      { size: 1000, cells: [[DL, 2100]] },
      { size: 400, cells: [[F, 2100]] },
    ]),
    door('single-door-two-side-lights-top-lights', 'Door between Side Lights, with Top Lights, hinged left', 1900, 2100, [
      { size: 450, cells: [[F, 450], [F, 1650]] },
      { size: 1000, cells: [[F, 450], [DL, 1650]] },
      { size: 450, cells: [[F, 450], [F, 1650]] },
    ]),
    door('single-door-two-side-lights-top-lights-flipped', 'Door between Side Lights, with Top Lights, hinged right', 1800, 2000, [
      { size: 400, cells: [[F, 450], [F, 1550]] },
      { size: 1000, cells: [[F, 450], [DR, 1550]] },
      { size: 400, cells: [[F, 450], [F, 1550]] },
    ]),
  ]
}

/** French door layouts from the factory work orders for job 340; one per unique shape. */
function frenchDoorPresets(): LayoutPreset[] {
  const french = (
    id: string,
    label: string,
    split: 'cols' | 'rows',
    width: number,
    height: number,
    sections: PresetSection[],
  ): LayoutPreset => ({ id, label, products: ['door'], split, sections, sample: { width, height }, group: 'french' })
  return [
    french('french-door-pair', 'French Pair', 'cols', 1200, 1800, [{ size: 1200, cells: [[FL, 1800]] }]),
    french('french-door-top-light', 'Top Light over Pair', 'cols', 1400, 2000, [{ size: 1400, cells: [[F, 450], [FL, 1550]] }]),
    french('french-door-two-top-lights', '2 Top Lights over Pair', 'rows', 1400, 1900, [
      { size: 400, cells: [[F, 700], [F, 700]] },
      { size: 1500, cells: [[FL, 1400]] },
    ]),
    french('french-door-side-light', 'Side Light + Pair', 'cols', 2100, 1900, [
      { size: 400, cells: [[F, 1900]] },
      { size: 1700, cells: [[FL, 1900]] },
    ]),
    french('french-door-side-light-top-lights', 'Side Light + Pair, with Top Lights', 'cols', 1800, 2100, [
      { size: 350, cells: [[F, 400], [F, 1700]] },
      { size: 1450, cells: [[F, 400], [FL, 1700]] },
    ]),
    french('french-door-two-side-lights', 'Pair between Side Lights', 'cols', 1800, 2100, [
      { size: 300, cells: [[F, 2100]] },
      { size: 1200, cells: [[FL, 2100]] },
      { size: 300, cells: [[F, 2100]] },
    ]),
    french('french-door-two-side-lights-top-lights', 'Pair between Side Lights, with Top Lights', 'cols', 1800, 1900, [
      { size: 300, cells: [[F, 350], [F, 1550]] },
      { size: 1200, cells: [[F, 350], [FL, 1550]] },
      { size: 300, cells: [[F, 350], [F, 1550]] },
    ]),
    french('french-door-side-light-split-top-lights', 'Side Light + Pair, 3 Top Lights', 'rows', 1700, 2100, [
      { size: 350, cells: [[F, 400], [F, 650], [F, 650]] },
      { size: 1750, cells: [[F, 400], [FL, 1300]] },
    ]),
    french('french-door-four-top-lights', 'Pair between Side Lights, 4 Top Lights', 'rows', 1800, 2100, [
      { size: 300, cells: [[F, 300], [F, 600], [F, 600], [F, 300]] },
      { size: 1800, cells: [[F, 300], [FL, 1200], [F, 300]] },
    ]),
  ]
}

/**
 * Window layouts follow the factory work orders (job 347): sizes are the sample
 * sizes, and the side-hung symbol points at the hinge. Only one of each mirror
 * pair has a tile; the other is reached with Flip.
 */
const basePresets: LayoutPreset[] = [
  // Single lights
  row('fixed', 'Fixed', W, [F], { widths: [800], height: 1000 }),
  row('left-casement', 'Side Hung (left)', W, [SL], { widths: [700], height: 1200 }),
  row('right-casement', 'Side Hung (right)', W, [SR], { widths: [600], height: 1000 }, { mirrorOf: 'left-casement' }),
  row('top-hung', 'Top Hung', W, [TH], { widths: [900], height: 1000 }),
  row('tilt-left', 'Tilt & Turn (left)', W, ['tilt-turn-left']),
  row('tilt-right', 'Tilt & Turn (right)', W, ['tilt-turn-right'], undefined, { mirrorOf: 'tilt-left' }),

  // Side by side
  row('fixed-casement', 'Fixed + Side Hung', W, [F, SR]),
  row('casement-fixed', 'Side Hung + Fixed', W, [SL, F], { widths: [650, 650], height: 900 }, { mirrorOf: 'fixed-casement' }),
  row('top-hung-fixed', 'Top Hung + Fixed', W, [TH, F], { widths: [600, 600], height: 900 }),
  row('top-hung-pair', 'Top Hung Pair', W, [TH, TH], { widths: [600, 600], height: 900 }),
  row('casement-pair', 'Side Hung Pair', W, [SL, SR], { widths: [600, 600], height: 800 }),
  row('casement-fixed-casement', 'Side Hung + Fixed + Side Hung', W, [SL, F, SR], { widths: [600, 615, 600], height: 1130 }),
  row('fixed-fixed-fixed', 'Fixed + Fixed + Fixed', W, [F, F, F]),
  row('top-hung-fixed-fixed', 'Top Hung + Fixed + Fixed', W, [TH, F, F], { widths: [600, 450, 450], height: 1000 }),
  row('casement-fixed-fixed', 'Side Hung + Fixed + Fixed', W, [SL, F, F], { widths: [550, 400, 350], height: 1100 }),
  row('casement-pair-fixed', 'Side Hung Pair + Fixed', W, [SL, SR, F], { widths: [500, 500, 400], height: 1200 }),
  row('casement-pair-fixed-fixed', 'Side Hung Pair + Fixed + Fixed', W, [SL, SR, F, F], {
    widths: [400, 400, 350, 350],
    height: 1000,
  }),
  row('sliding-2', 'Sliding 2-panel', ['window'], ['sliding', 'sliding']),
  row('sliding-3', 'Sliding 3-panel', ['window'], ['sliding', 'fixed', 'sliding']),
  // Sliding patio doors (work orders for job 316): every drawing is its own tile.
  ...patioPresets(),

  // Top lights in a single column
  cols('fixed-over-fixed', 'Fixed Top Light over Fixed', 600, 1400, [{ size: 600, cells: [[F, 450], [F, 950]] }]),
  cols('top-hung-over-fixed', 'Top Hung over Fixed', 600, 1600, [{ size: 600, cells: [[TH, 450], [F, 1150]] }]),
  cols('casement-over-fixed', 'Side Hung Top Light over Fixed', 700, 1600, [{ size: 700, cells: [[SR, 400], [F, 1200]] }]),
  cols('top-hung-over-casement', 'Top Hung over Side Hung', 700, 1600, [{ size: 700, cells: [[TH, 450], [SL, 1150]] }]),

  // A row of top lights over one wide light
  rows('two-fixed-over-fixed', '2 Fixed Top Lights over Fixed', 1300, 1000, [
    { size: 600, cells: [[F, 750], [F, 550]] },
    { size: 400, cells: [[F, 1300]] },
  ]),
  rows('top-hung-fixed-over-fixed', 'Top Hung + Fixed over Fixed', 1200, 1100, [
    { size: 450, cells: [[TH, 600], [F, 600]] },
    { size: 650, cells: [[F, 1200]] },
  ]),
  rows('two-fixed-over-top-hung', '2 Fixed Top Lights over Top Hung', 1100, 1300, [
    { size: 450, cells: [[F, 550], [F, 550]] },
    { size: 850, cells: [[TH, 1100]] },
  ]),
  rows('casement-fixed-over-fixed', 'Side Hung + Fixed over Fixed', 1200, 1000, [
    { size: 450, cells: [[SL, 650], [F, 550]] },
    { size: 550, cells: [[F, 1200]] },
  ]),

  // Columns, some with top lights
  cols('top-hung-stack-tall-fixed', 'Top Hung over Fixed + Tall Fixed', 1200, 1400, [
    { size: 700, cells: [[TH, 600], [F, 800]] },
    { size: 500, cells: [[F, 1400]] },
  ]),
  cols('fixed-stack-tall-casement', 'Fixed over Fixed + Tall Side Hung', 1300, 1200, [
    { size: 650, cells: [[F, 450], [F, 750]] },
    { size: 650, cells: [[SR, 1200]] },
  ]),
  cols('fixed-top-hung-stack-fixed', 'Fixed + Top Hung over Fixed + Fixed', 1400, 1100, [
    { size: 500, cells: [[F, 1100]] },
    { size: 500, cells: [[TH, 500], [F, 600]] },
    { size: 400, cells: [[F, 1100]] },
  ]),
  cols('casement-top-hung-stack-casement', 'Side Hung + Top Hung over Fixed + Side Hung', 1500, 1200, [
    { size: 450, cells: [[SL, 1200]] },
    { size: 600, cells: [[TH, 350], [F, 850]] },
    { size: 450, cells: [[SR, 1200]] },
  ]),
  cols('casement-top-hung-pair-casement', 'Side Hung + Top Hung over Top Hung + Side Hung', 1500, 1200, [
    { size: 450, cells: [[SL, 1200]] },
    { size: 600, cells: [[TH, 450], [TH, 750]] },
    { size: 450, cells: [[SR, 1200]] },
  ]),
  cols('five-top-lights-top-hung-first', '5 Top Lights, Top Hung + 4 Fixed', 1800, 1200, [
    { size: 500, cells: [[F, 350], [TH, 850]] },
    { size: 300, cells: [[F, 350], [F, 850]] },
    { size: 300, cells: [[F, 350], [F, 850]] },
    { size: 300, cells: [[F, 350], [F, 850]] },
    { size: 400, cells: [[F, 350], [F, 850]] },
  ]),
  cols('five-top-lights-top-hung-second', '5 Top Lights, Top Hung in Column 2', 1800, 1300, [
    { size: 300, cells: [[F, 300], [F, 1000]] },
    { size: 600, cells: [[F, 300], [TH, 1000]] },
    { size: 300, cells: [[F, 300], [F, 1000]] },
    { size: 300, cells: [[F, 300], [F, 1000]] },
    { size: 300, cells: [[F, 300], [F, 1000]] },
  ]),
  cols('five-columns-mixed', '5 Columns with Opening Top Lights', 2000, 1200, [
    { size: 500, cells: [[TH, 450], [SL, 750]] },
    { size: 300, cells: [[F, 450], [F, 750]] },
    { size: 500, cells: [[TH, 450], [TH, 750]] },
    { size: 200, cells: [[F, 450], [F, 750]] },
    { size: 500, cells: [[TH, 450], [SR, 750]] },
  ]),

  // Doors and folding sets
  // Single doors (work orders for the single door sample job): one glazed leaf opening in.
  ...singleDoorPresets(),
  row('single-solid', 'Single solid', ['door'], ['solid'], { widths: [900], height: 2100 }),
  row('single-half', 'Single half glazed', ['door'], ['half-glazed'], { widths: [900], height: 2100 }),
  row('french', 'French pair', ['door'], ['casement-left', 'casement-right'], undefined, { hidden: true }),
  // French doors (job 340): one French pair cell draws both leaves; the master leaf is on the left.
  ...frenchDoorPresets(),

  row('bifold-3', '3-panel bi-fold', ['bifold'], ['bifold', 'bifold', 'bifold']),
  row('bifold-4', '4-panel bi-fold', ['bifold'], ['bifold', 'bifold', 'bifold', 'bifold']),
]

export function presetLayout(preset: LayoutPreset): OpeningLayout {
  return {
    split: preset.split,
    sections: preset.sections.map((section) => ({
      id: createId(),
      sizeMm: section.size,
      cells: section.cells.map(([kind, sizeMm]) => ({ id: createId(), sizeMm, kind })),
    })),
  }
}

/** Every layout that has a different flipped twin gets one, unless a named twin already exists. */
function withMirrors(list: LayoutPreset[]): LayoutPreset[] {
  const out = [...list]
  const signatures = new Set(list.map((preset) => layoutSignature(presetLayout(preset))))
  for (const preset of list) {
    if (preset.mirrorOf) continue
    const mirrored = mirrorLayout(presetLayout(preset))
    const signature = layoutSignature(mirrored)
    if (signatures.has(signature)) continue
    signatures.add(signature)
    out.push({
      ...preset,
      id: `${preset.id}-flipped`,
      label: `${preset.label} (flipped)`,
      split: mirrored.split,
      sections: mirrored.sections.map((section) => ({
        size: section.sizeMm,
        cells: section.cells.map((cell) => [cell.kind, cell.sizeMm] as Cell),
      })),
      mirrorOf: preset.id,
    })
  }
  return out
}

export const layoutPresets: LayoutPreset[] = withMirrors(basePresets)

const signatureOf = new Map(layoutPresets.map((preset) => [preset.id, layoutSignature(presetLayout(preset))]))

/** The layout group a product belongs to: the group of its default layout. */
export function groupOf(defaultPreset: string | undefined): string | undefined {
  return defaultPreset ? findPreset(defaultPreset)?.group : undefined
}

/** Tiles to offer for a product. Flipped twins are reached with the Flip button. */
export function presetsFor(product: ProductTypeId, group?: string): LayoutPreset[] {
  return layoutPresets.filter(
    (preset) => preset.products.includes(product) && !preset.mirrorOf && !preset.hidden && preset.group === group,
  )
}

/** Every tile of a family, all groups included, for choosing a product's default layout. */
export function allPresetsFor(product: ProductTypeId): LayoutPreset[] {
  return layoutPresets.filter((preset) => preset.products.includes(product) && !preset.mirrorOf && !preset.hidden)
}

export function findPreset(id: string): LayoutPreset | undefined {
  return layoutPresets.find((preset) => preset.id === id)
}

/** The named layout with this shape and these opening types, flipped twins included. */
export function matchPreset(layout: OpeningLayout, product: ProductTypeId = 'window', group?: string): LayoutPreset | undefined {
  const signature = layoutSignature(layout)
  const candidates = layoutPresets.filter((preset) => preset.products.includes(product) && signatureOf.get(preset.id) === signature)
  return candidates.find((preset) => preset.group === group) ?? candidates[0]
}

/** The tile that represents a layout: itself, or the twin it was flipped from. */
export function tileFor(preset: LayoutPreset | undefined): LayoutPreset | undefined {
  if (!preset?.mirrorOf) return preset
  return findPreset(preset.mirrorOf) ?? preset
}

const frameProfiles: Record<string, { frame: string; mullion: string; doorMullion?: string }> = {
  upvc: {
    frame: 'SPQ-6-11252  68mm 6 Chamber',
    mullion: 'SPQ-05-20252/SPQ-005-30252 67mm',
    // Door frames take the heavier transom/mullion (French and single door work orders).
    doorMullion: 'SPQ-5-30252 78mm',
  },
  aluminium: {
    frame: 'AL-58mm Thermal Break',
    mullion: 'AL-58mm Transom / Mullion',
  },
  timber: {
    frame: 'Softwood 68mm Section',
    mullion: 'Softwood 68mm Mullion',
  },
}

/**
 * Windows follow the factory work orders: the first opening sash in reading
 * order names the window, and top-hung sashes take the window's handing.
 */
function describeSash(kinds: PanelKind[], product: ProductTypeId): string {
  const left = kinds.some((kind) => kind === 'casement-left' || kind === 'tilt-turn-left')
  const right = kinds.some((kind) => kind === 'casement-right' || kind === 'tilt-turn-right')
  if (kinds.every((kind) => kind === 'fixed')) return 'Fixed light'
  if (kinds.every((kind) => kind === 'solid')) return 'Solid door leaf'
  if (kinds.some((kind) => kind === 'half-glazed') && kinds.length === 1) return 'Half glazed door'
  if (kinds.some((kind) => kind.startsWith('tilt-turn'))) return 'Tilt and turn'
  if (product === 'window') {
    const first = kinds.find((kind) => kind === 'top-hung' || kind === 'casement-left' || kind === 'casement-right')
    if (first === 'top-hung') return `Casement top hung ${right && !left ? 'right' : 'left'} hand`
    if (first === 'casement-left') return 'Casement left hung'
    if (first === 'casement-right') return 'Casement right hung'
  }
  if (left && right) return 'Casement left and right hung'
  if (left) return 'Casement left hung'
  if (right) return 'Casement right hung'
  if (kinds.some((kind) => kind === 'top-hung')) return 'Casement top hung left hand'
  if (kinds.some((kind) => kind === 'sliding')) return 'Sliding sash'
  if (kinds.some((kind) => kind === 'bifold')) return 'Bi-fold sash'
  return 'Mixed'
}

export function isFrenchKind(kind: PanelKind): boolean {
  return kind === 'french-left' || kind === 'french-right'
}

/** Doors need toughened safety glass: "4-20-4 Clear Low E" becomes "4-20-4 Clear Tuff Low E". */
export function toughened(glassType: string): string {
  if (/tuff|toughened/i.test(glassType) || glassType === 'None') return glassType
  return /clear/i.test(glassType) ? glassType.replace(/clear/i, (word) => `${word} Tuff`) : `${glassType} Tuff`
}

function isOpeningKind(kind: PanelKind): boolean {
  return kind !== 'fixed'
}

export function technicalDefaults(
  product: ProductTypeId,
  materialId: string,
  glazingId: string,
  kinds: PanelKind[],
): TechnicalOptions {
  const material = findMaterial(materialId)
  const glazing = findGlazing(glazingId)
  const profiles = frameProfiles[material.id] ?? frameProfiles.upvc
  const opening = kinds.some(isOpeningKind)
  const isWindow = product === 'window'
  const sliding = kinds.some((kind) => kind === 'sliding' || kind === 'bifold')
  const french = kinds.some(isFrenchKind)

  if (kinds.some((kind) => kind === 'slide-left' || kind === 'slide-right')) {
    // Sliding patios follow the factory work orders for job 316.
    return {
      frameProfile: 'Sliding Frame',
      mullion: 'None',
      cill: 'None',
      joint: material.id === 'timber' ? 'Mechanical (Standard)' : 'Welded (Standard)',
      bead: glazing.id === 'triple' ? '36mm' : '28mm',
      sashType: 'Sliding sash',
      locking: 'Patio Lock & Keep Set',
      handle: 'Patio Handle',
      hinge: 'None',
      glassGroup: 'Standard',
      glazingMethod: 'Glazed',
      glassType: toughened(glazing.glassType),
      gasFill: glazing.gasFill,
      componentType: 'Glass',
      drainage: 'Concealed Drainage',
      horizontalSplit: 'By Dimensions',
    }
  }

  const doorLeaf = kinds.find((kind) => kind === 'door-left' || kind === 'door-right')
  if (doorLeaf) {
    // Single doors follow the factory work orders for the single door sample job.
    return {
      frameProfile: profiles.frame,
      mullion: kinds.length > 1 ? (profiles.doorMullion ?? profiles.mullion) : 'None',
      cill: 'None',
      joint: material.id === 'timber' ? 'Mechanical (Standard)' : 'Welded (Standard)',
      bead: glazing.id === 'triple' ? '36mm' : '28mm',
      sashType: doorLeaf === 'door-left' ? 'Door left hung' : 'Door right hung',
      locking: 'Standard Door Lock',
      handle: 'White Handle Lever/Lever (Short Backplate)',
      hinge: 'Flag Hinge',
      glassGroup: 'Standard',
      glazingMethod: 'Glazed',
      glassType: toughened(glazing.glassType),
      gasFill: glazing.gasFill,
      componentType: 'Glass',
      drainage: 'Concealed Drainage',
      horizontalSplit: 'By Dimensions',
    }
  }

  if (french) {
    // French doors follow the factory work orders for job 340.
    return {
      frameProfile: profiles.frame,
      mullion: kinds.length > 1 ? (profiles.doorMullion ?? profiles.mullion) : 'None',
      cill: 'None',
      joint: material.id === 'timber' ? 'Mechanical (Standard)' : 'Welded (Standard)',
      bead: glazing.id === 'triple' ? '36mm' : '28mm',
      sashType: 'French door',
      locking: 'Standard Door Lock',
      handle: 'White Handle Lever/Lever (Short Backplate)',
      hinge: 'Flag Hinge',
      glassGroup: 'Standard',
      glazingMethod: 'Glazed',
      glassType: toughened(glazing.glassType),
      gasFill: glazing.gasFill,
      componentType: 'Glass',
      drainage: 'Concealed Drainage',
      horizontalSplit: 'Equal Split',
    }
  }

  return {
    frameProfile: profiles.frame,
    mullion: kinds.length > 1 ? profiles.mullion : 'None',
    cill: isWindow ? 'GL-1-00150 150mm' : 'None',
    joint: material.id === 'timber' ? 'Mechanical (Standard)' : 'Welded (Standard)',
    bead: glazing.id === 'triple' ? '36mm' : '28mm',
    sashType: describeSash(kinds, product),
    locking: !opening ? 'None' : sliding ? 'Sliding hook lock' : product === 'window' ? 'Espag Locking' : 'Multi-point lock',
    handle: !opening ? 'None' : product === 'window' ? 'White Inline Handle' : 'Lever handle',
    hinge: !opening || sliding ? 'None' : product === 'window' ? 'Standard' : 'Butt hinge',
    glassGroup: 'Standard',
    glazingMethod: kinds.every((kind) => kind === 'solid') ? 'Unglazed' : 'Glazed',
    glassType: kinds.every((kind) => kind === 'solid') ? 'None' : glazing.glassType,
    gasFill: kinds.every((kind) => kind === 'solid') ? 'None' : glazing.gasFill,
    componentType: 'Glass',
    drainage: 'Concealed Drainage',
    horizontalSplit: 'By Dimensions',
  }
}
