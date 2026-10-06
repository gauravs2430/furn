import { describe, expect, it } from 'vitest'
import { dayAfter, expiryOnOrBeforeToday, isDateAfter, userAccessLocked, userPasswordExpired } from './access.ts'

const now = new Date('2026-10-07T12:00:00.000Z')
const today = '2026-10-07'

describe('user access lock', () => {
  it('locks a user whose expiry is before today', () => {
    expect(userAccessLocked('user', false, '2026-10-06', today)).toBe(true)
  })

  it('keeps a user whose expiry is today', () => {
    expect(userAccessLocked('user', false, '2026-10-07', today)).toBe(false)
  })

  it('locks a user when the locked flag is set', () => {
    expect(userAccessLocked('user', true, '2026-12-01', today)).toBe(true)
  })

  it('leaves a user with no expiry unlocked', () => {
    expect(userAccessLocked('user', false, null, today)).toBe(false)
  })

  it('does not lock an admin with the same expiry or flag', () => {
    expect(userAccessLocked('admin', true, '2026-10-06', today)).toBe(false)
  })
})

describe('unlock date', () => {
  it('asks for a new date when the expiry is today or earlier', () => {
    expect(expiryOnOrBeforeToday('2026-10-07', today)).toBe(true)
    expect(expiryOnOrBeforeToday('2026-10-06', today)).toBe(true)
    expect(expiryOnOrBeforeToday('2026-10-08', today)).toBe(false)
    expect(expiryOnOrBeforeToday(null, today)).toBe(false)
  })

  it('accepts only a real date after today', () => {
    expect(isDateAfter('2026-10-08', today)).toBe(true)
    expect(isDateAfter('2026-10-07', today)).toBe(false)
    expect(isDateAfter('2026-02-31', today)).toBe(false)
    expect(isDateAfter('', today)).toBe(false)
  })

  it('steps to the next calendar day', () => {
    expect(dayAfter('2026-10-07')).toBe('2026-10-08')
    expect(dayAfter('2026-12-31')).toBe('2027-01-01')
  })
})

describe('password age', () => {
  it('expires a user password once the configured age is before now', () => {
    const setAt = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000 - 1).toISOString()
    expect(userPasswordExpired('user', setAt, 90, now)).toBe(true)
  })

  it('keeps a password that has reached the age but is not yet before now', () => {
    const setAt = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    expect(userPasswordExpired('user', setAt, 90, now)).toBe(false)
  })

  it('does not expire an admin password of the same age', () => {
    const setAt = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString()
    expect(userPasswordExpired('admin', setAt, 90, now)).toBe(false)
  })
})
