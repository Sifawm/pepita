# 12 · Platforms, sync, data and privacy

## How each app handles it

| App | Platforms | Account and sync | Export | Privacy |
|---|---|---|---|---|
| **Atoms** | iOS (+Watch), Android (3.1★ versus 4.8★ on iOS) | No account to start | Unconfirmed | Unconfirmed |
| **Habitica** | Web, iOS, Android | Mandatory account, server | CSV, JSON, XML | **Open source** (GPL), public API |
| **Streaks** | Apple only (iPhone, iPad, Mac, Watch, Vision) | **iCloud, no account, works offline** | CSV (also imports) | No tracking. Complaints about lost streaks on reinstall |
| **Finch** | iOS, Android | **Local by default**; optional encrypted cloud backup | Unconfirmed | Public benefit corporation |
| **Way of Life** | iPhone, Mac, Vision; Android with fewer features | **No sync** (#1 complaint); backup to your own cloud | CSV, Excel, JSON | Passcode or Face ID lock |
| **Fabulous** | iOS, Android, Watch, Vision | Mandatory account and internet | Unconfirmed | Collects medical information |
| **Productive** | Apple (Android contradictory) | Sync | Some (Habitify imports its data) | — |
| **Habitify** | iOS, Android, Mac, web, Watch (Windows and Wear OS according to third parties) | Account + cloud | CSV + SQLite backup. Imports from Streaks and Productive | Privacy lock |
| **HabitNow** | Android only | **Local, no account**; premium cloud backup | Manual backup | Anonymous analytics |
| **Loop** | Android only | **No account, no internet** | CSV + SQLite | **Open source, sends data nowhere** |
| **Beeminder** | Web, iOS, Android, email, Slack, SMS | Account | CSV/TSV, JSON via API | Public API |
| **stickK** | Web, iOS, Android | Account | Unconfirmed | — |
| **Strides** | Apple | iCloud (Plus) | Plus | — |
| **TickTick** | Every platform | Account + sync | Task backup | — |
| **Routinery** | iOS, Android, Watch, iPad, Mac | The free plan works without an account | Unconfirmed | — |
| **HabitShare** | iOS, Android | Account (for the social part) | Unconfirmed | Uses the email for marketing |

## Market patterns

- **There are two camps:**
  1. **Local-first or privacy** (Loop, Streaks, Finch, HabitNow, Way of Life): high trust, but sync problems and data loss.
  2. **Cloud account** (Habitify, Fabulous, Habitica): multi-device and social features.
- The most damaging complaint is **losing data or streaks** when switching phones or reinstalling.
- Apple-only apps have the best integrations (Health, Watch, Live Activities), but leave Android out.
- Cross-platform parity matters: Atoms has 4.8★ on iOS and 3.1★ on Android.
- **Health and mood data** = sensitive data. In the EU they fall under GDPR, special category.

## Gaps and opportunities

- Local-first **with** optional, encrypted sync (no account to start; an account only if you want to sync or use social).
- **Export and import** (CSV/JSON and importing from the main competitors) from the first version.
