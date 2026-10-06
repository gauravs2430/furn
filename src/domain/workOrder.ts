import type { PanelKind, QuoteItem, WorkOrderData } from './models.ts'
import { findColour } from './catalogue.ts'
import { formatMm } from '../utils/money.ts'

function isSash(kind: PanelKind): boolean {
  return (
    kind === 'casement-left' ||
    kind === 'casement-right' ||
    kind === 'tilt-turn-left' ||
    kind === 'tilt-turn-right' ||
    kind === 'half-glazed'
  )
}

function glassDeduction(kind: PanelKind): { width: number; height: number } | null {
  if (kind === 'solid') return null
  if (isSash(kind)) return { width: 174, height: 238 }
  if (kind === 'sliding' || kind === 'bifold') return { width: 90, height: 180 }
  return { width: 37, height: 136 }
}

/**
 * Prototype cut-list. Deductions are calibrated so the reference
 * 1815 × 1130 casement/fixed/casement window matches the sample work order.
 * They are not a machining engine.
 */
export function buildWorkOrder(item: QuoteItem): WorkOrderData {
  const external = findColour(item.externalColourId)
  const internal = findColour(item.internalColourId)
  const location = item.location.trim() || 'Please Specify'
  const frameName =
    item.materialId === 'aluminium' ? 'Aluminium Frame' : item.materialId === 'timber' ? 'Timber Frame' : 'Frame 6 Chamber'

  const mainOptions = [
    { label: 'Colour (External)', value: `${external.name} [SP]` },
    { label: 'Colour (Internal)', value: `${internal.name} [SP]` },
    { label: 'Frame (Standard) (Top)', value: item.technical.frameProfile },
    { label: 'Frame (Standard) (Bottom)', value: item.technical.frameProfile },
    { label: 'Frame (Standard) (Left)', value: item.technical.frameProfile },
    { label: 'Frame (Standard) (Right)', value: item.technical.frameProfile },
    { label: 'Mullion', value: item.technical.mullion },
    { label: 'Cill', value: item.technical.cill },
    { label: 'Joint (Structural T/Z) (Mullion)', value: item.technical.joint },
    { label: 'Bead', value: item.technical.bead },
    { label: 'Sash Type', value: item.technical.sashType },
    { label: 'Locking (Casement)', value: item.technical.locking },
    { label: 'Handle (Casement)', value: item.technical.handle },
    { label: 'Hinge (Casement) (S/H)', value: item.technical.hinge },
    { label: 'Glass Display Group', value: item.technical.glassGroup },
    { label: 'Glazing Method', value: item.technical.glazingMethod },
    { label: 'Glass Type', value: item.technical.glassType },
    { label: 'Glass Gas Fill', value: item.technical.gasFill },
    { label: 'Component Type', value: item.technical.componentType },
    { label: 'Drainage', value: item.technical.drainage },
    { label: 'Location', value: location },
    { label: 'Horizontal Split Position', value: item.technical.horizontalSplit },
  ]

  const sections: WorkOrderData['sections'] = []
  const glass: WorkOrderData['glass'] = []
  let glassPerimeterMm = 0

  item.panels.forEach((panel, index) => {
    const deduction = glassDeduction(panel.kind)
    if (!deduction || item.technical.glassType === 'None') return
    const height = panel.kind === 'half-glazed' ? Math.round(item.heightMm * 0.42) : item.heightMm
    const width = Math.max(40, Math.round(panel.widthMm - deduction.width))
    const length = Math.max(40, Math.round(height - (panel.kind === 'half-glazed' ? 80 : deduction.height)))
    glassPerimeterMm += 2 * (width + length)
    glass.push({
      reference: `${String(index + 1).padStart(2, '0')} (Frame-01) ${item.technical.glassType} : Thermal Spacer Bar`,
      qty: item.quantity,
      width,
      length,
    })
    const opening = isSash(panel.kind)
    sections.push(
      {
        orientation: 'Vert',
        section: 'Bead',
        description: `${item.technical.bead} Bead`,
        qty: 2 * item.quantity,
        length: length + 10,
        endPrep: '[ - ]',
        reinforcing: '',
        reinforcingLength: '',
      },
      {
        orientation: 'Hor',
        section: 'Bead',
        description: `${item.technical.bead} Bead`,
        qty: 2 * item.quantity,
        length: width + (opening ? 10.5 : 10),
        endPrep: '[ - ]',
        reinforcing: '',
        reinforcingLength: '',
      },
    )
  })

  if (item.technical.cill !== 'None') {
    const cillLength = item.widthMm + 100
    sections.push({
      orientation: 'Hor',
      section: 'Cill',
      description: item.technical.cill.replace(/^GL-1-00150\s*/, ''),
      qty: item.quantity,
      length: cillLength,
      endPrep: '[ - ]',
      reinforcing: '35 x 15 Steel Reinforcement',
      reinforcingLength: formatMm(cillLength),
    })
  }

  const last = item.panels.length - 1
  item.panels.forEach((panel, index) => {
    const endPrep = last === 0 ? '[Y - Y]' : index === 0 ? '\\ - Y]' : index === last ? '[Y - /' : '[Y - Y]'
    sections.push({
      orientation: 'Hor',
      section: 'Frame',
      description: frameName,
      qty: 2 * item.quantity,
      length: panel.widthMm + 5,
      endPrep,
      reinforcing: '',
      reinforcingLength: '',
    })
  })

  sections.push({
    orientation: 'Vert',
    section: 'Frame',
    description: frameName,
    qty: 2 * item.quantity,
    length: item.heightMm - 25,
    endPrep: '\\ - /',
    reinforcing: '',
    reinforcingLength: '',
  })

  const sashPanels = item.panels.filter((panel) => isSash(panel.kind) && panel.kind !== 'half-glazed')
  if (sashPanels.length > 0) {
    const zLength = item.heightMm - 27
    sections.push({
      orientation: 'Hor',
      section: 'Frame',
      description: 'Casement Z Sash',
      qty: sashPanels.length * item.quantity,
      length: zLength,
      endPrep: '< - >',
      reinforcing: '13 x 29 Steel Reinforcement',
      reinforcingLength: formatMm(zLength - 139),
    })
    for (const panel of sashPanels) {
      const vert = item.heightMm - 105
      const hor = panel.widthMm - 40.5
      sections.push(
        {
          orientation: 'Vert',
          section: 'Sash',
          description: 'T Sash',
          qty: 2 * item.quantity,
          length: vert,
          endPrep: '\\ - /',
          reinforcing: '28 x 24 Steel Reinforcement',
          reinforcingLength: formatMm(vert - 163),
        },
        {
          orientation: 'Hor',
          section: 'Sash',
          description: 'T Sash',
          qty: 2 * item.quantity,
          length: hor,
          endPrep: '\\ - /',
          reinforcing: '28 x 24 Steel Reinforcement',
          reinforcingLength: formatMm(hor - 163),
        },
      )
    }
  }

  const accessories: WorkOrderData['accessories'] = []
  const casements = item.panels.filter((panel) => isSash(panel.kind) && panel.kind !== 'half-glazed')
  if (casements.length > 0) {
    accessories.push(
      { item: 'Mushroom Striker', qty: formatMm(casements.length * 2 * item.quantity), unit: 'Unit' },
      { item: 'Run Up Block', qty: formatMm(casements.length * item.quantity), unit: 'Unit' },
    )
  }
  if (glass.length > 0) {
    accessories.push(
      { item: 'Gasket 02', qty: (glassPerimeterMm / 1000).toFixed(3), unit: 'Metres' },
      { item: 'Glazing Bridge Packer', qty: formatMm(glass.length * 7 * item.quantity), unit: 'Unit' },
    )
  }
  const framePerimeter = 2 * (item.widthMm + item.heightMm)
  accessories.push({
    item: 'Gasket 01',
    qty: ((framePerimeter * 1.35 + item.panels.length * 420) / 1000).toFixed(3),
    unit: 'Metres',
  })
  if (casements.length > 0) {
    accessories.push(
      { item: item.technical.handle || 'Handle', qty: formatMm(casements.length * item.quantity), unit: 'Unit' },
      { item: '800mm Espagnolette', qty: formatMm(casements.length * item.quantity), unit: 'Unit' },
      { item: '16" Friction Hinge', qty: formatMm(casements.length * item.quantity), unit: 'Unit' },
    )
  } else if (item.panels.some((panel) => panel.kind === 'sliding' || panel.kind === 'bifold')) {
    accessories.push(
      { item: 'Roller set', qty: formatMm(item.panels.length * item.quantity), unit: 'Unit' },
      { item: item.technical.locking || 'Lock', qty: formatMm(item.quantity), unit: 'Unit' },
    )
  } else if (item.productType !== 'window' && item.productType !== 'accessory') {
    accessories.push(
      { item: item.technical.handle || 'Handle', qty: formatMm(item.quantity), unit: 'Unit' },
      { item: 'Hinge set', qty: formatMm(item.quantity), unit: 'Unit' },
    )
  }

  return { mainOptions, sections, accessories, glass }
}
