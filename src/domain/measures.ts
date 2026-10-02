export function calculateArea(widthMm: number, heightMm: number): number {
  return (widthMm * heightMm) / 1_000_000
}

export function calculatePerimeter(widthMm: number, heightMm: number): number {
  return (2 * (widthMm + heightMm)) / 1000
}
