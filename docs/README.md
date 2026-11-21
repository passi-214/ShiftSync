# ShiftSync documentation

Everything you need to understand, run, and extend the project on your own.

## Read in this order

| # | Document | Read it to… |
|---|---|---|
| 1 | [Overview](01-overview.md) | understand what the app does, the stack, the principles and the vocabulary |
| 2 | [Architecture](02-architecture.md) | see how layers, services, storage, errors and i18n fit together |
| 3 | [Backend reference](03-backend-reference.md) | find what each module/function does and which rules it implements |
| 4 | [API reference](04-api-reference.md) | call or change the HTTP endpoints |
| 5 | [Roster format & parser](05-roster-format.md) | handle new roster layouts or odd entries |
| 6 | [Frontend](06-frontend.md) | change the UI, state handling or styling |
| 7 | [Extending: recipes](07-extending.md) | add features step by step (venue, role, language, format, field, …) |
| 8 | [Testing](08-testing.md) | run, write and extend tests |
| 9 | [Operations](09-operations.md) | configure, deploy, set up Google, troubleshoot |
| 10 | [Decisions & limitations](10-decisions-and-limitations.md) | learn why things are the way they are and what is missing |

## The 60-second mental model

```
file ─► extract text ─► parse into blocks ─► (stored as "roster", names indexed)
                                   │
 name ─► match people in blocks ─► merge rules ─► estimate times ─► Shift[] ─► stored as "result"
                                                                              │
                                                  .ics / Google events ◄──────┘   (text via locales/)
```

* Everything is **server-side logic in plain TypeScript** (`server/modules`, `server/domain`), tested with Vitest.
* **API handlers are thin**; **`server/container.ts`** wires implementations to interfaces.
* The server returns **codes**, `locales/` turns them into words (UI and calendar text).

## Where do I change …?

| Topic | File |
|---|---|
| a venue, typical length, role mapping | `server/domain/venues.ts` |
| how times are estimated | `server/modules/estimation/endTimeEstimator.ts` |
| which entries become one shift | `ShiftService.collect` in `server/modules/shifts/shiftService.ts` |
| roster text recognition | `server/modules/schedule/scheduleParser.ts` |
| name matching / typo rules | `personMatcher.ts`, `nameIndex.ts` in `server/modules/schedule/` |
| calendar text and fields | `server/modules/calendar/` |
| texts, languages | `locales/` |
| screen and styling | `pages/index.vue`, `components/`, `assets/main.css` |
| settings | `nuxt.config.ts` → `runtimeConfig` |

## Conventions

* TypeScript, 2-space indent, no semicolons, single quotes (follow the existing style).
* Explicit imports in `server/modules` and `server/domain` (no Nitro auto-imports there).
* Every user-facing string goes into `locales/de.ts` **and** `locales/en.ts`.
* A bug fix starts with a failing test that contains the offending roster snippet.
* Keep API handlers thin; put logic in services.
