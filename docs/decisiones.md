# Decisiones de producto (sesión de definición)

## Ronda 1

| # | Decisión |
|---|---|
| R1.1 | Uso personal, publicada como **open source** para quien quiera usarla. Sin modelo de negocio. |
| R1.2 | Sigue el método de *Hábitos Atómicos* por defecto, pero permite un uso más laxo (una sola app para ambos casos). |
| R1.3 | Modelo central: **Identidad → Hábitos**; cada registro cuenta como un voto. Rutinas y cadenas, después. |
| R1.4 | Fallo compasivo: **«nunca falles dos veces»** como regla central. Saltar, fallar y pausar son cosas distintas. Sin castigos. |
| R1.5 | **PWA**, sin depender de stores. Cada persona es dueña de sus datos. |
| R1.6 | *Local-first*, sin cuenta; sincronización opcional; exportación desde la v1. |
| R1.7 | v1 individual (contrato de hábitos escrito, sin testigos). Social en la v2, ya previsto en el modelo de datos. |
| R1.8 | Descartadas las apuestas con dinero. |
| R1.9 | Gamificación ligera: celebración al registrar, votos, hitos. Sin RPG, mascota ni moneda. |
| R1.10 | Contenido propio y contextual. No se reproduce texto del libro ni se usa la marca. |
| R1.11 | **Español e inglés** desde la v1, con i18n desde el inicio. |

## Tecnología: distribución en iOS

| # | Decisión |
|---|---|
| T.1 | Solo **PWA**. Descartadas la instalación por Apple ID gratuito o SideStore (caduca a los 7 días, máximo 3 apps) y la distribución en la UE (exige pagar el Developer Program). Capacitor queda como opción futura, no planificada. |

## Ronda 2

| # | Decisión |
|---|---|
| R2.12 | Licencia **AGPL-3.0**. Se despliega como web estática (GitHub o Codeberg Pages) y se puede autoalojar. |
| R2.13 | **Modo laxo**: un único asistente que sigue el libro; cada paso se puede saltar con «Ahora no». Los hábitos sin identidad van a «General». La revisión semanal recuerda los campos vacíos. |
| R2.14 | Recordatorios. v1: notificaciones con la app abierta y exportación **.ics** (alarma + frase de intención). v2: push opcional autoalojable. |
| R2.15 | v1: exportar e importar en JSON, exportar en CSV, `storage.persist()`, aviso de copia de seguridad e invitación a instalar en iOS. Sincronización (WebDAV o servidor propio) en la v2. |
| R2.16 | **React + TS + Vite + Tailwind + shadcn/ui** (sistema de diseño desde el primer día), Dexie, vite-plugin-pwa, i18next. Las reglas, en funciones puras con su test. |
| R2.17 | Tipos v1: **sí/no** y **cuantitativo** («al menos X» / «como mucho X»). Sin temporizador. |
| R2.18 | Frecuencia: **X veces por periodo** (día, semana o mes) o días concretos de la semana. |
| R2.19 | **Versión mínima (2 min) y versión completa**. La mínima cuenta como un voto completo; las estadísticas distinguen entre ambas. |
| R2.20 | **Nunca falles dos veces**. Un fallo es un periodo programado sin cumplir, sin saltar y sin pausa. Un fallo deja el siguiente periodo como **de recuperación** (destacado, con sugerencia de hacer la mínima). Dos fallos rompen la racha y abren un **diagnóstico de las 4 leyes**. |
| R2.21 | Métrica estrella: **votos por identidad** (nunca bajan). Cada hábito muestra su **fuerza** (fórmula de Loop). La racha queda en segundo plano. |
| R2.22 | **Intención de implementación**: Cuándo (una hora, o «después de» otro hábito o una acción) + Dónde. Generan una frase que aparece en la tarjeta y en el recordatorio. |
| R2.23 | Tipo **«a evitar»** con asistente de leyes inversas (señal, fricción, sustituto). Se registra la **recaída** con su disparador. Cada día limpio cuenta como voto. |
| R2.24 | Sin IA en la v1. Más adelante, opcional con clave propia o modelo local. |

