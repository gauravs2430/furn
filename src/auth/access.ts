export const passwordExpiredNotice = 'Your password has expired. Ask an admin to set a new one.'

const dayMs = 24 * 60 * 60 * 1000

export function localToday(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
