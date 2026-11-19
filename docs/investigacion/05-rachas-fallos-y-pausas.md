# 05 · Rachas, fallos y pausas

**Principios del libro que toca:** «no rompas la cadena», **nunca falles dos veces**, la advertencia contra la ley de Goodhart (la racha no es el objetivo) y la meseta del potencial latente.

## Cómo lo resuelve cada app

| App | Cómo se calcula la racha | Qué pasa al fallar | Saltar o pausar |
|---|---|---|---|
| **Atoms** | Días cumplidos | **Un fallo no rompe la racha; dos seguidos sí.** Te anima a no fallar mañana. «No te castigamos» | Pausa sin confirmar |
| **Streaks** | +1 por día cumplido. Los días no programados no la rompen | Un fallo la pone a 0, salvo con la **«2-Day Rule» opcional** (permite un fallo, no dos; muestra un indicador «2») | Pausar tarea |
| **Habitify** | Diaria: días programados consecutivos. Semanal o mensual: **rachas de periodos** (los días fallidos no rompen si cumples el periodo) | *Fail* la rompe | **Skip** la protege. **Off Mode** congela todo y silencia recordatorios (vacaciones, enfermedad), y se puede programar |
| **Loop** | Rachas actual y mejor, **pero lo principal es la «fuerza del hábito»** (ver doc 06) | Un fallo tras un historial largo apenas resta | Días saltados (guion): no cambian el score |
| **Way of Life** | Cadenas | Rojo | **Skip amarillo** con motivo opcional, neutral en estadísticas |
| **Finch** | Cuenta los **días que abres la app**, no si cumples | Sin penalización | **Reparar** la racha con moneda (*Rainbow Stones*) o *Repair Saver* gratis; **Pause Mode** |
| **Fabulous** | Por hábito | Hay usuarios que dicen haber tenido que reiniciar el Journey | Skip conserva la racha. **Sin vacaciones** (lo piden) |
| **Productive** | Rachas actual y mejor + *perfect days* | Cuenta como fallo a medianoche | Pausar o detener un hábito |
| **Habitica** | Por *Daily* | **Castigo**: pierdes HP según la dificultad. Si mueres, pierdes nivel, oro y equipo. En una misión con tu grupo, **dañas a todo el grupo** | *Rest in the Inn* congela daños |
| **Beeminder** | No hay rachas: la **línea roja** y el **margen de seguridad** (*safety buffer*, días que puedes no hacer nada) | **Descarrilas y pagas** (5 → 10 → 30 → 90 → 270 $). Aviso para revisar si fue legítimo (*legitimacy check*) y disputa en 24 h. *No-Excuses Mode* opcional | Pausas sujetas al **akrasia horizon** (7 días: hacerlo más fácil tarda una semana en aplicarse; hacerlo más difícil es inmediato) |
| **stickK** | — | Pagas la apuesta del periodo. **No reportar = fallo** | Sin pausas. Solo se cancela con justificante médico |
| **Strides** | Rachas + **pace line** (verde o rojo según si vas a ritmo) | — | Skip |
| **TickTick** | Según la frecuencia objetivo | Estado «Unachieved» explícito | Sin confirmar |
| **Routinery** | Por rutina | **Saltar un paso no rompe la rutina** | Sin confirmar |
| **HabitNow, HabitShare** | Básicas | — | Sin confirmar |

## Patrones del mercado

- **Hay tres filosofías:**
  1. **Castigo**: Habitica (HP), Beeminder y stickK (dinero).
  2. **Racha binaria**: Streaks y Productive. Genera la queja «perdí mi racha de 87 días».
  3. **Compasiva**: Atoms, Finch, Loop, Way of Life.
- **«Nunca falles dos veces»** ya está implementado en Atoms (por defecto) y Streaks (opcional).
- Para tener pausas o vacaciones bien resueltas hacen falta tres cosas: *Skip* por día (neutral), pausa por hábito y **pausa global** (Habitify Off Mode, Finch Pause Mode, Habitica Inn). Fabulous no la tiene y recibe quejas.
- El **akrasia horizon** de Beeminder es la mejor protección conocida contra el «yo del momento», que quiere rebajar la meta en caliente.

## Huecos y oportunidades

- Hacer de «nunca falles dos veces» la **regla central**. Tras un fallo, el día siguiente se convierte en un **«día de recuperación»** con su propia interfaz y recordatorios más insistentes.
- Un indicador principal **compasivo** (fuerza del hábito o votos acumulados) en lugar de la racha binaria, sin quitar la racha.
- Distinguir **Skip** (justificado, neutral), **Fallo** y **Pausa**.
- Usar el akrasia horizon (u otro periodo de enfriamiento) para **rebajar** hábitos o contratos.
