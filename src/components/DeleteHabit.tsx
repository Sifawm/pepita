import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { deleteHabit, db } from '@/db'
import type { Habit } from '@/domain'
import { focusById } from '@/lib/utils'

/** Deleting is forever: it asks for explicit confirmation, with focus on the safe option. */
export function DeleteHabit({ habit, onDelete }: { habit: Habit; onDelete?: () => void }) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const logs = useLiveQuery(() => db.logs.where('habitId').equals(habit.id).count(), [habit.id])
  const titleId = `delete-${habit.id}-title`
  const textId = `delete-${habit.id}-text`

  if (!confirming)
    return (
      <Button id={`delete-${habit.id}`} variant="ghost" className="text-destructive" onClick={() => setConfirming(true)}>
        {t('habit.delete')}
        <span className="sr-only">{habit.name}</span>
      </Button>
    )
  return (
    <div role="alertdialog" aria-labelledby={titleId} aria-describedby={textId} className="space-y-3 rounded-lg border bg-card p-4">
      <h3 id={titleId} className="text-lg font-bold">
        {t('habit.deleteTitle', { name: habit.name })}
      </h3>
      <p id={textId}>{t('habit.deleteText', { count: logs ?? 0 })}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="bg-destructive text-background hover:bg-destructive/90"
          onClick={async () => {
            await deleteHabit(habit.id)
            onDelete?.()
          }}
        >
          {t('habit.deleteConfirm')}
        </Button>
        <Button variant="secondary" autoFocus onClick={() => (setConfirming(false), focusById(`delete-${habit.id}`))}>
          {t('habit.cancel')}
        </Button>
      </div>
    </div>
  )
}
