import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { DeleteHabit } from '@/components/DeleteHabit'
import { QuantitativeFields } from '@/components/QuantitativeInputs'
import { FrequencyPicker } from '@/components/FrequencyPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { withId, db, useSettings } from '@/db'
import { possibleAnchors, editHabit, intentionPhrase, newHabit, nextOrder, type HabitFields, type When, type Habit, type Identity, type Intention, type InverseLaws, type HabitType } from '@/domain'
import { identityName, phraseText } from '@/lib/utils'

/** The inverse laws go loose: each one is a step that can be skipped on its own. */
type Draft = Omit<HabitFields, 'inverseLaws'> & InverseLaws & { type: HabitType }
interface StepProps {
  draft: Draft
  update: (changes: Partial<Draft>) => void
  identities: Identity[]
  /** The type is only chosen on creation: changing it would reinterpret the whole history. */
  editing: boolean
  /** Every habit (to name the anchor in the phrase). */
  habits: Habit[]
  /** The ones that can be its anchor: active and not closing a cycle. */
  anchors: Habit[]
  /** Id of the step's title, to name the field when it's a single one. */
  titleId: string
}

/** The types that can be chosen on creation. A new one = an entry here + `wizard.type.<type>` and `<type>Help`. */
const TYPES: HabitType[] = ['yes_no', 'quantitative', 'avoid']

/**
 * The method's steps, in order. To add one (type, intention, environment, reward…):
 * an entry here with the fields it fills in, and its copy under `wizard.<key>.*` (title, help).
 * "Not now" resets its `fields` to what they were when the wizard opened and moves on to the next.
 */
const STEPS: {
  key: string
  fields: (keyof Draft)[]
  optional: boolean
  visible?: (p: StepProps) => boolean
  Field: (p: StepProps) => ReactNode
}[] = [
  { key: 'name', fields: ['name'], optional: false, Field: NameStep },
  {
    key: 'identity',
    fields: ['identityId'],
    optional: true,
    visible: ({ identities }) => identities.length > 1,
    Field: IdentityStep,
  },
  {
    key: 'type',
    fields: ['type', 'quantitative'],
    optional: true,
    // When editing, the type doesn't change: the step only shows up to adjust a quantitative habit's target.
    visible: ({ editing, draft }) => !editing || draft.type === 'quantitative',
    Field: TypeStep,
  },
  { key: 'frequency', fields: ['frequency'], optional: true, visible: notAvoid, Field: FrequencyStep },
  // For a quantitative habit, the minimum version is its minimum target.
  {
    key: 'versions',
    fields: ['minimumVersion', 'fullVersion'],
    optional: true,
    visible: ({ draft }) => draft.type === 'yes_no',
    Field: VersionsStep,
  },
  // The laws to build; when avoiding, their inverses (no intention: there's nothing to remind).
  { key: 'intention', fields: ['intention'], optional: true, visible: notAvoid, Field: IntentionStep },
  { key: 'environment', fields: ['environment'], optional: true, visible: notAvoid, Field: EnvironmentStep },
  { key: 'reward', fields: ['pairedReward'], optional: true, visible: notAvoid, Field: RewardStep },
  // Inverse laws (habit to avoid): invisible, difficult, and what I'll do instead.
  ...(['cue', 'friction', 'substitute'] as const).map((key) => ({
    key,
    fields: [key],
    optional: true,
    visible: ({ draft }: StepProps) => draft.type === 'avoid',
    Field: (p: StepProps) => <InverseLawStep {...p} field={key} />,
  })),
]

function notAvoid({ draft }: StepProps) {
  return draft.type !== 'avoid'
}

