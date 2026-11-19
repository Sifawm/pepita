# Pepita v1: especificación

> Fuente de verdad para construir la v1. Las decisiones y su porqué están en [decisiones.md](decisiones.md) (referencias R·x). La investigación del mercado está en [investigacion/](investigacion/README.md).

## Vocabulario del dominio

| Término | Significado |
|---|---|
| **Identidad** | El tipo de persona que quieres ser («Soy una persona que lee»). Agrupa hábitos y acumula votos. Existe una identidad especial, **General**, para los hábitos sin identidad. |
| **Hábito** | Una conducta con tipo, frecuencia, versión mínima y completa, e intención. Pertenece a una identidad. |
| **Tipo** | `sí/no`, `cuantitativo` («al menos X» o «como mucho X») o `a evitar`. |
| **Versión mínima / completa** | La versión de 2 minutos y la versión ideal del hábito. Las dos cuentan como un voto. |
| **Intención** | **Cuándo** (una hora, «después de [hábito]» o «después de [acción libre]») y **Dónde**. Con ellas se genera la frase de intención. |
| **Ancla** | El hábito tras el cual se hace otro (apilamiento). |
| **Periodo** | La unidad que se evalúa: un día, una semana o un mes, o cada día concreto de la semana. |
| **Día lógico** | El día según la **hora de cierre** (04:00 por defecto). Un registro a la 01:00 cuenta para el día anterior. |
| **Registro** | Cada anotación de la persona usuaria: versión mínima, versión completa, valor, salto o recaída. |
| **Voto** | +1 para una identidad por cada acción cumplida. Los fallos no restan votos. |
| **Fuerza** | Indicador de 0 a 1 por hábito (suavizado exponencial, fórmula de Loop). Perdona los fallos aislados. |
| **Fallo** | Periodo programado y ya cerrado que no se cumplió, ni se saltó, ni estaba en pausa. |
| **Recuperación** | Estado del periodo actual cuando el anterior fue un fallo. |
| **Diagnóstico** | Se abre tras dos fallos seguidos. Pregunta qué ley falló y ofrece una acción. |
| **Salto** | Periodo marcado como neutro a propósito. |
| **Pausa** | Rango de fechas sin evaluación. Puede ser de un hábito o global («vacaciones»). |
| **Recaída** | Registro de un hábito *a evitar*. Convierte ese día en fallo. |
| **Hito** | Umbral de votos de una identidad: 10, 25, 50, 100, 250, 500 o 1000. |
| **Revisión semanal** | Pantalla de repaso de la semana. Tiene vista imprimible. |

## Problem Statement

Quiero mejorar mis hábitos siguiendo el método de *Hábitos Atómicos*. Las apps que hay me obligan a elegir:

- Unas son trackers neutros (Habitify, Streaks, Loop). Registran bien, pero no trabajan nada de lo que hace útil el libro: la identidad, la versión de 2 minutos, la intención, el entorno, ni un método para romper hábitos.
- La app oficial (Atoms) se queda en la superficie, limita los hábitos a uno o seis, es de pago y deja los datos en manos de terceros.

Además, casi todas castigan el fallo con rachas de todo o nada. Una mala semana te hace sentir que has perdido todo el progreso, y eso es justo lo que lleva a abandonar.

También quiero que mis datos sean míos: sin cuentas, sin tiendas de apps y sin depender de un servidor ajeno. Y quiero poder enseñar mi progreso a mi psicóloga.

## Solution

**Pepita** es una PWA open source (AGPL-3.0) y *local-first*, en español e inglés, que hace de «conciencia amable». Te guía por el método del libro y deja saltar cualquier paso, así que sirve tanto para seguir el método al pie de la letra como para usarla de forma más laxa.

