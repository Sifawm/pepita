import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, exportBackup, importBackup, needsBackup, logsCsv, type AppData } from '.'

const now = new Date('2026-05-10T18:30:00.000Z')

const data: AppData = {
  settings: { ...DEFAULT_SETTINGS, dayCutoff: '03:00', language: 'es', notifications: true, globalPause: { start: '2026-05-08', end: '2026-05-15' } },
  identities: [
    { id: 'g', createdAt: '2026-05-01T08:00:00.000Z', name: '', isGeneral: true, archived: false, order: 0 },
    { id: 'reader', createdAt: '2026-05-01T08:01:00.000Z', name: "I'm a reader", isGeneral: false, archived: true, order: 1 },
  ],
  habits: [
    {
      id: 'read',
      createdAt: '2026-05-01T08:02:00.000Z',
      identityId: 'reader',
      name: 'Read one page, "calmly"',
      type: 'yes_no',
      frequency: { type: 'times_per_period', times: 1, period: 'day' },
      minimumVersion: 'Open the book',
      fullVersion: 'Read for 30 minutes',
      // One "when" variant on each habit.
      intention: { when: { afterHabitId: 'run' }, where: 'the couch' },
      environment: ['Leave the book on the pillow', 'Glasses at hand'],
      pairedReward: 'A tea while I read',
      startDate: '2026-05-01',
      archived: false,
      order: 0,
    },
    // One variant of each type: TypeScript doesn't warn if a validator ends up narrower than the type.
    {
      id: 'run',
      createdAt: '2026-05-01T08:03:00.000Z',
      identityId: 'g',
      name: 'Run',
      type: 'yes_no',
      frequency: { type: 'times_per_period', times: 3, period: 'week' },
      intention: { when: { time: '07:30' } },
      startDate: '2026-05-04',
      archived: false,
      order: 1,
      pauses: [
        { start: '2026-05-05', end: '2026-05-05' },
        { start: '2026-06-01', end: '2026-06-30' },
      ],
      // Rule history: it was daily, then specific weekdays, and now 3 per week.
      versions: [
        { until: '2026-05-05', frequency: { type: 'times_per_period', times: 1, period: 'day' } },
        { until: '2026-05-10', frequency: { type: 'weekdays', days: [1, 3, 5] } },
      ],
    },
    {
      id: 'yoga',
      createdAt: '2026-05-01T08:04:00.000Z',
      identityId: 'g',
      name: 'Yoga',
      type: 'yes_no',
      frequency: { type: 'weekdays', days: [2, 4] },
      intention: { when: { afterAction: 'waking up' } },
      startDate: '2026-05-01',
      archived: true,
      order: 2,
    },
    {
      id: 'social',
      createdAt: '2026-05-01T08:05:00.000Z',
      identityId: 'g',
      name: 'Social media',
      type: 'avoid',
      frequency: { type: 'times_per_period', times: 1, period: 'day' },
      inverseLaws: { cue: 'Phone out of the bedroom', friction: 'Log out', substitute: 'Read' },
      startDate: '2026-05-01',
      archived: false,
      order: 3,
    },
    // Quantitative: now "at least", with a minimum target and decimals; before, "at most".
    {
      id: 'water',
      createdAt: '2026-05-01T08:05:00.000Z',
      identityId: 'g',
      name: 'Drink water',
      type: 'quantitative',
      quantitative: { unit: 'liters', target: 1.5, minTarget: 0.5, mode: 'at_least' },
      frequency: { type: 'times_per_period', times: 1, period: 'day' },
      startDate: '2026-05-01',
      archived: false,
      order: 4,
      versions: [{ until: '2026-05-03', frequency: { type: 'times_per_period', times: 1, period: 'week' }, quantitative: { unit: 'liters', target: 20, mode: 'at_most' } }],
    },
  ],
  logs: [
    { id: 'l1', createdAt: '2026-05-02T20:00:00.000Z', habitId: 'read', day: '2026-05-02', type: 'minimum' },
    { id: 'l2', createdAt: '2026-05-03T20:00:00.000Z', habitId: 'read', day: '2026-05-03', type: 'full', note: 'one chapter' },
    { id: 'l3', createdAt: '2026-05-04T20:00:00.000Z', habitId: 'read', day: '2026-05-04', type: 'skip', reason: 'Trip' },
    { id: 'l4', createdAt: '2026-05-05T22:00:00.000Z', habitId: 'social', day: '2026-05-05', type: 'relapse', trigger: 'Boredom' },
    { id: 'l5', createdAt: '2026-05-06T22:00:00.000Z', habitId: 'social', day: '2026-05-06', type: 'relapse' },
    { id: 'l6', createdAt: '2026-05-04T21:00:00.000Z', habitId: 'water', day: '2026-05-04', type: 'value', value: 0.75 },
  ],
  failureNotes: [
    { id: 'n1', createdAt: '2026-05-06T09:00:00.000Z', habitId: 'read', period: '2026-05-05', law: 3, note: 'I was exhausted' },
    { id: 'n2', createdAt: '2026-05-07T09:00:00.000Z', habitId: 'run', period: '2026-05-04', law: 1 },
    { id: 'n3', createdAt: '2026-05-08T09:00:00.000Z', habitId: 'read', period: '2026-05-06', note: 'No idea' },
  ],
  celebratedMilestones: [
    { id: 'm1', createdAt: '2026-05-09T20:00:00.000Z', identityId: 'reader', threshold: 10 },
    { id: 'm2', createdAt: '2026-05-10T20:00:00.000Z', identityId: 'g', threshold: 1000 },
  ],
  // One diagnosis in each status.
  diagnoses: [
    { id: 'd1', createdAt: '2026-05-07T09:00:00.000Z', habitId: 'read', triggerPeriod: '2026-05-06', law: 3, status: 'answered', appliedAction: 'edit_environment' },
    { id: 'd2', createdAt: '2026-05-08T09:00:00.000Z', habitId: 'run', triggerPeriod: '2026-05-04', status: 'pending' },
    { id: 'd3', createdAt: '2026-05-09T09:00:00.000Z', habitId: 'yoga', triggerPeriod: '2026-05-05', status: 'snoozed' },
    { id: 'd4', createdAt: '2026-05-09T09:00:00.000Z', habitId: 'yoga', triggerPeriod: '2026-05-07', status: 'dismissed' },
    { id: 'd5', createdAt: '2026-05-09T09:00:00.000Z', habitId: 'read', triggerPeriod: '2026-05-08', law: 1, status: 'answered' },
  ],
  // One of each type; several for the same habit are fine (they accumulate).
  dismissedSuggestions: [
    { id: 's1', createdAt: '2026-05-09T10:00:00.000Z', habitId: 'read', type: 'raise', until: '2026-05-29' },
    { id: 's2', createdAt: '2026-05-09T10:00:00.000Z', habitId: 'water', type: 'lower', until: '2026-05-29' },
    { id: 's3', createdAt: '2026-05-10T10:00:00.000Z', habitId: 'read', type: 'raise', until: '2026-05-30' },
  ],
  // Notes for two weeks (each on its Monday), with line breaks and quotes.
  weeklyReviews: [
    { id: 'w1', createdAt: '2026-05-03T19:00:00.000Z', week: '2026-04-27', note: 'Quiet week.' },
    { id: 'w2', createdAt: '2026-05-10T19:00:00.000Z', week: '2026-05-04', note: 'Better than I thought.\n"Run" was hard.' },
  ],
}