/** Create (`/new`) and edit (`/habit/:id/edit`) are the same wizard. */
export default function HabitWizardScreen() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const settings = useSettings()
  const data = useLiveQuery(async () => {
    const [identities, habits] = await Promise.all([db.identities.orderBy('order').toArray(), db.habits.orderBy('order').toArray()])
    return { identities, habits, habit: habits.find((h) => h.id === id) ?? null }
  }, [id])

  if (!data || !settings) return null
  const { habit, habits, identities } = data
  if (id && !habit) return <NotFound />
  const general = identities.find((i) => i.isGeneral)!
  // Coming from a filtered Today, the filter's identity comes preselected.
  const requested = identities.find((i) => i.id === params.get('identity') && !i.archived)
  const initial: Draft = habit
    ? { ...habit, ...habit.inverseLaws }
    : {
        name: '',
        identityId: (requested ?? general).id,
        type: 'yes_no',
        frequency: { type: 'times_per_period', times: 1, period: 'day' },
      }
  return (
    <Wizard
      key={id ?? 'new'}
      initial={initial}
      habit={habit ?? undefined}
      // Archived identities aren't offered, except the one the habit already has.
      identities={identities.filter((i) => !i.archived || i.id === initial.identityId)}
      habits={habits}
      step={params.get('step') ?? undefined}
      onSave={async ({ cue, friction, substitute, ...rest }) => {
        const fields = { ...rest, inverseLaws: { cue, friction, substitute } }
        if (habit) await db.habits.put(editHabit(habit, fields, new Date(), settings))
        else await db.habits.add(withId<Habit>(newHabit({ ...fields, order: nextOrder(await db.habits.toArray()) }, new Date(), settings)))
      }}
    />
  )
}

/** Onboarding uses it too, with fewer steps and its own ending. */
export function Wizard({
  initial,
  habit,
  identities,
  habits,
  step: requestedStep,
  onSave,
  steps: stepKeys,
  title,
  onBack,
  onFinish,
}: {
  initial: Draft
  habit?: Habit
  identities: Identity[]
  habits: Habit[]
  /** `?step=<key>`: opens that step directly (the diagnosis uses it). */
  step?: string
  onSave: (draft: Draft) => Promise<void>
  /** Only these `STEPS` (all by default). */
  steps?: string[]
  title?: string
  /** "Back" from the first step; by default, "Cancel" goes back to Today. */
  onBack?: () => void
  /** After saving; by default, goes back to Today. */
  onFinish?: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(initial)
  const update = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }))
  const anchors = possibleAnchors(habit?.id, habits)
  const props = { draft, update, identities, habits, anchors, editing: !!habit, titleId: 'step-title' }
  const steps = STEPS.filter((s) => (!stepKeys || stepKeys.includes(s.key)) && (!s.visible || s.visible(props)))
  const [n, setN] = useState(() => Math.max(0, steps.findIndex((s) => s.key === requestedStep)))
  const step = steps[n]
  const isLast = n === steps.length - 1

  // When the step changes, focus goes to its title (on open, the name field takes it).
  const titleRef = useRef<HTMLHeadingElement>(null)
  // Opened on a requested step, focus starts on its title too.
  const previous = useRef(0)
  useEffect(() => {
    if (previous.current !== n) titleRef.current?.focus()
    previous.current = n
  }, [n])

  const form = useRef<HTMLFormElement>(null)
  const finish = async () => {
    if (!draft.name.trim()) return setN(0)
    // "Save" from a half-done step: let the browser flag the missing field.
    if (!form.current?.reportValidity()) return
    await onSave(draft)
    if (onFinish) onFinish()
    else navigate('/')
  }
  const next = (e?: FormEvent) => {
    e?.preventDefault()
    if (isLast) void finish()
    else setN(n + 1)
  }
  const notNow = () => {
    update(Object.fromEntries(step.fields.map((f) => [f, initial[f]])))
    next()
  }

  return (
    <div className="space-y-6">
      <form ref={form} onSubmit={next} className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">{title ?? t(habit ? 'wizard.edit' : 'new.title')}</h1>
          <p className="text-muted-foreground">{t('wizard.step', { n: n + 1, total: steps.length })}</p>
        </header>

        <section className="space-y-4">
          <h2 id="step-title" ref={titleRef} tabIndex={-1} className="text-xl font-bold outline-none">
            {t(`wizard.${step.key}.title`)}
          </h2>
          <p className="flex gap-2 rounded-lg bg-accent p-3 text-accent-foreground">
            <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              <span className="sr-only">{t('wizard.pepita')} </span>
              {t(`wizard.${step.key}.help`)}
            </span>
          </p>
          <step.Field {...props} />
        </section>

        <div className="flex flex-col gap-3">
          <Button type="submit">{t(isLast ? (habit ? 'wizard.save' : 'new.create') : 'wizard.next')}</Button>
          {step.optional && (
            <Button type="button" variant="secondary" onClick={notNow}>
              {t('wizard.notNow')}
            </Button>
          )}
          {/* When editing, it can be saved from any step. */}
          {habit && !isLast && (
            <Button type="button" variant="secondary" onClick={finish}>
              {t('wizard.save')}
            </Button>
          )}
          {(n > 0 || onBack) && (
            <Button type="button" variant="ghost" onClick={() => (n > 0 ? setN(n - 1) : onBack?.())}>
              {t('wizard.back')}
            </Button>
          )}
        </div>
      </form>

      {habit && (
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-xl font-bold">{t('habit.more')}</h2>
          <p className="text-muted-foreground">{t('habit.archiveHelp')}</p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={async () => {
              await db.habits.update(habit.id, { archived: !habit.archived })
              navigate(habit.archived ? '/' : '/archived')
            }}
          >
            {habit.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
            {t(habit.archived ? 'habit.restore' : 'habit.archive')}
          </Button>
          <DeleteHabit habit={habit} onDelete={() => navigate('/')} />
        </section>
      )}
    </div>
  )
}