- Cada hábito cuelga de una **identidad**, y cada acción cumplida es un **voto** por ella. Los votos nunca bajan.
- Cada hábito tiene una **versión mínima** de 2 minutos que cuenta igual que la completa. Hacerla debe ser lo más fácil: basta un toque.
- La regla central es **«nunca falles dos veces»**. Un fallo pone el hábito en recuperación. Dos fallos seguidos abren un diagnóstico de las 4 leyes, y el diagnóstico propone un cambio concreto que se aplica con un toque.
- Los hábitos **a evitar** tienen su propio asistente de leyes inversas y se registran por recaídas.
- La **revisión semanal** reúne lo importante y se puede imprimir o guardar en PDF.
- Todos los datos viven en el dispositivo. Hay exportación e importación completas, y los recordatorios se exportan al calendario del sistema (.ics).

## User Stories

### Primeros pasos

1. Como persona usuaria, quiero elegir el idioma (español o inglés) al abrir la app por primera vez, para entender todo desde el principio.
2. Como persona usuaria, quiero que la app detecte el idioma de mi navegador como propuesta inicial, para no tener que configurarlo.
3. Como persona usuaria, quiero que lo primero que me pregunten sea quién quiero ser, para que mis hábitos partan de una identidad.
4. Como persona usuaria, quiero crear un único hábito durante el onboarding, para no agobiarme al empezar.
5. Como persona usuaria, quiero registrar la versión mínima de mi primer hábito al terminar el onboarding, para conseguir mi primer voto en menos de 2 minutos.
6. Como persona usuaria, quiero usar la app sin crear ninguna cuenta, para que mis datos no salgan de mi dispositivo.
7. Como persona usuaria de iPhone, quiero que me expliquen cómo instalar la app en la pantalla de inicio, para que Safari no borre mis datos.
8. Como persona usuaria, quiero que la app pida almacenamiento persistente al navegador, para que mis datos no se eliminen por falta de espacio.
9. Como persona usuaria, quiero poder saltarme cualquier paso del onboarding salvo el nombre del hábito, para empezar rápido si no me apetece pensar ahora.

### Identidades

10. Como persona usuaria, quiero crear varias identidades, para trabajar distintas facetas de mi vida.
11. Como persona usuaria, quiero escribir cada identidad como una frase («Soy una persona que…»), para reforzar cómo me veo.
12. Como persona usuaria, quiero ver el total de votos acumulados de cada identidad, para notar el progreso aunque todavía no vea resultados.
13. Como persona usuaria, quiero ver una curva de votos acumulados por identidad, para ver cómo crece con el tiempo.
14. Como persona usuaria, quiero renombrar una identidad, para ajustarla cuando cambie mi forma de verme.
15. Como persona usuaria, quiero archivar una identidad sin perder sus votos ni sus hábitos, para retirarla sin borrar mi historia.
16. Como persona usuaria, quiero que los hábitos sin identidad vayan a «General» y también sumen votos, para no estar obligada a definir una identidad.
17. Como persona usuaria, quiero una celebración especial al llegar a 10, 25, 50, 100, 250, 500 y 1000 votos en una identidad, para sentir los hitos.
18. Como persona usuaria, quiero que cada hito se celebre una sola vez, aunque luego edite registros, para no recibir celebraciones repetidas.

### Crear y editar hábitos (asistente)

