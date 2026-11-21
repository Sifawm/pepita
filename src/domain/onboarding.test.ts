import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, needsOnboarding, newHabit, type Habit, type Identity } from '.'

const identity = (id: string, extra: Partial<Identity> = {}): Identity => ({
  id,
  createdAt: '2026-03-01T10:00:00.000Z',
  name: id,
  isGeneral: false,
  archived: false,
  order: 1,
  ...extra,
})
const general = identity('general', { name: '', isGeneral: true, order: 0 })
const habit = (extra: Partial<Habit> = {}): Habit => ({
  ...newHabit({ name: 'Read', identityId: 'general', order: 0 }, new Date(2026, 2, 1, 9), DEFAULT_SETTINGS),
  id: 'h',
  createdAt: '2026-03-01T08:00:00.000Z',
  ...extra,
})

describe('needsOnboarding', () => {
  it('yes on a brand-new install: only an unnamed "General" and no habits', () => {
    expect(needsOnboarding({ identities: [general], habits: [] })).toBe(true)
  })

  it("no as soon as there's a habit, even an archived one", () => {
    expect(needsOnboarding({ identities: [general], habits: [habit()] })).toBe(false)
    expect(needsOnboarding({ identities: [general], habits: [habit({ archived: true })] })).toBe(false)
  })

  it('no if they already created their own identity (even archived) or renamed "General"', () => {
    expect(needsOnboarding({ identities: [general, identity('reader')], habits: [] })).toBe(false)
    expect(needsOnboarding({ identities: [general, identity('old', { archived: true })], habits: [] })).toBe(false)
    expect(needsOnboarding({ identities: [{ ...general, name: 'Me' }], habits: [] })).toBe(false)
  })
})