## Ronda 3

| # | Decisión |
|---|---|
| R3.25 | Varias identidades. Cada hábito pertenece a **una** (o a «General»). Archivar una identidad conserva sus votos. |
| R3.26 | **1 voto por registro cumplido** (versión mínima o completa). Cuantitativos: 1 voto por periodo en que se alcanza la meta. «A evitar»: 1 voto por cada día limpio, que se suma solo al cerrar el día. |
| R3.27 | El día termina a una **hora configurable (04:00 por defecto)**. Un periodo sin registro cuenta como **fallo** al cerrarse. **Edición retroactiva ilimitada**. |
| R3.28 | Tres opciones en la v1: **saltar** un periodo (motivo opcional, neutral), **pausar** un hábito entre fechas y **pausa global** (vacaciones). |
| R3.29 | **Ricitos de Oro**: solo sugerencias, nunca cambios automáticos. Subir el listón tras ~3 semanas con fuerza alta; bajarlo tras un diagnóstico. |
| R3.30 | Campos opcionales **«Prepara tu entorno»** (lista) y **«Recompensa asociada»** (agrupar tentaciones), visibles en la tarjeta. |
| R3.31 | El **contrato de hábitos** queda fuera de la v1. Entrará con lo social. |
| R3.32 | La **tabla de hábitos** queda fuera de la v1. |
| R3.33 | **Revisión semanal** en la v1: votos por identidad, hábitos en recuperación o diagnóstico, sugerencias de escalado, campos vacíos y nota libre. La revisión de identidad, más adelante. |
| R3.34 | **Hoy**: primero los hábitos en recuperación; luego, ordenados por su Cuándo, con cada hábito apilado bajo su ancla; al final, los que no tienen hora. Filtro por identidad y votos del día. |
| R3.35 | **Toque = versión mínima, pulsación larga = completa**. Celebración «+1 voto · [identidad]». Nota opcional en cada registro. Motivo del fallo según las 4 leyes. |
| R3.36 | **Onboarding**: idioma → identidad → un hábito (mínima, Cuándo y Dónde; el resto se puede saltar) → registrar hoy → instalar la PWA y activar `persist()`. Sin cuenta. |
| R3.37 | Contenido v1: ~20 microtextos propios (ES/EN) en el asistente, el diagnóstico y el escalado. Sin lecciones diarias. |
| R3.38 | Nombre: **Pepita** (de «Pepito Grillo», en femenino y sin la marca Disney). Repositorio en `Workspaces/pepita`. |

## Ronda 4

| # | Decisión |
|---|---|
| R4.39 | **Voz de Pepita**: una conciencia amable. Tutea, es breve y nunca culpabiliza. Es solo una voz: sin mascota ni avatar. |
| R4.40 | La revisión semanal tiene una **vista imprimible o en PDF** (CSS de impresión). El periodo y el contenido se eligen antes de imprimir. |
| R4.41 | **Diagnóstico → una acción con un toque** según la ley que falla. 1ª: Cuándo/Dónde o .ics. 2ª: recompensa o identidad. 3ª: versión mínima o entorno. 4ª: votos visibles, o pausar/archivar sin culpa. |
| R4.42 | Estadísticas de la v1. Por identidad: curva de votos acumulados. Por hábito: fuerza, mapa de calor, versión mínima frente a completa, racha actual y mejor. |
| R4.43 | **Hitos** en 10, 25, 50, 100, 250, 500 y 1000 votos por identidad. |
| R4.44 | **Directo a código** con shadcn/ui y un tema propio. Penpot, más adelante, para la identidad visual. |
| R4.45 | Entregable: `docs/especificacion-v1.md` (modelo de datos, reglas, pantallas, v1 frente a v2). Después, montar el proyecto. |
| R4.46 | GitHub + GitHub Pages (como el resto de proyectos). |