19. Como persona usuaria, quiero un asistente que me guíe paso a paso por el método del libro al crear un hábito, para que mis hábitos estén bien planteados.
20. Como persona usuaria, quiero poder pulsar «Ahora no» en cualquier paso opcional del asistente, para usar la app de forma más laxa cuando quiera.
21. Como persona usuaria, quiero elegir a qué identidad pertenece un hábito, para que sus votos sumen donde corresponde.
22. Como persona usuaria, quiero elegir el tipo de hábito (sí/no, cuantitativo o a evitar), para registrar cada conducta como tiene sentido.
23. Como persona usuaria, quiero definir un hábito cuantitativo con unidad y objetivo («al menos 20 páginas»), para medir cantidades.
24. Como persona usuaria, quiero definir un hábito cuantitativo con límite («como mucho 2 cafés»), para moderar algo sin tener que eliminarlo.
25. Como persona usuaria, quiero elegir la frecuencia como «X veces por día, semana o mes», para no estar atada a hacerlo a diario.
26. Como persona usuaria, quiero elegir días concretos de la semana como frecuencia, para hábitos que solo tocan esos días.
27. Como persona usuaria, quiero escribir la versión mínima (2 minutos) y la completa de cada hábito, para tener una opción digna en los días malos.
28. Como persona usuaria, quiero que en los hábitos cuantitativos «al menos X» la versión mínima sea un objetivo reducido, para que también cuente como voto.
29. Como persona usuaria, quiero indicar **cuándo** hago el hábito (una hora, después de otro hábito o después de una acción libre), para que tenga un disparador claro.
30. Como persona usuaria, quiero indicar **dónde** hago el hábito, para completar mi intención de implementación.
31. Como persona usuaria, quiero ver la frase generada («Después de servirme el café, en la cocina, leeré 1 página»), para tener mi intención clara y visible.
32. Como persona usuaria, quiero añadir una lista «Prepara tu entorno», para reducir la fricción antes de empezar.
33. Como persona usuaria, quiero añadir una «Recompensa asociada» («solo escucho mi podcast mientras camino»), para hacer el hábito más atractivo.
34. Como persona usuaria, quiero que un hábito *a evitar* me pregunte qué señal voy a eliminar, qué fricción voy a añadir y qué haré en su lugar, para romperlo con método.
35. Como persona usuaria, quiero ver ayudas breves de Pepita en cada paso del asistente, para entender por qué me lo pregunta.
36. Como persona usuaria, quiero editar cualquier campo de un hábito después de crearlo, para ajustarlo cuando aprenda algo.
37. Como persona usuaria, quiero que cambiar la frecuencia o el objetivo no reescriba cómo se evaluaron los periodos pasados, para que mi historia siga siendo verdad.
38. Como persona usuaria, quiero archivar un hábito conservando su historial y sus votos, para dejarlo sin perder lo conseguido.
39. Como persona usuaria, quiero borrar un hábito con confirmación explícita, para eliminar algo creado por error.
40. Como persona usuaria, quiero crear todos los hábitos e identidades que quiera, sin límites.

### Pantalla Hoy y registro

41. Como persona usuaria, quiero una pantalla Hoy con los hábitos que tocan, para saber qué hacer de un vistazo.
42. Como persona usuaria, quiero ver arriba del todo los hábitos en recuperación, destacados, para no fallar dos veces.
43. Como persona usuaria, quiero ver los hábitos ordenados por su hora, para seguir el ritmo de mi día.
44. Como persona usuaria, quiero ver cada hábito anclado justo debajo de su ancla, para ver mis cadenas de hábitos.
45. Como persona usuaria, quiero ver al final los hábitos sin hora, para tenerlos presentes sin que estorben.
46. Como persona usuaria, quiero filtrar Hoy por identidad, para centrarme en una faceta.
47. Como persona usuaria, quiero ver los votos que llevo hoy, para sentir el avance del día.
48. Como persona usuaria, quiero registrar la versión mínima con un toque, para que lo más fácil sea aparecer.
49. Como persona usuaria, quiero registrar la versión completa con una pulsación larga, para distinguirla sin otro botón.
50. Como persona usuaria, quiero introducir un valor (sumándolo al que ya tenía) en los hábitos cuantitativos, para registrar cantidades parciales a lo largo del día.
51. Como persona usuaria, quiero ver una celebración «+1 voto · [identidad]» al registrar, para que el hábito resulte satisfactorio en el momento.
52. Como persona usuaria, quiero añadir una nota opcional a cualquier registro, para recordar el contexto.
53. Como persona usuaria, quiero deshacer un registro hecho por error, para mantener los datos fieles.
54. Como persona usuaria, quiero ver en la tarjeta del hábito la frase de intención, el entorno y la recompensa asociada, para tenerlos presentes al hacerlo.
55. Como persona usuaria, quiero ver en los hábitos de «X veces por periodo» cuántas llevo de cuántas, para saber cuánto me falta.
56. Como persona usuaria, quiero registrar una recaída en un hábito *a evitar*, con su disparador opcional, para aprender qué la provoca.
57. Como persona usuaria, quiero que cada día sin recaída sume un voto solo al cerrarse, para no tener que registrar algo que no hice.