describe('exportBackup', () => {
  it("signs the backup as Pepita's, with a schema version and export date", () => {
    const backup = JSON.parse(exportBackup(data, now))
    expect(backup).toMatchObject({ app: 'pepita', schemaVersion: 1, exportedAt: '2026-05-10T18:30:00.000Z' })
  })

  it('exporting and reimporting returns the same data, with the backup recorded as the last one', () => {
    const result = importBackup(exportBackup(data, now))
    expect(result).toEqual({
      ok: true,
      data: { ...data, settings: { ...data.settings, lastBackup: '2026-05-10T18:30:00.000Z' } },
    })
  })
})

describe('importBackup rejects an invalid file without returning data', () => {
  const valid = () => JSON.parse(exportBackup(data, now))
  const withChange = (change: (b: ReturnType<typeof valid>) => void) => {
    const b = valid()
    change(b)
    return JSON.stringify(b)
  }

  it.each([
    ['a file that is not JSON', '{"app": "pepita",', { reason: 'not_json' }],
    ['JSON that is not an object', '[1, 2]', { reason: 'not_pepita' }],
    ["another app's backup", withChange((b) => (b.app = 'loop')), { reason: 'not_pepita' }],
    ['a backup from a newer version', withChange((b) => (b.schemaVersion = 2)), { reason: 'newer_version' }],
    ['an impossible version', withChange((b) => (b.schemaVersion = 0)), { reason: 'invalid', path: 'schemaVersion' }],
    ['a missing table', withChange((b) => delete b.data.logs), { reason: 'invalid', path: 'data.logs' }],
    ['an unknown field', withChange((b) => (b.data.habits[0].hack = true)), { reason: 'invalid', path: 'data.habits[0].hack' }],
    ['a field with the wrong type', withChange((b) => (b.data.habits[0].order = '1')), { reason: 'invalid', path: 'data.habits[0].order' }],
    ['an unknown log type', withChange((b) => (b.data.logs[1].type = 'lots')), { reason: 'invalid', path: 'data.logs[1].type' }],
    ['an unknown frequency', withChange((b) => (b.data.habits[0].frequency.type = 'sometimes')), { reason: 'invalid', path: 'data.habits[0].frequency.type' }],
    ['an impossible weekday', withChange((b) => (b.data.habits[2].frequency.days = [8])), { reason: 'invalid', path: 'data.habits[2].frequency.days[0]' }],
    ['an impossible day', withChange((b) => (b.data.logs[0].day = '2026-02-30')), { reason: 'invalid', path: 'data.logs[0].day' }],
    ['a malformed cutoff time', withChange((b) => (b.data.settings.dayCutoff = '25:00')), { reason: 'invalid', path: 'data.settings.dayCutoff' }],
    ['an instant that is not ISO', withChange((b) => (b.exportedAt = 'yesterday')), { reason: 'invalid', path: 'exportedAt' }],
    ['a minimum version that is not a string', withChange((b) => (b.data.habits[0].minimumVersion = 2)), { reason: 'invalid', path: 'data.habits[0].minimumVersion' }],
    ["a null where it doesn't fit", withChange((b) => (b.data.logs[0].note = null)), { reason: 'invalid', path: 'data.logs[0].note' }],
    ['repeated ids', withChange((b) => (b.data.logs[1].id = 'l1')), { reason: 'invalid', path: 'data.logs[1].id' }],
    ["a log for a habit that doesn't exist", withChange((b) => (b.data.logs[0].habitId = 'nobody')), { reason: 'invalid', path: 'data.logs[0].habitId' }],
    ["a habit for an identity that doesn't exist", withChange((b) => (b.data.habits[0].identityId = 'nobody')), { reason: 'invalid', path: 'data.habits[0].identityId' }],
    ['a pause that ends before it starts', withChange((b) => (b.data.habits[1].pauses[0].start = '2026-05-06')), { reason: 'invalid', path: 'data.habits[1].pauses[0]' }],
    ['a global pause with an impossible day', withChange((b) => (b.data.settings.globalPause.end = '2026-13-01')), { reason: 'invalid', path: 'data.settings.globalPause.end' }],
    ['a reason on a log that is not a skip', withChange((b) => (b.data.logs[0].reason = 'just because')), { reason: 'invalid', path: 'data.logs[0].reason' }],
    ['a malformed rule version', withChange((b) => (b.data.habits[1].versions[0].frequency.times = 0)), { reason: 'invalid', path: 'data.habits[1].versions[0].frequency.times' }],
    ['out-of-order rule versions', withChange((b) => (b.data.habits[1].versions[1].until = '2026-05-05')), { reason: 'invalid', path: 'data.habits[1].versions[1].until' }],
    ['a law that is not 1 to 4', withChange((b) => (b.data.failureNotes[0].law = 5)), { reason: 'invalid', path: 'data.failureNotes[0].law' }],
    ["a note for a habit that doesn't exist", withChange((b) => (b.data.failureNotes[1].habitId = 'nobody')), { reason: 'invalid', path: 'data.failureNotes[1].habitId' }],
    ['two notes for the same failure', withChange((b) => (b.data.failureNotes[2].period = '2026-05-05')), { reason: 'invalid', path: 'data.failureNotes[2].period' }],
    ['a value on a log that is not a value', withChange((b) => (b.data.logs[0].value = 3)), { reason: 'invalid', path: 'data.logs[0].value' }],
    ['a value log without a value', withChange((b) => delete b.data.logs[5].value), { reason: 'invalid', path: 'data.logs[5].value' }],
    ['a value that is not positive', withChange((b) => (b.data.logs[5].value = 0)), { reason: 'invalid', path: 'data.logs[5].value' }],
    ['a quantitative habit without a target', withChange((b) => delete b.data.habits[4].quantitative), { reason: 'invalid', path: 'data.habits[4].quantitative' }],
    ['a yes/no habit with a target', withChange((b) => (b.data.habits[0].quantitative = b.data.habits[4].quantitative)), { reason: 'invalid', path: 'data.habits[0].quantitative' }],
    ['an unknown mode', withChange((b) => (b.data.habits[4].quantitative.mode = 'more_or_less')), { reason: 'invalid', path: 'data.habits[4].quantitative.mode' }],
    ['a minimum target that is not below the target', withChange((b) => (b.data.habits[4].quantitative.minTarget = 2)), { reason: 'invalid', path: 'data.habits[4].quantitative.minTarget' }],
    ['a minimum target on "at most"', withChange((b) => (b.data.habits[4].versions[0].quantitative.minTarget = 1)), { reason: 'invalid', path: 'data.habits[4].versions[0].quantitative.minTarget' }],
    ['a trigger on a log that is not a relapse', withChange((b) => (b.data.logs[0].trigger = 'the couch')), { reason: 'invalid', path: 'data.logs[0].trigger' }],
    ['inverse laws on a habit that is not to avoid', withChange((b) => (b.data.habits[0].inverseLaws = { cue: 'x' })), { reason: 'invalid', path: 'data.habits[0].inverseLaws' }],
    ['an unknown inverse law', withChange((b) => (b.data.habits[3].inverseLaws.prize = 'x')), { reason: 'invalid', path: 'data.habits[3].inverseLaws.prize' }],
    ['an unknown habit type', withChange((b) => (b.data.habits[0].type = 'maybe')), { reason: 'invalid', path: 'data.habits[0].type' }],
    ['a when with two triggers', withChange((b) => (b.data.habits[1].intention.when.afterAction = 'dinner')), { reason: 'invalid', path: 'data.habits[1].intention.when.afterAction' }],
    ['an unknown when', withChange((b) => (b.data.habits[1].intention.when = { atDawn: true })), { reason: 'invalid', path: 'data.habits[1].intention.when.atDawn' }],
    ['an impossible intention time', withChange((b) => (b.data.habits[1].intention.when.time = '7:30')), { reason: 'invalid', path: 'data.habits[1].intention.when.time' }],
    ['an environment that is not a list of strings', withChange((b) => (b.data.habits[0].environment = [1])), { reason: 'invalid', path: 'data.habits[0].environment[0]' }],
    ['a milestone that is not a Pepita threshold', withChange((b) => (b.data.celebratedMilestones[0].threshold = 11)), { reason: 'invalid', path: 'data.celebratedMilestones[0].threshold' }],
    ["a milestone for an identity that doesn't exist", withChange((b) => (b.data.celebratedMilestones[1].identityId = 'nobody')), { reason: 'invalid', path: 'data.celebratedMilestones[1].identityId' }],
    ['the same milestone celebrated twice', withChange((b) => ((b.data.celebratedMilestones[1].identityId = 'reader'), (b.data.celebratedMilestones[1].threshold = 10))), { reason: 'invalid', path: 'data.celebratedMilestones[1].threshold' }],
    ['an unknown diagnosis status', withChange((b) => (b.data.diagnoses[1].status = 'forgotten')), { reason: 'invalid', path: 'data.diagnoses[1].status' }],
    ['an unknown diagnosis action', withChange((b) => (b.data.diagnoses[0].appliedAction = 'magic')), { reason: 'invalid', path: 'data.diagnoses[0].appliedAction' }],
    ["an action that doesn't belong to the chosen law", withChange((b) => (b.data.diagnoses[0].appliedAction = 'archive')), { reason: 'invalid', path: 'data.diagnoses[0].appliedAction' }],
    ['an answered diagnosis without a cause', withChange((b) => delete b.data.diagnoses[4].law), { reason: 'invalid', path: 'data.diagnoses[4].law' }],
    ['a cause on an unanswered diagnosis', withChange((b) => (b.data.diagnoses[1].law = 2)), { reason: 'invalid', path: 'data.diagnoses[1].law' }],
    ["a diagnosis for a habit that doesn't exist", withChange((b) => (b.data.diagnoses[1].habitId = 'nobody')), { reason: 'invalid', path: 'data.diagnoses[1].habitId' }],
    ['two diagnoses for the same break', withChange((b) => (b.data.diagnoses[4].triggerPeriod = '2026-05-06')), { reason: 'invalid', path: 'data.diagnoses[4].triggerPeriod' }],
    ['a suggestion of an unknown type', withChange((b) => (b.data.dismissedSuggestions[0].type = 'keep')), { reason: 'invalid', path: 'data.dismissedSuggestions[0].type' }],
    ['a suggestion without a valid date', withChange((b) => (b.data.dismissedSuggestions[1].until = '2026-02-30')), { reason: 'invalid', path: 'data.dismissedSuggestions[1].until' }],
    ["a suggestion for a habit that doesn't exist", withChange((b) => (b.data.dismissedSuggestions[2].habitId = 'nobody')), { reason: 'invalid', path: 'data.dismissedSuggestions[2].habitId' }],
    ['two suggestions with the same id', withChange((b) => (b.data.dismissedSuggestions[2].id = 's1')), { reason: 'invalid', path: 'data.dismissedSuggestions[2].id' }],
    ["a weekly note that doesn't fall on a Monday", withChange((b) => (b.data.weeklyReviews[0].week = '2026-04-28')), { reason: 'invalid', path: 'data.weeklyReviews[0].week' }],
    ['an empty weekly note', withChange((b) => (b.data.weeklyReviews[0].note = '  ')), { reason: 'invalid', path: 'data.weeklyReviews[0].note' }],
    ['two notes for the same week', withChange((b) => (b.data.weeklyReviews[1].week = '2026-04-27')), { reason: 'invalid', path: 'data.weeklyReviews[1].week' }],
    ['two notes with the same id', withChange((b) => (b.data.weeklyReviews[1].id = 'w1')), { reason: 'invalid', path: 'data.weeklyReviews[1].id' }],
    ['a relapse on a yes/no habit', withChange((b) => (b.data.logs[0].type = 'relapse')), { reason: 'invalid', path: 'data.logs[0].type' }],
    ['a value on a yes/no habit', withChange((b) => ((b.data.logs[0].type = 'value'), (b.data.logs[0].value = 2))), { reason: 'invalid', path: 'data.logs[0].type' }],
    ['a minimum on a habit to avoid', withChange((b) => ((b.data.logs[3].type = 'minimum'), delete b.data.logs[3].trigger)), { reason: 'invalid', path: 'data.logs[3].type' }],
    ['a minimum on a quantitative habit', withChange((b) => ((b.data.logs[5].type = 'minimum'), delete b.data.logs[5].value)), { reason: 'invalid', path: 'data.logs[5].type' }],
    ['empty weekdays', withChange((b) => (b.data.habits[2].frequency.days = [])), { reason: 'invalid', path: 'data.habits[2].frequency.days' }],
    ['a repeated weekday', withChange((b) => (b.data.habits[2].frequency.days = [2, 2])), { reason: 'invalid', path: 'data.habits[2].frequency.days' }],
    ["a language Pepita doesn't speak", withChange((b) => (b.data.settings.language = 'fr')), { reason: 'invalid', path: 'data.settings.language' }],
    ['no "General" identity', withChange((b) => (b.data.identities[0].isGeneral = false)), { reason: 'invalid', path: 'data.identities' }],
  ])('%s', (_case, content, error) => {
    expect(importBackup(content)).toEqual({ ok: false, error })
  })
})

