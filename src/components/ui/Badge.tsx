import type { QuoteStatus } from '../../domain/models.ts'
import { cx } from '../../utils/cx.ts'

const labels: Record<QuoteStatus, string> = {
  draft: 'Draft',
  quoted: 'Quoted',
  booked: 'Booked',
}

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return <span className={cx('badge', `badge-${status}`)}>{labels[status]}</span>
}
