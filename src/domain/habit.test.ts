import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, editHabit, newHabit, nextOrder, type Habit } from '.'

const settings = DEFAULT_SETTINGS
const now = new Date(2026, 2, 15, 9)

describe('wizard: create a habit', () => {
  it('saves the minimum and full versions, without extra whitespace', () => {
    const h = newHabit(
      { name: '  Read ', identityId: 'general', order: 0, minimumVersion: ' Read one page ', fullVersion: 'Read for 30 minutes' },
      now,
      settings,
    )
    expect(h).toMatchObject({ name: 'Read', minimumVersion: 'Read one page', fullVersion: 'Read for 30 minutes' })
  })

  it('a skipped step ("Not now") leaves the field unwritten', () => {
    const h = newHabit({ name: 'Read', identityId: 'general', order: 0, minimumVersion: '   ' }, now, settings)
    expect(h).not.toHaveProperty('minimumVersion')
    expect(h).not.toHaveProperty('fullVersion')
  })
})

describe('wizard: edit a habit', () => {
  const read: Habit = {
    ...newHabit({ name: 'Read', identityId: 'general', order: 4, minimumVersion: 'One page' }, now, settings),
    id: 'read',
    createdAt: '2026-03-15T08:00:00.000Z',
  }

  it("changes the wizard's fields and keeps the rest (start, order, archived)", () => {
    const edited = editHabit(
      read,
      {
        name: ' Read novels ',
        identityId: 'reader',
        frequency: { type: 'weekdays', days: [6, 7] },
        minimumVersion: 'One page',
        fullVersion: ' One chapter ',
      },
      now,
      settings,
    )
    expect(edited).toEqual({
      ...read,
      name: 'Read novels',
      identityId: 'reader',
      frequency: { type: 'weekdays', days: [6, 7] },
      fullVersion: 'One chapter',
    })
  })

  it('emptying a version deletes it', () => {
    const edited = editHabit(read, { ...read, minimumVersion: '' }, now, settings)
    expect(edited).not.toHaveProperty('minimumVersion')
    expect(edited.name).toBe('Read')
  })

  it("changing the frequency days later doesn't rewrite past periods", () => {
    const friday = new Date(2026, 2, 20, 9)
    const edited = editHabit(read, { ...read, frequency: { type: 'weekdays', days: [6, 7] } }, friday, settings)
    expect(edited.frequency).toEqual({ type: 'weekdays', days: [6, 7] })
    expect(edited.versions).toEqual([{ frequency: read.frequency, until: '2026-03-19' }])
  })

  it("editing other fields days later doesn't create a rule version", () => {
    const friday = new Date(2026, 2, 20, 9)
    expect(editHabit(read, { ...read, name: 'Read more' }, friday, settings)).not.toHaveProperty('versions')
  })
})

describe('order of a new habit', () => {
  it('goes after the last one, even if others were deleted before (counting would repeat an order)', () => {
    expect(nextOrder([])).toBe(0)
    // There were 0, 1 and 2; 1 was deleted.
    expect(nextOrder([{ order: 0 }, { order: 2 }])).toBe(3)
  })
})