### Días lógicos, olvidos y edición retroactiva

58. Como persona usuaria, quiero configurar la hora de cierre del día (04:00 por defecto), para que trasnochar no me cuente como el día siguiente.
59. Como persona usuaria, quiero que un periodo sin registro cuente como fallo solo cuando se cierre, para tener todo el periodo para cumplir.
60. Como persona usuaria, quiero registrar o corregir cualquier día pasado, para que un olvido no se convierta en un fallo falso.
61. Como persona usuaria, quiero que al corregir el pasado se recalculen votos, fuerza, rachas, recuperaciones y diagnósticos, para que todo cuadre.

### Fallos, recuperación y diagnóstico

62. Como persona usuaria, quiero que un fallo aislado no rompa mi racha, para que un mal día no me haga sentir que lo he perdido todo.
63. Como persona usuaria, quiero que tras un fallo el siguiente periodo quede marcado como de recuperación y me sugiera la versión mínima, para no fallar dos veces.
64. Como persona usuaria, quiero que tras dos fallos seguidos la app me proponga un diagnóstico, para entender qué no funciona en lugar de culparme.
65. Como persona usuaria, quiero responder al diagnóstico eligiendo una de cuatro causas (no lo vi / no me apetecía / era difícil / no compensaba), para identificar qué ley falla.
66. Como persona usuaria, quiero que cada causa me ofrezca una acción concreta aplicable con un toque, para corregir el hábito sin esfuerzo.
67. Como persona usuaria, quiero poder posponer o descartar un diagnóstico, para no sentirme obligada.
68. Como persona usuaria, quiero anotar de forma opcional el motivo de cualquier fallo según las 4 leyes, para tener datos en la revisión.
69. Como persona usuaria, quiero que los textos de Pepita nunca me culpabilicen, para que la app sea un apoyo y no un juez.

### Saltos y pausas

70. Como persona usuaria, quiero saltar un periodo con un motivo opcional, para que un día justificado no cuente como fallo.
71. Como persona usuaria, quiero que un salto no sume ni reste votos, fuerza o racha, para que sea realmente neutro.
72. Como persona usuaria, quiero pausar un hábito entre dos fechas, para periodos en los que no aplica.
73. Como persona usuaria, quiero activar una pausa global con fecha de fin, para irme de vacaciones o estar enferma sin preocuparme.
74. Como persona usuaria, quiero que la pausa global termine sola en su fecha, para no olvidarme de reactivar nada.

### Progreso y estadísticas

75. Como persona usuaria, quiero ver la evolución de la fuerza de cada hábito, para ver cuánto se está asentando.
76. Como persona usuaria, quiero ver un calendario tipo mapa de calor por hábito, para ver patrones de un vistazo.
77. Como persona usuaria, quiero ver la proporción entre versión mínima y completa de cada hábito, para saber si estoy lista para subir el listón.
78. Como persona usuaria, quiero ver la racha actual y la mejor de cada hábito, en segundo plano, para tenerlas como referencia sin que sean lo principal.

### Escalado progresivo (Ricitos de Oro)

79. Como persona usuaria, quiero que la app me sugiera subir el listón cuando un hábito lleva unas 3 semanas con fuerza alta, para mantener el reto en su punto.
80. Como persona usuaria, quiero que tras un diagnóstico de dificultad la app me sugiera quedarme solo con la versión mínima, para recuperar la constancia.
81. Como persona usuaria, quiero que las sugerencias nunca cambien nada sin mi permiso y se puedan descartar, para mantener el control.
82. Como persona usuaria, quiero que una sugerencia descartada no vuelva a aparecer en un tiempo, para no sentirme presionada.

### Revisión semanal e informe

