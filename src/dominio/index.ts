// Interfaz pública del núcleo de dominio. La interfaz y los tests importan solo de aquí.
export * from './tipos'
export { diaLogico } from './calendario'
export { evaluarHabito, type EstadoPeriodo, type EvaluacionHabito, type Periodo } from './evaluacion'
export { editarHabito, nuevoHabito, type CamposHabito, type DatosHabito } from './habito'
export { anotar, componerHoy, toque, type AccionToque, type Hoy, type TarjetaHoy } from './hoy'
export { moverIdentidad, nuevaIdentidad, resumirIdentidades, type ResumenIdentidad } from './identidad'
export { DIAS_AVISO_COPIA, exportar, importar, necesitaCopia, registrosCsv, VERSION_ESQUEMA, type Copia, type ErrorImportacion, type ResultadoImportacion } from './copia'
