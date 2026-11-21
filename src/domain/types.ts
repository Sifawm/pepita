/** Logical day as `YYYY-MM-DD`. */
export type Day = string
/** Local time as `HH:MM`. */
export type Time = string
/** Instant as an ISO 8601 string (`Date.toISOString()`). */
export type Instant = string

/** Range of days without evaluation, both inclusive. */
export interface Pause {
  start: Day
  end: Day
}

/** Pepita's languages. */
export const LANGUAGES = ['es', 'en'] as const
export type LanguageCode = (typeof LANGUAGES)[number]

export interface Settings {
  /** Missing until chosen: the browser's is suggested. Included in the backup, so it survives a restore. */
  language?: LanguageCode
  dayCutoff: Time
  /** "Vacation": pauses every habit. Stops applying on its own after `end`. */
  globalPause?: Pause
  /** Instant of the last exported JSON backup (or of the imported one). */
  lastBackup?: Instant
  /** Browser notifications while the app is open. Missing = disabled. */
  notifications?: boolean
}

export const DEFAULT_SETTINGS: Settings = { dayCutoff: '04:00' }

/** Everything stored has an `id` (UUID) and `createdAt`; persistence sets them. */
export interface Entity {
  id: string
  createdAt: Instant
}

export interface Identity extends Entity {
  /** Empty for "General": the UI shows its translated name. */
  name: string
  isGeneral: boolean
  archived: boolean
  order: number
}

// Types are narrow on purpose: each ticket widens them once the core knows how to evaluate them.
/** `avoid`: the period is always the day; it is met if the day closes without a relapse. */
export type HabitType = 'yes_no' | 'quantitative' | 'avoid'

/**
 * A measured habit: "at least 20 pages" or "at most 2 coffees" per period.
 * `minTarget` (only with `at_least`, lower than `target`) is its minimum version.
 */
export interface Quantitative {
  unit: string
  target: number
  minTarget?: number
  mode: 'at_least' | 'at_most'
}

/** The inverse-laws wizard for a habit to avoid. Every step can be skipped. */
export interface InverseLaws {
  /** Which cue I'll remove (make it invisible). */
  cue?: string
  /** Which friction I'll add (make it difficult). */
  friction?: string
  /** What I'll do instead. */
  substitute?: string
}

/** 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type Frequency =
  | { type: 'times_per_period'; times: number; period: 'day' | 'week' | 'month' }
  | { type: 'weekdays'; days: Weekday[] }

export interface Habit extends Entity {
  identityId: string
  name: string
  /** Never changes after the habit is created: its history is always evaluated the same way. */
  type: HabitType
  /** Only (and always) on `quantitative`. Part of the rule: changed through `changeRule`. */
  quantitative?: Quantitative
  frequency: Frequency
  /** The 2-minute version. Both versions are optional ("Not now") and are worth 1 vote. */
  minimumVersion?: string
  fullVersion?: string
  /** Only on `avoid`, and only if some step was filled in. */
  inverseLaws?: InverseLaws
  startDate: Day
  archived: boolean
  order: number
  /** Optional: habits saved before pauses existed don't have it. */
  pauses?: Pause[]
  /**
   * Previous rules, oldest to newest: each one applied up to `until` (inclusive) from the day
   * after the previous one (or from the start). The current one applies after that.
   * Missing if the rule never changed. Changed only through `changeRule`.
   */
  versions?: RuleVersion[]
  /** Implementation intention: when and where. Missing if the step was skipped. */
  intention?: Intention
  /** "Prime your environment": what to have ready before starting. */
  environment?: string[]
  /** "I only listen to my podcast while I walk". */
  pairedReward?: string
}

/**
 * The habit's trigger. An archived or deleted anchor isn't cleaned up: the habit becomes
 * "no time" while it's missing, and rejoins its chain if the anchor comes back.
 */
export type When = { time: Time } | { afterHabitId: string } | { afterAction: string }

export interface Intention {
  /** Optional: just the "where" can be given. */
  when?: When
  where?: string
}

/** What decides how a period is evaluated. */
export type Rule = Pick<Habit, 'frequency' | 'quantitative'>

export type RuleVersion = Rule & { until: Day }

/**
 * `skip`: the period containing it is neutral (neither counts nor fails).
 * `relapse`: only on `avoid`; turns that day into a failure.
 * `value`: an amount that adds up (quantitative habits).
 */
export type LogType = 'minimum' | 'full' | 'skip' | 'relapse' | 'value'

export interface Log extends Entity {
  habitId: string
  day: Day
  type: LogType
  note?: string
  /** Only on `skip`, and optional. */
  reason?: string
  /** Only on `relapse`, and optional: what caused it. */
  trigger?: string
  /** Only (and always) on `value`: greater than 0. */
  value?: number
}

/** The 4 laws of behavior change: 1 obvious (cue), 2 attractive (craving), 3 easy (response), 4 satisfying (reward). */
export type Law = 1 | 2 | 3 | 4

/** Why a period failed, if the person wants to say. At most one per failure. */
export interface FailureNote extends Entity {
  habitId: string
  /** `start` of the failed period. */
  period: Day
  law?: Law
  note?: string
}

export type DiagnosisStatus = 'pending' | 'answered' | 'snoozed' | 'dismissed'

/**
 * What each cause offers, in one tap (`DIAGNOSIS_ACTIONS`). `minimum_only` keeps the
 * `lower` suggestion active (see `progressionSuggestion`).
 */
export type DiagnosisAction =
  | 'edit_intention'
  | 'export_ics'
  | 'edit_reward'
  | 'edit_identity'
  | 'minimum_only'
  | 'edit_environment'
  | 'view_votes'
  | 'pause'
  | 'archive'

/** "What happened?" after two failures in a row. At most one per streak break. */
export interface Diagnosis extends Entity {
  habitId: string
  /** `start` of the second failed period (the break). */
  triggerPeriod: Day
  /** The chosen cause; only (and always) when `answered`. */
  law?: Law
  status: DiagnosisStatus
  /** One of its law's actions, if applied. */
  appliedAction?: DiagnosisAction
}

/** A milestone (`MILESTONES`) of an identity already celebrated: never celebrated again. */
export interface CelebratedMilestone extends Entity {
  identityId: string
  threshold: number
}

/** `raise` the bar (high strength) or `lower` it (after a 3rd-law diagnosis). */
export type SuggestionType = 'raise' | 'lower'

/**
 * A progression suggestion already handled: dismissed or applied (both silence it).
 * It doesn't show up again until after `until` (inclusive).
 */
export interface DismissedSuggestion extends Entity {
  habitId: string
  type: SuggestionType
  until: Day
}

/** The free-form note of a weekly review. At most one per week; without text, it isn't saved. */
export interface WeeklyReview extends Entity {
  /** Monday of that week. */
  week: Day
  note: string
}

/** What the core creates; persistence adds `id` and `createdAt`. */
export type New<T extends Entity> = Omit<T, keyof Entity>

/**
 * All of the person's data: what a backup exports and imports.
 * Every key (except `settings`) is also a Dexie table with the same name.
 */
export interface AppData {
  settings: Settings
  identities: Identity[]
  habits: Habit[]
  logs: Log[]
  failureNotes: FailureNote[]
  celebratedMilestones: CelebratedMilestone[]
  diagnoses: Diagnosis[]
  dismissedSuggestions: DismissedSuggestion[]
  weeklyReviews: WeeklyReview[]
}
