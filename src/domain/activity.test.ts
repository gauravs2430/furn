import { describe, expect, it } from 'vitest'
import { activityByHour, activityCounts, todaysActivity } from './activity.ts'
import { createQuote } from './factories.ts'

const now = new Date(2026, 10, 12, 16, 0)
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString()

function quote(id: string, times: { created: string; updated: string; quoted?: string; booked?: string }) {
  return {
    ...createQuote('SP-0001'),
    id,
    createdAt: times.created,
    updatedAt: times.updated,
    quotedAt: times.quoted,
    bookedAt: times.booked,
  }
}

describe('todays activity', () => {
  it('keeps only today, newest first', () => {
    const events = todaysActivity(
      [
        { quote: quote('a', { created: at(11, 9), updated: at(12, 10) }), ownerId: 'u1', ownerName: 'Ann' },
        { quote: quote('b', { created: at(12, 9), updated: at(12, 9), quoted: at(12, 11), booked: at(12, 14) }), ownerId: 'u2', ownerName: 'Ben' },
      ],
      now,
    )
    expect(events.map((event) => `${event.quote.id}:${event.kind}`)).toEqual(['b:booked', 'b:quoted', 'a:edited', 'b:started'])
  })

  it('does not repeat an edit that is part of another event', () => {
    const events = todaysActivity(
      [{ quote: quote('c', { created: at(12, 9), updated: at(12, 9, 1) }), ownerId: 'u1', ownerName: 'Ann' }],
      now,
    )
    expect(events.map((event) => event.kind)).toEqual(['started'])
  })

  it('counts by hour, kind and person', () => {
    const events = todaysActivity(
      [
        { quote: quote('a', { created: at(12, 9), updated: at(12, 15) }), ownerId: 'u1', ownerName: 'Ann' },
        { quote: quote('b', { created: at(12, 9, 30), updated: at(12, 9, 30), booked: at(12, 15, 30) }), ownerId: 'u2', ownerName: 'Ben' },
      ],
      now,
    )
    const hours = activityByHour(events)
    expect(hours[9]).toBe(2)
    expect(hours[15]).toBe(2)
    expect(activityCounts(events)).toMatchObject({ started: 2, edited: 1, booked: 1, people: 2 })
  })
})
