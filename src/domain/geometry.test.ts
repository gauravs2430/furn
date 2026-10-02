import { describe, expect, it } from 'vitest'
import { drawingScale, layoutDrawing } from './geometry.ts'

describe('drawingScale', () => {
  it('uses the tighter of width and height so aspect ratio is preserved', () => {
    const tall = drawingScale(300, 270, 600, 2100)
    expect(tall).toBeCloseTo(270 / 2100)
    expect(600 * tall).toBeLessThan(300)

    const wide = drawingScale(300, 270, 5000, 2200)
    expect(wide).toBeCloseTo(300 / 5000)
    expect(2200 * wide).toBeLessThan(270)

    const square = drawingScale(400, 400, 1200, 1200)
    expect(square).toBeCloseTo(400 / 1200)
  })
})

describe('layoutDrawing', () => {
  it('keeps the reference window proportional and labels each panel', () => {
    const model = layoutDrawing({
      widthMm: 1815,
      heightMm: 1130,
      panels: [
        { id: 'a', widthMm: 600, kind: 'casement-left' },
        { id: 'b', widthMm: 615, kind: 'fixed' },
        { id: 'c', widthMm: 600, kind: 'casement-right' },
      ],
      viewportWidth: 640,
      viewportHeight: 420,
      showDimensions: true,
      showCill: true,
      productType: 'window',
    })

    expect(model.outer.width / model.outer.height).toBeCloseTo(1815 / 1130, 2)
    expect(model.panels).toHaveLength(3)
    expect(model.panels[0]?.indicator).toBe('casement-left')
    expect(model.panels[1]?.indicator).toBeNull()
    expect(model.panels[2]?.indicator).toBe('casement-right')
    expect(model.mullions).toHaveLength(2)
    expect(model.dimensions.map((line) => line.label)).toEqual(['1815', '1130', '600', '615', '600'])
    const panelWidth = model.panels.reduce((sum, panel) => sum + panel.module.width, 0)
    expect(panelWidth).toBeCloseTo(model.outer.width, 1)
  })

  it('stays inside the viewport for extreme aspect ratios', () => {
    for (const size of [
      [600, 2100],
      [1200, 1200],
      [1815, 1130],
      [3000, 1200],
      [5000, 2200],
    ] as const) {
      const model = layoutDrawing({
        widthMm: size[0],
        heightMm: size[1],
        panels: [{ id: 'a', widthMm: size[0], kind: 'fixed' }],
        viewportWidth: 480,
        viewportHeight: 320,
        showDimensions: true,
        showCill: false,
        productType: 'window',
      })
      expect(model.outer.x).toBeGreaterThanOrEqual(0)
      expect(model.outer.y).toBeGreaterThanOrEqual(0)
      expect(model.outer.x + model.outer.width).toBeLessThanOrEqual(model.viewWidth + 0.5)
      expect(model.outer.y + model.outer.height).toBeLessThanOrEqual(model.viewHeight + 0.5)
      expect(model.outer.width / model.outer.height).toBeCloseTo(size[0] / size[1], 2)
    }
  })
})
