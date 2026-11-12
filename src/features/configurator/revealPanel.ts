/**
 * Opens "Sizes & panels", scrolls to the row for one cell of the drawing,
 * puts the cursor in its size box and briefly highlights the row.
 */
export function revealPanel(cellId: string) {
  const row = document.querySelector<HTMLElement>(`[data-cell-id="${CSS.escape(cellId)}"]`)
  if (!row) return
  const details = row.closest('details')
  if (details && !details.open) details.open = true
  requestAnimationFrame(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    row.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    row.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
    row.classList.add('is-flash')
    window.setTimeout(() => row.classList.remove('is-flash'), 1600)
  })
}
