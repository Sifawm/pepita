# 12 · Plataformas, sincronización, datos y privacidad

## Cómo lo resuelve cada app

| App | Plataformas | Cuenta y sincronización | Exportación | Privacidad |
|---|---|---|---|---|
| **Atoms** | iOS (+Watch), Android (3,1★ frente a 4,8★ en iOS) | Sin cuenta al empezar | Sin confirmar | Sin confirmar |
| **Habitica** | Web, iOS, Android | Cuenta obligatoria, servidor | CSV, JSON, XML | **Código abierto** (GPL), API pública |
| **Streaks** | Solo Apple (iPhone, iPad, Mac, Watch, Vision) | **iCloud, sin cuenta, funciona offline** | CSV (también importa) | Sin seguimiento. Quejas de rachas perdidas al reinstalar |
| **Finch** | iOS, Android | **Local por defecto**; copia en la nube cifrada opcional | Sin confirmar | Empresa de beneficio público |
| **Way of Life** | iPhone, Mac, Vision; Android con menos funciones | **Sin sincronización** (queja nº 1); copia en tu propia nube | CSV, Excel, JSON | Bloqueo con código o Face ID |
| **Fabulous** | iOS, Android, Watch, Vision | Cuenta e internet obligatorios | Sin confirmar | Recoge información médica |
| **Productive** | Apple (Android contradictorio) | Sincronización | Algo (Habitify importa sus datos) | — |
| **Habitify** | iOS, Android, Mac, web, Watch (Windows y Wear OS según terceros) | Cuenta + nube | CSV + copia en SQLite. Importa de Streaks y Productive | Bloqueo de privacidad |
| **HabitNow** | Solo Android | **Local, sin cuenta**; copia en la nube premium | Copia manual | Analítica anónima |
| **Loop** | Solo Android | **Sin cuenta, sin internet** | CSV + SQLite | **Código abierto, no envía datos a ningún sitio** |
| **Beeminder** | Web, iOS, Android, email, Slack, SMS | Cuenta | CSV/TSV, JSON por API | API pública |
| **stickK** | Web, iOS, Android | Cuenta | Sin confirmar | — |
| **Strides** | Apple | iCloud (Plus) | Plus | — |
| **TickTick** | Todas las plataformas | Cuenta + sincronización | Copia de tareas | — |
| **Routinery** | iOS, Android, Watch, iPad, Mac | El plan gratuito funciona sin cuenta | Sin confirmar | — |
| **HabitShare** | iOS, Android | Cuenta (para la parte social) | Sin confirmar | Usa el email para marketing |

## Patrones del mercado

- **Hay dos bandos:**
  1. **Local-first o privacidad** (Loop, Streaks, Finch, HabitNow, Way of Life): confianza alta, pero problemas de sincronización y pérdida de datos.
  2. **Cuenta en la nube** (Habitify, Fabulous, Habitica): multidispositivo y funciones sociales.
- La queja más dañina es **perder datos o rachas** al cambiar de móvil o reinstalar.
- Las apps solo para Apple tienen las mejores integraciones (Health, Watch, Live Activities), pero dejan fuera a Android.
- La paridad entre plataformas importa: Atoms tiene 4,8★ en iOS y 3,1★ en Android.
- **Datos de salud y estado de ánimo** = datos sensibles. En la UE implican RGPD, categoría especial.

## Huecos y oportunidades

- Local-first **con** sincronización opcional y cifrada (sin cuenta para empezar; cuenta solo si quieres sincronizar o usar lo social).
- **Exportar e importar** (CSV/JSON e importar de los competidores principales) desde la primera versión.
