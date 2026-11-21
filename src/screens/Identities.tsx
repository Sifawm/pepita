import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useFormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { withId, db, useSettings } from '@/db'
import { moveIdentity, newIdentity, summarizeIdentities, type Identity, type IdentitySummary } from '@/domain'
import { focusById, identityName } from '@/lib/utils'
import { ScreenHeader } from '@/components/ScreenHeader'

export default function IdentitiesScreen() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [notice, setNotice] = useState('')
  const settings = useSettings()
  const data = useLiveQuery(async () => {
    const [identities, habits, logs] = await Promise.all([db.identities.toArray(), db.habits.toArray(), db.logs.toArray()])
    return { identities, habits, logs }
  })

  if (!data || !settings) return null
  const summary = summarizeIdentities({ ...data, now: new Date(), settings })
  const active = summary.filter((s) => !s.identity.archived)
  const archived = summary.filter((s) => s.identity.archived)

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const fresh = newIdentity(name, data.identities)
    if (!fresh.name) return
    setName('')
    await db.identities.add(withId<Identity>(fresh))
    setNotice(t('identities.created', { name: fresh.name }))
  }

  const move = async (identity: Identity, step: -1 | 1) => {
    const changes = moveIdentity(data.identities, identity.id, step)
    if (!changes.length) return
    await db.identities.bulkPut(changes)
    const position = active.findIndex((s) => s.identity.id === identity.id) + 1 + step
    setNotice(t('identities.moved', { name: identityName(identity, t), position }))
    // When reordering, React moves the node and focus can get lost: we give it back to the pressed button.
    requestAnimationFrame(() => {
      const [self, other] = [step, -step].map((s) => document.getElementById(`move${s}-${identity.id}`))
      ;(self instanceof HTMLButtonElement && !self.disabled ? self : other)?.focus()
    })
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <ScreenHeader id="identities-title" title={t('identities.title')} />
        <p className="text-muted-foreground">{t('identities.intro')}</p>
      </header>
      <p className="sr-only" aria-live="polite">
        {notice}
      </p>

      <ul aria-label={t('identities.list')} className="space-y-3">
        {active.map((s, i) => (
          <li key={s.identity.id}>
            <IdentityRow summary={s} first={i === 0} last={i === active.length - 1} onMove={move} />
          </li>
        ))}
      </ul>

      <form onSubmit={create} className="space-y-2">
        <Label htmlFor="new-identity">{t('identities.new')}</Label>
        <div className="flex gap-2">
          <Input
            id="new-identity"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('identities.example')}
            aria-describedby="new-identity-help"
            autoComplete="off"
          />
          {/* Disabled while empty rather than `required`: the field empties after creating, and a required empty field would turn red. */}
          <Button type="submit" disabled={!name.trim()}>
            {t('identities.create')}
          </Button>
        </div>
        <p id="new-identity-help" className="text-sm text-muted-foreground">
          {t('identities.help')}
        </p>
      </form>

      {archived.length > 0 && (
        <section aria-labelledby="archived" className="space-y-3">
          <h2 id="archived" tabIndex={-1} className="text-xl font-bold outline-none">
            {t('identities.archived')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('identities.archivedHelp')}</p>
          <ul className="space-y-3">
            {archived.map((s) => (
              <li key={s.identity.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <IdentityName summary={s} />
                <Button variant="ghost" onClick={() => db.identities.update(s.identity.id, { archived: false }).then(() => focusById('identities-title'))}>
                  <ArchiveRestore aria-hidden />
                  {t('identities.restore')}
                  <span className="sr-only">{identityName(s.identity, t)}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function IdentityName({ summary: { identity, votes, votesToday } }: { summary: IdentitySummary }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0 flex-1">
      <Link
        to={`/identities/${identity.id}`}
        className="inline-flex min-h-11 items-center rounded-md text-lg font-semibold break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        {identityName(identity, t)}
      </Link>
      <p className="text-sm text-muted-foreground">
        {t('identities.votes', { count: votes })}
        {' · '}
        {t('identities.votesToday', { count: votesToday })}
      </p>
    </div>
  )
}

function IdentityRow({
  summary,
  first,
  last,
  onMove,
}: {
  summary: IdentitySummary
  first: boolean
  last: boolean
  onMove: (identity: Identity, step: -1 | 1) => void
}) {
  const { t } = useTranslation()
  const { identity } = summary
  const name = identityName(identity, t)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(identity.name)
  const { form, message } = useFormError()

  const rename = async (e: FormEvent) => {
    e.preventDefault()
    const clean = text.trim()
    // "General" can be left without a name of its own (it goes back to the translated one); the others can't.
    if (!clean && !identity.isGeneral) return
    await db.identities.update(identity.id, { name: clean })
    setEditing(false)
    focusById(`rename-button-${identity.id}`)
  }

  if (editing) {
    const field = `rename-${identity.id}`
    return (
      <form onSubmit={rename} {...form} className="space-y-2 rounded-lg border bg-card p-4">
        <Label htmlFor={field}>{t('identities.renameField')}</Label>
        <Input
          id={field}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={identity.isGeneral ? t('identity.general') : t('identities.example')}
          required={!identity.isGeneral}
          autoFocus
          autoComplete="off"
        />
        {message}
        <div className="flex gap-2">
          <Button type="submit">{t('identities.save')}</Button>
          <Button type="button" variant="ghost" onClick={() => (setText(identity.name), setEditing(false), focusById(`rename-button-${identity.id}`))}>
            {t('identities.cancel')}
          </Button>
        </div>
      </form>
    )
  }

  const icon = 'w-11 px-0'
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <IdentityName summary={summary} />
      <div className="flex flex-wrap gap-1">
        <Button id={`move-1-${identity.id}`} variant="ghost" className={icon} disabled={first} onClick={() => onMove(identity, -1)} aria-label={t('identities.moveUp', { name })}>
          <ArrowUp aria-hidden />
        </Button>
        <Button id={`move1-${identity.id}`} variant="ghost" className={icon} disabled={last} onClick={() => onMove(identity, 1)} aria-label={t('identities.moveDown', { name })}>
          <ArrowDown aria-hidden />
        </Button>
        <Button id={`rename-button-${identity.id}`} variant="ghost" onClick={() => setEditing(true)}>
          <Pencil aria-hidden />
          {t('identities.rename')}
          <span className="sr-only">{name}</span>
        </Button>
        {/* "General" can't be archived: it's where habits without an identity go. */}
        {!identity.isGeneral && (
          <Button variant="ghost" onClick={() => db.identities.update(identity.id, { archived: true }).then(() => focusById('archived'))}>
            <Archive aria-hidden />
            {t('identities.archive')}
            <span className="sr-only">{name}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
