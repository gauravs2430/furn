import type { PanelKind, ProductTypeId } from '../domain/models.ts'

export interface MaterialOption {
  id: string
  name: string
  factor: number
}

export interface GlazingOption {
  id: string
  name: string
  addonPerM2: number
  description: string
  glassType: string
  gasFill: string
}

export interface ColourOption {
  id: string
  name: string
  hex: string
  finish: 'solid' | 'oak'
}

export interface ProductDefinition {
  id: ProductTypeId
  name: string
  factor: number
  defaultWidth: number
  defaultHeight: number
  defaultPreset: string
  summary: string
}

export const materials: MaterialOption[] = [
  { id: 'upvc', name: 'uPVC', factor: 1 },
  { id: 'aluminium', name: 'Aluminium', factor: 1.8 },
  { id: 'timber', name: 'Timber', factor: 2.3 },
]

export const glazingOptions: GlazingOption[] = [
  {
    id: 'double',
    name: 'Double',
    addonPerM2: 0,
    description: '4-20-4 clear low-E, argon',
    glassType: '4-20-4 Clear Low E',
    gasFill: 'Argon',
  },
  {
    id: 'triple',
    name: 'Triple',
    addonPerM2: 45,
    description: '4-12-4-12-4 clear low-E, argon',
    glassType: '4-12-4-12-4 Clear Low E',
    gasFill: 'Argon',
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    addonPerM2: 60,
    description: 'Laminated acoustic unit',
    glassType: '6.8 Acoustic Laminate',
    gasFill: 'Air',
  },
]

export const colours: ColourOption[] = [
  { id: 'white', name: 'White', hex: '#F4F1EA', finish: 'solid' },
  { id: 'anthracite', name: 'Anthracite Grey', hex: '#3A4146', finish: 'solid' },
  { id: 'black', name: 'Black', hex: '#1C1C1C', finish: 'solid' },
  { id: 'oak', name: 'Woodgrain Oak', hex: '#A56E3C', finish: 'oak' },
  { id: 'cream', name: 'Cream', hex: '#E7DCC0', finish: 'solid' },
]

export const products: ProductDefinition[] = [
  {
    id: 'window',
    name: 'Window',
    factor: 1,
    defaultWidth: 1815,
    defaultHeight: 1130,
    defaultPreset: 'casement-fixed-casement',
    summary: 'Casement, fixed and sliding lights',
  },
  {
    id: 'door',
    name: 'Door',
    factor: 1.35,
    defaultWidth: 900,
    defaultHeight: 2100,
    defaultPreset: 'single-half',
    summary: 'Single leaf or French pair',
  },
  {
    id: 'patio',
    name: 'Patio Door',
    factor: 1.6,
    defaultWidth: 1600,
    defaultHeight: 1800,
    defaultPreset: 'patio-2-fixed-slider',
    summary: 'In-line sliding panels',
  },
  {
    id: 'bifold',
    name: 'Bi-fold Door',
    factor: 2.2,
    defaultWidth: 3000,
    defaultHeight: 2100,
    defaultPreset: 'bifold-3',
    summary: 'Folding door sets',
  },
]

export const supplyOptions = ['Supply & fit', 'Supply only'] as const

export const panelKindLabels: Record<PanelKind, string> = {
  fixed: 'Fixed',
  'casement-left': 'Side hung (left)',
  'casement-right': 'Side hung (right)',
  'tilt-turn-left': 'Tilt & turn left',
  'tilt-turn-right': 'Tilt & turn right',
  'top-hung': 'Top hung',
  'slide-left': 'Sliding (opens to the left)',
  'slide-right': 'Sliding (opens to the right)',
  'door-left': 'Door leaf (hinged left)',
  'door-right': 'Door leaf (hinged right)',
  'french-left': 'French pair (master left)',
  'french-right': 'French pair (master right)',
  sliding: 'Sliding',
  bifold: 'Bi-fold',
  solid: 'Solid',
  'half-glazed': 'Half glazed',
}

export function panelKindsFor(product: ProductTypeId, group?: string): PanelKind[] {
  if (group === 'french') return ['french-left', 'french-right', 'fixed']
  switch (product) {
    case 'door':
      return ['door-left', 'door-right', 'fixed', 'solid', 'half-glazed']
    case 'patio':
      return ['slide-left', 'slide-right', 'fixed']
    case 'bifold':
      return ['bifold', 'fixed']
    default:
      return [
        'fixed',
        'casement-left',
        'casement-right',
        'top-hung',
        'tilt-turn-left',
        'tilt-turn-right',
        'sliding',
      ]
  }
}