83. Como persona usuaria, quiero una revisión semanal opcional que me muestre los votos de la semana por identidad, para cerrar la semana con perspectiva.
84. Como persona usuaria, quiero ver en la revisión los hábitos en recuperación y los diagnósticos pendientes, para atender lo que necesita atención.
85. Como persona usuaria, quiero ver en la revisión las sugerencias de escalado, para decidir ajustes con calma.
86. Como persona usuaria, quiero que la revisión me recuerde con suavidad los campos del método que dejé vacíos, para volver al libro cuando quiera.
87. Como persona usuaria, quiero escribir una nota libre en cada revisión, para reflexionar.
88. Como persona usuaria, quiero una vista imprimible o en PDF de la revisión, eligiendo el periodo y qué incluir, para compartirla con mi psicóloga.

### Recordatorios

89. Como persona usuaria, quiero exportar mis recordatorios a un fichero .ics con alarma y la frase de intención, para recibir avisos fiables del calendario de mi móvil sin servidor.
90. Como persona usuaria, quiero que los hábitos anclados aparezcan en la descripción del recordatorio de su ancla, para recordar la cadena entera.
91. Como persona usuaria, quiero recibir notificaciones mientras la app está abierta, si doy permiso, para tener avisos sin configurar nada más.

### Datos y copias

92. Como persona usuaria, quiero exportar todos mis datos en JSON, para tener una copia completa.
93. Como persona usuaria, quiero exportar mis registros en CSV, para analizarlos en una hoja de cálculo.
94. Como persona usuaria, quiero importar una copia en JSON con validación y confirmación, para restaurar mis datos o pasarlos a otro dispositivo.
95. Como persona usuaria, quiero que una importación inválida se rechace sin tocar mis datos actuales, para no perder nada por un fichero corrupto.
96. Como persona usuaria, quiero un aviso amable si llevo más de 7 días sin hacer copia, para no perder datos.
97. Como persona usuaria, quiero que la app funcione sin conexión, para usarla en cualquier sitio.
98. Como persona usuaria, quiero que la app no haga ninguna llamada de red ni tenga telemetría, para confiar en que mis datos son solo míos.

### Ajustes, accesibilidad y apariencia

99. Como persona usuaria, quiero cambiar el idioma en cualquier momento, para usar la app como prefiera.
100. Como persona usuaria, quiero que la app siga el tema claro u oscuro del sistema, para usarla cómodamente de noche.
101. Como persona usuaria, quiero que la app cumpla el nivel AA de accesibilidad (contraste, tamaños de toque, foco visible, alternativa a la pulsación larga para el lector de pantalla), para usarla con cualquier capacidad.
102. Como persona que quiere alojar su propia instancia, quiero servir la app como ficheros estáticos en cualquier servidor, para no depender de la instancia pública.
103. Como persona que contribuye al proyecto, quiero que las reglas del dominio estén separadas de la interfaz y cubiertas por tests, para cambiarlas con seguridad.

## Implementation Decisions

### Stack y despliegue
- React + TypeScript + Vite + Tailwind + **shadcn/ui** (con un tema propio de Pepita), **Dexie** sobre IndexedDB, **vite-plugin-pwa** (precache offline, manifest e instalación) e **i18next** (es/en, con plurales).
- Enrutado **por hash**, para que funcione en GitHub Pages sin reescrituras.
- Despliegue estático en **GitHub Pages** mediante GitHub Actions. Licencia **AGPL-3.0**.
- Cero llamadas de red en tiempo de ejecución, salvo la descarga de la propia app. Las fuentes y los iconos van empaquetados.

