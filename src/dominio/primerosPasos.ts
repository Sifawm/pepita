import type { Datos } from './tipos'

/**
 * Los primeros pasos solo aparecen solos si la persona aún no ha puesto nada suyo: ningún hábito
 * (tampoco archivado) y solo «General», sin nombre propio. Sin hábitos no hay registros ni el resto.
 */
export const necesitaPrimerosPasos = ({ habitos, identidades }: Pick<Datos, 'habitos' | 'identidades'>) =>
  habitos.length === 0 && identidades.every((i) => i.esGeneral && !i.nombre)
