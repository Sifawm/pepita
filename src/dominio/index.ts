// Interfaz pública del núcleo de dominio. La interfaz y los tests importan solo de aquí.
export * from './tipos'
export { diaLogico } from './calendario'
export { nuevoHabito, type DatosHabito } from './habito'
export { componerHoy, toque, type AccionToque, type Hoy, type TarjetaHoy } from './hoy'