### Módulos
1. **Núcleo de dominio** (puro: sin React, sin Dexie, sin `Date.now()` implícito; recibe `ahora` y `ajustes` como parámetros). Es la única unidad con lógica y la única que se testea. Expone:
   - **Calendario**: día lógico según la hora de cierre y cálculo de periodos (la semana empieza el lunes).
   - **Evaluación de hábito**: dado un hábito, sus registros, los ajustes y el instante actual, devuelve la lista de periodos con su estado (`cumplido-mínima`, `cumplido-completa`, `fallido`, `saltado`, `pausado`, `en-curso`, `no-programado`), votos, racha actual y mejor, serie de fuerza, si está en recuperación, si tiene un diagnóstico pendiente, la proporción entre mínima y completa, y la sugerencia de escalado vigente.
   - **Resumen de identidad**: votos totales, serie acumulada e hitos alcanzados y pendientes de celebrar.
   - **Composición de Hoy**: orden (recuperación → por hora, con los anclados detrás de su ancla → sin hora), filtro por identidad y votos del día.
   - **Revisión semanal**: los datos agregados de la semana.
   - **Frase de intención**: devuelve una estructura (no texto); la interfaz la traduce.
   - **Generador .ics**: texto iCalendar a partir de hábitos y ajustes.
   - **Exportación e importación**: serializa y **valida estrictamente** la importación (es una frontera de confianza).
   - **CSV**: registros en formato plano.
2. **Persistencia**: base Dexie con las tablas del esquema y consultas reactivas. Sin lógica de negocio.
3. **Interfaz**: pantallas Onboarding, Hoy, Asistente de hábito (crear y editar), Detalle de hábito, Identidades (lista y detalle), Diagnóstico (modal), Revisión semanal (con vista imprimible vía CSS de impresión), Ajustes y Archivados.
4. **PWA**: manifest, service worker, `navigator.storage.persist()`, guía de instalación para iOS y aviso de copia.
5. **i18n**: todos los textos, incluidos los ~20 microtextos de Pepita, en ficheros de idioma es/en desde el primer día.

### Esquema (versión 1)

Todos los registros tienen `id` (UUID) y `creadoEn`. Las fechas de día se guardan como `AAAA-MM-DD` (día lógico).

- **Ajustes**: idioma, `horaCierre` (por defecto `"04:00"`), `pausaGlobal` (`{desde, hasta}` o nula), `ultimaCopia`, `notificaciones` (activas o no).
- **Identidad**: `nombre`, `esGeneral`, `archivada`, `orden`.
- **Hábito**:
  - `identidadId`, `nombre`.
  - `tipo`: `si_no` | `cuantitativo` | `evitar`.
  - `cuantitativo`: `{unidad, objetivo, objetivoMinimo?, modo: al_menos | como_mucho}`.
  - `frecuencia`: `{tipo: veces_por_periodo, veces, periodo: dia | semana | mes}` | `{tipo: dias_semana, dias: [1..7]}`.
  - `versionMinima`, `versionCompleta`.
  - `intencion`: `{cuando: {hora} | {despuesDeHabitoId} | {despuesDeAccion: texto}, donde?}`.
  - `entorno` (lista), `recompensaAsociada`.
  - `leyesInversas`: `{senal, friccion, sustituto}`, solo en `evitar`.
  - `pausas`: lista de `{desde, hasta}`.
  - `fechaInicio`, `archivado`, `orden`.
  - **`versiones`**: historial de frecuencia y objetivo con fecha de vigencia, para evaluar el pasado con las reglas que regían entonces (historia 37).
- **Registro**: `habitoId`, `dia`, `tipo` (`minima` | `completa` | `valor` | `salto` | `recaida`), `valor?`, `nota?`, `motivo?` (salto) y `disparador?` (recaída).
- **AnotaciónDeFallo**: `habitoId`, `periodo`, `ley?` (1–4), `nota?`.
- **Diagnóstico**: `habitoId`, `periodoQueLoDisparo`, `ley?`, `estado` (`pendiente` | `respondido` | `descartado` | `pospuesto`), `accionAplicada?`.
- **HitoCelebrado**: `identidadId`, `umbral`.
- **SugerenciaDescartada**: `habitoId`, `tipo` (`subir` | `bajar`), `hasta`.
- **RevisiónSemanal**: `semana` (lunes de esa semana), `nota`.

La exportación JSON lleva `app: "pepita"`, `versionEsquema` y `exportadoEn`. La importación **sustituye** todos los datos, previa confirmación. Las migraciones de esquema van por versión de Dexie.

