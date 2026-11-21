import { describe, expect, it } from 'vitest'
import { logicalDay, nextCutoff } from '.'

// Instants in local time: the logical day is computed on the person's clock.
const local = (y: number, month: number, d: number, h: number, min = 0) => new Date(y, month - 1, d, h, min)

describe('logical day', () => {
  it('a log at 01:00 counts for the previous day', () => {
    expect(logicalDay(local(2026, 3, 15, 1), '04:00')).toBe('2026-03-14')
  })

  it('the new day starts at the cutoff time', () => {
    expect(logicalDay(local(2026, 3, 15, 3, 59), '04:00')).toBe('2026-03-14')
    expect(logicalDay(local(2026, 3, 15, 4, 0), '04:00')).toBe('2026-03-15')
  })

  it('crosses month and year boundaries', () => {
    expect(logicalDay(local(2026, 3, 1, 2), '04:00')).toBe('2026-02-28')
    expect(logicalDay(local(2027, 1, 1, 0, 30), '04:00')).toBe('2026-12-31')
  })

  it('honors a different cutoff time', () => {
    expect(logicalDay(local(2026, 3, 15, 1), '00:00')).toBe('2026-03-15')
    expect(logicalDay(local(2026, 3, 15, 5, 59), '06:00')).toBe('2026-03-14')
  })
})

describe("next cutoff (when today's periods close)", () => {
  it("is the next cutoff time: today if it hasn't come yet, otherwise tomorrow", () => {
    expect(nextCutoff(local(2026, 3, 15, 1), '04:00')).toEqual(local(2026, 3, 15, 4))
    expect(nextCutoff(local(2026, 3, 15, 12), '04:00')).toEqual(local(2026, 3, 16, 4))
    expect(nextCutoff(local(2026, 3, 15, 4), '04:00')).toEqual(local(2026, 3, 16, 4))
  })

  it('crosses the month boundary and the logical day changes at that instant', () => {
    const cutoff = nextCutoff(local(2026, 3, 31, 23, 30), '00:00')
    expect(cutoff).toEqual(local(2026, 4, 1, 0))
    expect(logicalDay(cutoff, '00:00')).toBe('2026-04-01')
  })
})
