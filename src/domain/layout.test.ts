import { describe, expect, it } from 'vitest'
import type { OpeningLayout } from './models.ts'
import {
  canMirror,
  cellBoxes,
  distribute,
  layoutBars,
  layoutFromPanels,
  layoutOf,
  layoutSignature,
  mirrorLayout,
  resizeLayout,
} from './layout.ts'
import { findPreset, matchPreset, presetLayout, presetsFor, tileFor } from '../data/technicalPresets.ts'
import { createQuoteItem, describeConfiguration, layoutForPreset, withLayout } from './factories.ts'
import { validateItem } from './validation.ts'

const topLightOverSash: OpeningLayout = {
  split: 'cols',
  sections: [
    {
      id: 'a',
      sizeMm: 700,
      cells: [
        { id: 'a1', sizeMm: 450, kind: 'top-hung' },
        { id: 'a2', sizeMm: 1150, kind: 'casement-left' },
      ],
    },
  ],
}

describe('layouts', () => {
  it('reads older quotes, which only had a row of panels', () => {
    const layout = layoutOf({ panels: [{ id: 'p', widthMm: 900, kind: 'fixed' }], heightMm: 1200 })
    expect(layout.split).toBe('cols')
    expect(layout.sections[0]?.cells[0]).toMatchObject({ sizeMm: 1200, kind: 'fixed' })
  })

  it('places cells and marks which sides meet the frame', () => {
    const boxes = cellBoxes(topLightOverSash, 700, 1600)
    expect(boxes.map((box) => [box.y, box.height])).toEqual([
      [0, 450],
      [450, 1150],
    ])
    expect(boxes[0]?.edges).toEqual({ left: 'frame', right: 'frame', top: 'frame', bottom: 'bar' })
  })

  it('uses a T bar between two sashes and a Z bar between a sash and a fixed light', () => {
    expect(layoutBars(topLightOverSash, 700, 1600)[0]?.segments.map((s) => s.type)).toEqual(['T'])
    const overFixed = { ...topLightOverSash, sections: [{ ...topLightOverSash.sections[0]!, cells: topLightOverSash.sections[0]!.cells.map((cell, i) => (i === 1 ? { ...cell, kind: 'fixed' as const } : cell)) }] }
    expect(layoutBars(overFixed, 700, 1600)[0]?.segments.map((s) => s.type)).toEqual(['Z'])
  })

  it('splits a mullion where the cells beside it change from fixed to sash', () => {
    const preset = findPreset('five-top-lights-top-hung-first')!
    const bars = layoutBars(presetLayout(preset), 1800, 1200).filter((bar) => bar.level === 'main')
    expect(bars[0]?.segments.map((segment) => segment.type)).toEqual(['T', 'Z'])
    expect(bars[1]?.segments.map((segment) => segment.type)).toEqual(['T'])
  })

  it('flips handing and order, and only offers Flip when it changes something', () => {
    const flipped = mirrorLayout(topLightOverSash)
    expect(flipped.sections[0]?.cells.map((cell) => cell.kind)).toEqual(['top-hung', 'casement-right'])
    expect(canMirror(topLightOverSash)).toBe(true)
    expect(canMirror(presetLayout(findPreset('casement-fixed-casement')!))).toBe(false)
  })

  it('treats a single row the same however it is stored', () => {
    const asColumns = layoutFromPanels(
      [
        { id: 'a', widthMm: 600, kind: 'fixed' },
        { id: 'b', widthMm: 600, kind: 'top-hung' },
      ],
      900,
    )
    const asRow: OpeningLayout = {
      split: 'rows',
      sections: [{ id: 'r', sizeMm: 900, cells: asColumns.sections.map((section) => ({ ...section.cells[0]!, sizeMm: section.sizeMm })) }],
    }
    expect(layoutSignature(asColumns)).toBe(layoutSignature(asRow))
  })

  it('keeps proportions and exact totals when resized', () => {
    expect(distribute([600, 615, 600], 1815)).toEqual([600, 615, 600])
    const resized = resizeLayout(topLightOverSash, 1400, 3200)
    expect(resized.sections[0]?.sizeMm).toBe(1400)
    expect(resized.sections[0]?.cells.map((cell) => cell.sizeMm)).toEqual([900, 2300])
  })
})

describe('window presets', () => {
  it('shows one tile per mirror pair and finds flipped twins', () => {
    const tiles = presetsFor('window')
    expect(tiles.some((preset) => preset.id === 'right-casement')).toBe(false)
    const flipped = mirrorLayout(presetLayout(findPreset('left-casement')!))
    expect(matchPreset(flipped)?.id).toBe('right-casement')
    expect(tileFor(matchPreset(flipped))?.id).toBe('left-casement')
  })

  it('builds valid openings for every window layout at its sample size', () => {
    for (const preset of presetsFor('window')) {
      const base = { ...createQuoteItem('window'), widthMm: preset.sample.width, heightMm: preset.sample.height }
      const item = withLayout(base, layoutForPreset(preset.id, preset.sample.width, preset.sample.height))
      expect(validateItem(item), preset.id).toEqual([])
      expect(describeConfiguration(item)).toBe(preset.label)
    }
  })

  it('builds valid French door openings for every French layout', () => {
    for (const preset of presetsFor('door', 'french')) {
      const base = { ...createQuoteItem('door'), widthMm: preset.sample.width, heightMm: preset.sample.height }
      const item = withLayout(base, layoutForPreset(preset.id, preset.sample.width, preset.sample.height))
      expect(validateItem(item), preset.id).toEqual([])
    }
    expect(presetsFor('door', 'french')).toHaveLength(9)
    expect(presetsFor('door').some((preset) => preset.group === 'french')).toBe(false)
  })

    it('flags parts that no longer add up', () => {
    const item = withLayout({ ...createQuoteItem('window'), widthMm: 700, heightMm: 1600 }, {
      ...topLightOverSash,
      sections: [{ ...topLightOverSash.sections[0]!, cells: topLightOverSash.sections[0]!.cells.map((cell) => ({ ...cell, sizeMm: 500 })) }],
    })
    expect(validateItem(item).some((issue) => issue.message.includes('parts total'))).toBe(true)
  })
})