### Reglas del dominio
- **Día lógico**: `día(instante) = fecha(instante − horaCierre)`.
- **Periodos**:
  - `dias_semana`: cada día marcado es un periodo que pide 1.
  - `veces_por_periodo`: periodos de día, semana (lunes a domingo) o mes naturales que piden `veces`.
  - Solo se evalúan los periodos desde `fechaInicio`.
- **Cumplido**:
  - `si_no`: tantos registros de `minima` o `completa` como `veces`. Es «completa» si todos lo son; si no, «mínima».
  - `cuantitativo al_menos`: si la suma ≥ `objetivo`, completa; si la suma ≥ `objetivoMinimo`, mínima.
  - `cuantitativo como_mucho`: si la suma ≤ `objetivo` al cierre. **Un periodo sin registros cuenta como cumplido**: igual que en *evitar*, se registra el exceso, no el éxito.
  - `evitar`: el periodo es el día; se cumple si cierra sin recaída.
- **Fallo**: un periodo cerrado que no está cumplido, ni saltado, ni en pausa (de hábito o global).
- **Votos**:
  - `si_no`: +1 por cada registro de `minima` o `completa`, también fuera de los días programados.
  - `cuantitativo`: +1 por periodo cumplido.
  - `evitar`: +1 por día limpio ya cerrado.
  - Los votos nunca se restan por un fallo; solo cambian si se editan registros.
- **Recuperación**: el periodo actual está en recuperación si el último periodo cerrado y evaluable fue un fallo. Los saltos y las pausas se ignoran al buscar «el anterior».
- **Racha**: cuenta los periodos cumplidos seguidos. Los saltos y las pausas se ignoran. Un fallo aislado no suma pero tampoco la rompe; **el segundo fallo seguido la pone a 0**.
- **Diagnóstico**: se crea uno `pendiente` al producirse dos fallos seguidos, como mucho uno por cada ruptura de racha. Acciones por ley:
  - 1ª: editar Cuándo y Dónde, o exportar el .ics.
  - 2ª: añadir una recompensa asociada, o editar la identidad.
  - 3ª: activar el modo solo-mínima (una sugerencia `bajar`) o editar el entorno.
  - 4ª: abrir el contador de votos, o pausar o archivar.
- **Fuerza** (reimplementación de la fórmula de Loop):
  - `m = 0,5^(√f / 13)`, donde `f` = `veces / días del periodo` (día = 1, semana = 7, mes = 30) o `nº de días / 7`.
  - Cada día: `fuerza = fuerza_anterior · m + v · (1 − m)`.
  - `v` es el cumplimiento en la ventana del intervalo, acotado a [0, 1]. En `como_mucho`, `v = 1 − (suma − objetivo)/objetivo`, acotado a [0, 1].
  - Los días saltados o en pausa dejan la fuerza sin cambios.
  - Referencia: un hábito diario perfecto ronda 0,8 a los 30 días y 0,96 a los 60.
- **Escalado** (las constantes son ajustables, con su comentario):
  - Se sugiere `subir` si la fuerza ≥ 0,8 durante 21 días seguidos. Si predomina la versión mínima, el texto propone hacer más a menudo la completa; si predomina la completa, propone subir el objetivo o la frecuencia.
  - Se sugiere `bajar` tras un diagnóstico de la 3ª ley.
  - Una sugerencia descartada no vuelve hasta pasados 21 días.
- **Hitos**: 10, 25, 50, 100, 250, 500 y 1000 votos por identidad. Cada hito se celebra una sola vez (queda guardado en HitoCelebrado).

### Recordatorios
- **.ics**: un `VEVENT` por hábito que tenga hora, con `RRULE` (`WEEKLY;BYDAY` para `dias_semana` y `DAILY` en el resto de casos) y un `VALARM` a esa hora.
  - El resumen es la frase de intención.
  - La descripción lista los hábitos anclados en cadena.
  - Los hábitos anclados no generan evento propio.