describe('needsBackup', () => {
  const { logs } = data // the first one was created on May 2nd at 20:00 UTC
  const settings = DEFAULT_SETTINGS

  it("doesn't remind if there's nothing to lose yet", () => {
    expect(needsBackup({ settings, logs: [], now: new Date('2026-09-01T12:00:00Z') })).toBe(false)
  })

  it('without any backup, reminds when the first log is more than 7 days old', () => {
    expect(needsBackup({ settings, logs, now: new Date('2026-05-09T19:59:00Z') })).toBe(false)
    expect(needsBackup({ settings, logs, now: new Date('2026-05-09T20:01:00Z') })).toBe(true)
  })

  it('counts the 7 days from the last backup', () => {
    const withBackup = { ...settings, lastBackup: '2026-06-01T10:00:00.000Z' }
    expect(needsBackup({ settings: withBackup, logs, now: new Date('2026-06-08T09:00:00Z') })).toBe(false)
    expect(needsBackup({ settings: withBackup, logs, now: new Date('2026-06-08T11:00:00Z') })).toBe(true)
  })
})

describe('logsCsv', () => {
  it("gives one row per log, by day, with the habit's name and quotes where needed", () => {
    const logs = [
      ...data.logs,
      { id: 'l0', createdAt: '2026-05-01T21:00:00.000Z', habitId: 'read', day: '2026-05-01', type: 'minimum' as const, note: 'said "enough"\nok' },
    ]
    expect(logsCsv({ habits: data.habits, logs })).toBe(
      [
        'day,habitId,habit,type,value,note,reason,trigger,createdAt',
        '2026-05-01,read,"Read one page, ""calmly""",minimum,,"said ""enough""\nok",,,2026-05-01T21:00:00.000Z',
        '2026-05-02,read,"Read one page, ""calmly""",minimum,,,,,2026-05-02T20:00:00.000Z',
        '2026-05-03,read,"Read one page, ""calmly""",full,,one chapter,,,2026-05-03T20:00:00.000Z',
        '2026-05-04,read,"Read one page, ""calmly""",skip,,,Trip,,2026-05-04T20:00:00.000Z',
        '2026-05-04,water,Drink water,value,0.75,,,,2026-05-04T21:00:00.000Z',
        '2026-05-05,social,Social media,relapse,,,,Boredom,2026-05-05T22:00:00.000Z',
        '2026-05-06,social,Social media,relapse,,,,,2026-05-06T22:00:00.000Z',
        '',
      ].join('\r\n'),
    )
  })
})
