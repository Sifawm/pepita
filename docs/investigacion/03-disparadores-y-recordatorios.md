# 03 · Disparadores y recordatorios

**Principios del libro que toca:** 1ª ley (Hazlo obvio): **intención de implementación** («haré X a la hora Y en el lugar Z»), **apilamiento de hábitos** («después de [A], haré [B]»), diseño del entorno. Inversa: hazlo invisible.

## Cómo lo resuelve cada app

| App | Por hora | Por ubicación | Apilamiento | Otros |
|---|---|---|---|---|
| **Atoms** | Uno o varios al día por hábito | No (sin confirmar) | Sí, desde la v3.3 (mecánica sin confirmar) | **Hora y lugar forman parte de la creación del hábito.** Es la única intención de implementación explícita |
| **Habitify** | Varios por hábito, con horario distinto por día de la semana; puede sonar como alarma | **Sí** (Plus/Pro), al llegar o salir, con radio | **Sí, por evento**: avisa N minutos después de completar otro hábito | Live Activity con check en la pantalla de bloqueo. **Los malos hábitos no tienen recordatorio, a propósito** |
| **Productive** | *Smart reminders* por momento del día; por hábito en premium | **Sí** (premium) | No | — |
| **Streaks** | Por tarea, con aviso de «pendiente» | No nativa (Shortcuts/NFC) | No | Siri puede crear y completar |
| **Fabulous** | Alarma por rutina | No | Implícito: la rutina es una cadena ordenada | Exceso de notificaciones de marketing (queja) |
| **Routinery** | Alarma por rutina | No | **La rutina es una secuencia de hábitos apilados** | Voz que anuncia el siguiente paso |
| **Loop** | Uno por hábito y días | No | No | **No avisa si el periodo ya está cumplido.** Marcar o descartar desde la notificación |
| **Beeminder** | Email, SMS, webhook, app | No | No | **«Zeno polling»**: los recordatorios son cada vez más frecuentes según se acerca el límite |
| **Finch** | Por objetivo | No | No | El «día» empieza 2 h antes de tu hora de despertar |
| **TickTick** | Hasta 10 por hábito | Solo en tareas | No | Registrar desde la notificación |
| **HabitNow** | Recordatorios y alarmas | No | No | Quejas de alarmas que no suenan |
| **Habitica, Way of Life, Strides, HabitShare, stickK** | Básicos | No | No | — |

## Patrones del mercado

- El recordatorio por hora es universal. **La fiabilidad de las notificaciones es una de las quejas más repetidas** (HabitNow, Loop con el ahorro de batería, Routinery, stickK).
- El **apilamiento real** solo existe en dos formas:
  - *Por evento* (Habitify): avisa al completar el hábito ancla.
  - *Por secuencia* (Fabulous, Routinery): la rutina ordenada.
- Solo Atoms recoge la **intención de implementación** (hora + lugar) como datos estructurados.
- La ubicación es una función premium (Habitify, Productive).

## Huecos y oportunidades

- Una **frase de intención de implementación** generada a partir de campos («Después de servirme el café, en la cocina, leeré 1 página»). Se muestra en el recordatorio y en la tarjeta del hábito.
- Ofrecer de forma explícita tres disparadores: **hora**, **hábito ancla** (apilamiento) y **lugar**.
- Una **checklist de diseño del entorno** por hábito («deja el libro en la almohada»), con recordatorio la noche anterior.
- Recordatorios que **no molestan** si ya cumpliste y que se vuelven más insistentes si llevas un fallo (para que no sean dos).