- **Notificaciones con la app abierta**: solo con permiso. Se programan en memoria para las horas de hoy y se cancelan al cerrar la app.

### Interacción
- En la tarjeta de un hábito `si_no`: **toque = versión mínima** y **pulsación larga = versión completa**. El menú contextual accesible ofrece las dos, más saltar, añadir nota y deshacer.
- En la tarjeta de un hábito `cuantitativo`: un campo para sumar un valor.
- En la tarjeta de un hábito `evitar`: el botón «He recaído».
- Celebración «+1 voto · [identidad]», respetando `prefers-reduced-motion`. Sin vibración en iOS.

## Testing Decisions

- **Una sola frontera de test: el núcleo de dominio.** Se testea solo su interfaz pública, con datos de entrada (hábito, registros, ajustes, `ahora`) y resultados observables (estados de periodo, votos, racha, fuerza, recuperación, diagnóstico, orden de Hoy, .ics, validación de la importación). Nunca sus funciones internas.
- Un buen test describe un escenario de usuario con fechas concretas. Por ejemplo: «hábito 3 por semana, 2 registros, la semana se cierra el domingo a las 04:00 → fallo; el lunes está en recuperación».
- Casos imprescindibles:
  - El día lógico con un registro a la 01:00.
  - Un fallo aislado no rompe la racha; dos sí, y crean el diagnóstico una sola vez.
  - Los saltos y pausas son transparentes.
  - La pausa global.
  - `como_mucho` sin registros.
  - Los votos de `evitar` al cerrar el día.
  - La fuerza perfecta a 30 y 60 días frente a los valores de referencia de Loop.
  - Una edición retroactiva recalcula todo.
  - Un cambio de frecuencia no altera periodos pasados.
  - Los hitos sin repetición.
  - Una importación inválida se rechaza.
  - Exportar y reimportar devuelve los mismos datos.
- Persistencia, PWA e interfaz: sin tests automáticos en la v1. Se verifican a mano. La lógica no debe vivir ahí.
- Herramienta: **Vitest**. No hay tests previos que tomar como referencia: el repositorio está vacío.

## Out of Scope

Fuera de la v1:
- Social, compañero de responsabilidad y **contrato de hábitos** (v2).
- Sincronización entre dispositivos (WebDAV o servidor autoalojable, v2).
- Servidor de push (v2).
- IA (con clave propia o modelo local, más adelante).
- Tabla de hábitos, revisión de identidad y revisión anual.
- Hábitos con temporizador.
- Rutinas secuenciales guiadas.
- Integraciones de salud (Apple Health / Health Connect), widgets, reloj y app nativa o Capacitor.
- Estadísticas avanzadas (patrones por hora, correlaciones).
- Lecciones diarias.
- Mascota, moneda o RPG.
- Apuestas con dinero (**descartadas para siempre**).
- Fusionar datos al importar (la importación siempre sustituye).
- Varios perfiles en el mismo dispositivo.

## Further Notes

- **Origen del nombre**: «Pepita» viene de Pepito Grillo, en femenino y sin la marca Disney. Lo propuso la psicóloga de la autora. La app no usa la marca «Atomic Habits» ni reproduce texto del libro: el contenido es propio.
- **Supuestos aceptados sin pregunta explícita**: tema claro y oscuro según el sistema, nivel AA, cero telemetría, Vitest solo en el núcleo, sin límites de hábitos ni identidades, «General» suma votos, archivar conserva y borrar pide confirmación, y notificaciones con la app abierta solo con permiso.
- La fórmula de fuerza se **reimplementa** a partir de su descripción. Loop es GPL-3.0, compatible con AGPL-3.0 en cualquier caso.
- Las constantes del motor (umbral 0,8, 21 días, hitos, aviso de copia a los 7 días) son **ajustes de calibración**: van como constantes con nombre y comentario, para afinarlas con el uso real.
- La identidad visual (logo, paleta) se diseñará más adelante en Penpot. La v1 parte del tema de shadcn/ui ajustado.
