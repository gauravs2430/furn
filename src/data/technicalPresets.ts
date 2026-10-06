import type { PanelKind, ProductTypeId, TechnicalOptions } from '../domain/models.ts'
import { findGlazing, findMaterial } from '../domain/catalogue.ts'

export interface LayoutPreset {
  id: string
  label: string
  products: ProductTypeId[]
  panels: PanelKind[]
  /** Optional explicit millimetre widths used only for the reference window default. */
  sampleWidths?: number[]
}

export const layoutPresets: LayoutPreset[] = [
  { id: 'fixed', label: 'Fixed', products: ['window'], panels: ['fixed'] },
  { id: 'left-casement', label: 'Left Casement', products: ['window'], panels: ['casement-left'] },
  { id: 'right-casement', label: 'Right Casement', products: ['window'], panels: ['casement-right'] },
  { id: 'tilt-left', label: 'Tilt & Turn Left', products: ['window'], panels: ['tilt-turn-left'] },
  { id: 'tilt-right', label: 'Tilt & Turn Right', products: ['window'], panels: ['tilt-turn-right'] },
  {
    id: 'fixed-casement',
    label: 'Fixed + Casement',
    products: ['window'],
    panels: ['fixed', 'casement-right'],
  },
  {
    id: 'casement-fixed',
    label: 'Casement + Fixed',
    products: ['window'],
    panels: ['casement-left', 'fixed'],
  },
  {
    id: 'casement-fixed-casement',
    label: 'Casement + Fixed + Casement',
    products: ['window'],
    panels: ['casement-left', 'fixed', 'casement-right'],
    sampleWidths: [600, 615, 600],
  },
  {
    id: 'fixed-fixed-fixed',
    label: 'Fixed + Fixed + Fixed',
    products: ['window'],
    panels: ['fixed', 'fixed', 'fixed'],
  },
  { id: 'sliding-2', label: 'Sliding 2-panel', products: ['window', 'patio'], panels: ['sliding', 'sliding'] },
  {
    id: 'sliding-3',
    label: 'Sliding 3-panel',
    products: ['window', 'patio'],
    panels: ['sliding', 'fixed', 'sliding'],
  },
  { id: 'single-solid', label: 'Single solid', products: ['door'], panels: ['solid'] },
  { id: 'single-half', label: 'Single half glazed', products: ['door'], panels: ['half-glazed'] },
  {
    id: 'french',
    label: 'French pair',
    products: ['door'],
    panels: ['casement-left', 'casement-right'],
  },
  { id: 'bifold-3', label: '3-panel bi-fold', products: ['bifold'], panels: ['bifold', 'bifold', 'bifold'] },
  {
    id: 'bifold-4',
    label: '4-panel bi-fold',
    products: ['bifold'],
    panels: ['bifold', 'bifold', 'bifold', 'bifold'],
  },
]

export function presetsFor(product: ProductTypeId): LayoutPreset[] {
  return layoutPresets.filter((preset) => preset.products.includes(product))
}

export function findPreset(id: string): LayoutPreset | undefined {
  return layoutPresets.find((preset) => preset.id === id)
}

export function matchPreset(kinds: PanelKind[]): LayoutPreset | undefined {
  const signature = kinds.join('|')
  return layoutPresets.find((preset) => preset.panels.join('|') === signature)
}

const frameProfiles: Record<string, { frame: string; mullion: string }> = {
  upvc: {
    frame: 'SPQ-6-11252  68mm 6 Chamber',
    mullion: 'SPQ-05-20252/SPQ-005-30252 67mm',
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

function describeSash(kinds: PanelKind[]): string {
  const left = kinds.some((kind) => kind === 'casement-left' || kind === 'tilt-turn-left')
  const right = kinds.some((kind) => kind === 'casement-right' || kind === 'tilt-turn-right')
  if (kinds.every((kind) => kind === 'fixed')) return 'Fixed light'
  if (kinds.every((kind) => kind === 'solid')) return 'Solid door leaf'
  if (kinds.some((kind) => kind === 'half-glazed') && kinds.length === 1) return 'Half glazed door'
  if (kinds.some((kind) => kind.startsWith('tilt-turn'))) return 'Tilt and turn'
  if (left && right) return 'Casement left and right hung'
  if (left) return 'Casement left hung'
  if (right) return 'Casement right hung'
  if (kinds.some((kind) => kind === 'sliding')) return 'Sliding sash'
  if (kinds.some((kind) => kind === 'bifold')) return 'Bi-fold sash'
  return 'Mixed'
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

  return {
    frameProfile: profiles.frame,
    mullion: kinds.length > 1 ? profiles.mullion : 'None',
    cill: isWindow ? 'GL-1-00150 150mm' : 'None',
    joint: material.id === 'timber' ? 'Mechanical (Standard)' : 'Welded (Standard)',
    bead: glazing.id === 'triple' ? '36mm' : '28mm',
    sashType: describeSash(kinds),
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