function NameStep({ draft, update, titleId }: StepProps) {
  const { t } = useTranslation()
  return (
    <Input aria-labelledby={titleId} value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder={t('new.example')} required autoFocus autoComplete="off" />
  )
}

function IdentityStep({ draft, update, identities, titleId }: StepProps) {
  const { t } = useTranslation()
  return (
    <Select aria-labelledby={titleId} value={draft.identityId} onChange={(e) => update({ identityId: e.target.value })}>
      {identities.map((i) => (
        <option key={i.id} value={i.id}>
          {identityName(i, t)}
        </option>
      ))}
    </Select>
  )
}

function TypeStep({ draft, update, editing }: StepProps) {
  const { t } = useTranslation()
  return (
    <>
      {!editing && (
        <fieldset className="space-y-3">
          {/* The step's title already asks the question. */}
          <legend className="sr-only">{t('wizard.type.title')}</legend>
          {TYPES.map((type) => (
            <label
              key={type}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="type"
                className="mt-0.5 size-5 shrink-0 accent-primary"
                checked={draft.type === type}
                onChange={() =>
                  update({
                    type,
                    quantitative: type === 'quantitative' ? (draft.quantitative ?? { unit: '', target: 0, mode: 'at_least' }) : undefined,
                  })
                }
              />
              <span>
                <span className="block font-bold">{t(`wizard.type.${type}`)}</span>
                <span className="block text-sm text-muted-foreground">{t(`wizard.type.${type}Help`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {draft.type === 'quantitative' && draft.quantitative && <QuantitativeFields value={draft.quantitative} onChange={(quantitative) => update({ quantitative })} />}
    </>
  )
}

function InverseLawStep({ draft, update, titleId, field }: StepProps & { field: keyof InverseLaws }) {
  const { t } = useTranslation()
  return (
    <Input
      aria-labelledby={titleId}
      value={draft[field] ?? ''}
      onChange={(e) => update({ [field]: e.target.value })}
      placeholder={t(`wizard.${field}.example`)}
      autoComplete="off"
    />
  )
}

function FrequencyStep({ draft, update }: StepProps) {
  return <FrequencyPicker value={draft.frequency} onChange={(frequency) => update({ frequency })} periodOnly={draft.type === 'quantitative'} />
}

function VersionsStep({ draft, update }: StepProps) {
  const { t } = useTranslation()
  return (
    <>
      {(['minimumVersion', 'fullVersion'] as const).map((field) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{t(`wizard.versions.${field}`)}</Label>
          <Input
            id={field}
            value={draft[field] ?? ''}
            onChange={(e) => update({ [field]: e.target.value })}
            placeholder={t(`wizard.versions.${field}Example`)}
            autoComplete="off"
          />
        </div>
      ))}
    </>
  )
}

type WhenMode = '' | 'time' | 'afterHabitId' | 'afterAction'

function IntentionStep({ draft, update, habits, anchors }: StepProps) {
  const { t } = useTranslation()
  const { when, where } = draft.intention ?? {}
  const mode = (when ? Object.keys(when)[0] : '') as WhenMode
  const value = when ? Object.values(when)[0] : ''
  const setIntention = (changes: Intention) => update({ intention: { when, where, ...changes } })
  const phrase = intentionPhrase(draft, habits)
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="when">{t('wizard.intention.when')}</Label>
        <Select
          id="when"
          value={mode}
          onChange={(e) => {
            const m = e.target.value as WhenMode
            setIntention({ when: m ? ({ [m]: m === 'afterHabitId' ? (anchors[0]?.id ?? '') : '' } as When) : undefined })
          }}
        >
          <option value="">{t('wizard.intention.undecided')}</option>
          <option value="time">{t('wizard.intention.whenTime')}</option>
          {(anchors.length > 0 || mode === 'afterHabitId') && <option value="afterHabitId">{t('wizard.intention.whenHabit')}</option>}
          <option value="afterAction">{t('wizard.intention.whenAction')}</option>
        </Select>
      </div>
      {mode === 'time' && (
        <div className="space-y-2">
          <Label htmlFor="time">{t('wizard.intention.time')}</Label>
          <Input id="time" type="time" value={value} onChange={(e) => setIntention({ when: { time: e.target.value } })} />
        </div>
      )}
      {mode === 'afterHabitId' && (
        <div className="space-y-2">
          <Label htmlFor="anchor">{t('wizard.intention.habit')}</Label>
          {/* An archived or deleted anchor isn't offered: "Choose a habit" stays. */}
          <Select id="anchor" value={anchors.some((h) => h.id === value) ? value : ''} onChange={(e) => setIntention({ when: { afterHabitId: e.target.value } })}>
            <option value="" disabled>
              {t('wizard.intention.choose')}
            </option>
            {anchors.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {mode === 'afterAction' && (
        <div className="space-y-2">
          <Label htmlFor="action">{t('wizard.intention.action')}</Label>
          <Input
            id="action"
            value={value}
            onChange={(e) => setIntention({ when: { afterAction: e.target.value } })}
            placeholder={t('wizard.intention.actionExample')}
            autoComplete="off"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="where">{t('wizard.intention.where')}</Label>
        <Input id="where" value={where ?? ''} onChange={(e) => setIntention({ where: e.target.value })} placeholder={t('wizard.intention.whereExample')} autoComplete="off" />
      </div>
      <div aria-live="polite" className="space-y-1">
        {phrase && (
          <>
            <p className="text-sm text-muted-foreground">{t('wizard.intention.preview')}</p>
            <p className="rounded-lg border p-3 font-semibold break-words first-letter:uppercase">{phraseText(phrase, t)}</p>
          </>
        )}
      </div>
    </>
  )
}

function EnvironmentStep({ draft, update }: StepProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <Label htmlFor="environment">{t('wizard.environment.list')}</Label>
      {/* One thing per line: empty lines aren't saved. */}
      <textarea
        id="environment"
        rows={4}
        value={(draft.environment ?? []).join('\n')}
        onChange={(e) => update({ environment: e.target.value.split('\n') })}
        placeholder={t('wizard.environment.example')}
        className="w-full rounded-md border border-input bg-card px-3 py-2 text-base placeholder:text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      />
    </div>
  )
}

function RewardStep({ draft, update, titleId }: StepProps) {
  const { t } = useTranslation()
  return (
    <Input
      aria-labelledby={titleId}
      value={draft.pairedReward ?? ''}
      onChange={(e) => update({ pairedReward: e.target.value })}
      placeholder={t('wizard.reward.example')}
      autoComplete="off"
    />
  )
}

function NotFound() {
  const { t } = useTranslation()
  return <p>{t('habit.notFound')}</p>
}
