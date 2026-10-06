export const passwordExpiredNotice = 'Your password has expired. Ask an admin to set a new one.'

const dayMs = 24 * 60 * 60 * 1000

export function localToday(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/

export function isIsoDay(value: string): boolean {
  const match = isoDay.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** The calendar day after an ISO date, in local time. */
export function dayAfter(day: string): string {
  if (!isIsoDay(day)) return day
  const [year, month, date] = day.split('-').map(Number)
  return localToday(new Date(year, month - 1, date + 1))
}

/** A real calendar date strictly after today. */
export function isDateAfter(value: string, today: string): boolean {
  return isIsoDay(value) && isIsoDay(today) && value > today
}

/** Unlock must ask for a new date when the stored expiry is today or earlier. */
export function expiryOnOrBeforeToday(accessExpiresOn: string | null, today: string): boolean {
  if (!accessExpiresOn) return false
  return accessExpiresOn.slice(0, 10) <= today
}

/** Users are locked when the flag is set or the expiry date is before today. Admins are not. */
export function userAccessLocked(
  role: 'admin' | 'user',
  locked: boolean,
  accessExpiresOn: string | null,
  today: string,
): boolean {
  if (role === 'admin') return false
  if (locked) return true
  if (!accessExpiresOn) return false
  return accessExpiresOn.slice(0, 10) < today
}

/** Users are expired when password_set_at plus the configured days is before now. Admins are not. */
export function userPasswordExpired(
  role: 'admin' | 'user',
  passwordSetAt: string | null,
  maxAgeDays: number,
  now: Date,
): boolean {
  if (role === 'admin') return false
  if (!passwordSetAt) return true
  const setAt = Date.parse(passwordSetAt)
  if (Number.isNaN(setAt)) return true
  return setAt + maxAgeDays * dayMs < now.getTime()
}
