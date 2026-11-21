import type { AppData } from './types'

/**
 * Onboarding only shows up on its own if the person hasn't added anything of their own yet: no habit
 * (archived ones included) and only an unnamed "General". Without habits there are no logs or anything else.
 */
export const needsOnboarding = ({ habits, identities }: Pick<AppData, 'habits' | 'identities'>) =>
  habits.length === 0 && identities.every((i) => i.isGeneral && !i.name)
