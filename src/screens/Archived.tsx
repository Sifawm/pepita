import { useLiveQuery } from 'dexie-react-hooks'
import { ArchiveRestore } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DeleteHabit } from '@/components/DeleteHabit'
import { Button } from '@/components/ui/button'
import { db } from '@/db'
import { focusById, identityName } from '@/lib/utils'
import { ScreenHeader } from '@/components/ScreenHeader'

export default function ArchivedScreen() {
  const { t } = useTranslation()
  const data = useLiveQuery(async () => {
    const [habits, identities] = await Promise.all([db.habits.orderBy('order').toArray(), db.identities.toArray()])
    return { habits: habits.filter((h) => h.archived), identities }
  })
  if (!data) return null

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <ScreenHeader id="archived-title" title={t('archived.title')} />
        <p className="text-muted-foreground">{t('archived.intro')}</p>
      </header>

      {data.habits.length === 0 ? (
        <p className="text-muted-foreground">{t('archived.empty')}</p>
      ) : (
        <ul aria-label={t('archived.title')} className="space-y-3">
          {data.habits.map((habit) => {
            const identity = data.identities.find((i) => i.id === habit.identityId)
            return (
              <li key={habit.id} className="space-y-3 rounded-lg border bg-card p-4">
                <div>
                  <h2 className="text-lg font-semibold break-words">{habit.name}</h2>
                  {identity && <p className="text-sm text-muted-foreground">{identityName(identity, t)}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" onClick={async () => (await db.habits.update(habit.id, { archived: false }), focusById('archived-title'))}>
                    <ArchiveRestore aria-hidden />
                    {t('habit.restore')}
                    <span className="sr-only">{habit.name}</span>
                  </Button>
                  <DeleteHabit habit={habit} onDelete={() => focusById('archived-title')} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
