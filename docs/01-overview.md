# 1. Overview

## What ShiftSync does

A theatre coworker uploads the monthly **Foyermanagement roster** (PDF or Word), types their name, previews
their shifts (date, start, venue, approximate end) and adds them to a calendar: Apple Calendar, Google Calendar,
or any app via an `.ics` file. The UI is available in German (default) and English.

```
upload file ─► choose name ─► preview shifts ─► add to Apple / Google / download .ics
   │               ▲
   └ names +       └ suggestions while typing, optional typo check
     typo suspects
```

## Tech stack

| Concern | Choice | Where |
|---|---|---|
| Framework | Nuxt 3 (Vue 3, Nitro server), TypeScript | whole repo |
| PDF text | `unpdf` | `server/modules/schedule/documentTextExtractor.ts` |
| Word text | `mammoth` | same file |
| Persistence | Nitro `useStorage` (unstorage), file driver by default | `server/infrastructure/nitroStore.ts`, `nuxt.config.ts` |
| Tests | Vitest (plain TypeScript, no Nuxt boot) | `tests/` |
| Calendar output | hand-written RFC 5545 `.ics`; Google Calendar REST API via `fetch` | `server/modules/calendar/` |

There are no other runtime dependencies. There is **no database**, **no scraping** (the theatre's website blocks it),
and **no user accounts**.

## Guiding principles

1. **The backend does all the logic.** The frontend uploads, renders JSON, and links to downloads. Anything that
   could be a rule (matching, estimating, merging) lives on the server and is unit-tested.
2. **Ports and adapters.** Core modules depend on small interfaces (`DocumentTextExtractor`, `KeyValueStore`,
   `CalendarExporter`), never on Nitro or a library directly. Swapping an implementation is a one-file change plus
   one line in `server/container.ts`.
3. **Language-neutral domain.** The server returns *codes* (`role: 'break_gastro'`, error code `roster_expired`,
   tag `if_intermission`). Words come from `locales/` and are applied by the UI and the calendar exporter.
4. **Never guess silently.** Estimated times carry an `...IsEstimate` flag and show a `~` in the UI. Look-alike
   spellings of a name are *suggested*, never added without the user's confirmation.
5. **Idempotent exports.** Calendar event IDs are deterministic, so importing the same shift twice updates
   instead of duplicating (see the limitation in [10](10-decisions-and-limitations.md)).

## Glossary (domain vocabulary used in code)

| Term | Meaning | Type |
|---|---|---|
| **Roster** | The uploaded monthly plan (PDF/docx). Parsed once, kept server-side, referenced by `rosterId`. | `StoredRoster` |
| **Block** | One line group of the roster: "On *date*, at *venue*, role *X*, from *time*: *people*". | `ScheduleBlock` |
| **Venue** | A place in the theatre (Großes Haus, Weltraum, …). | `VenueId`, `VENUES` |
| **Role** | What a person does in a block: house/foyer staff (`floor`), `gastro`, `break_gastro`, … | `RoleId` |
| **Call time** | The "ab 16.45 Uhr" / "ab 16:45 Uhr" time in the roster: when staff must be there (≈ 75 min before curtain). | `ScheduleBlock.start` |
| **Draft** | A shift before times are estimated (`ShiftDraft`). | `endTimeEstimator.ts` |
| **Shift** | A finished, user-facing entry with start/end and estimate flags. | `Shift` |
| **Tag** | Language-neutral label on a shift (`break_gastro`, `if_intermission`). | `ShiftTag` |
| **Note** | Raw German text from the roster, shown as written ("nach Fassade", "offene Probe"). | `Shift.notes` |
| **Index** | List of all distinct names in a roster with occurrence counts. | `NameStat[]` |
| **Similar spelling** | A name in the roster that resembles the searched one but is not matched by the normal matcher. | `SimilarName` |
| **Typo suspect** | A rare spelling that looks like a typo of a more common one. | `TypoSuspect` |
| **Result** | A stored preview (shifts + similar spellings) addressed by an id; what exports read from. | `StoredResult` |

## Repository layout

```
locales/            de.ts (source of truth), en.ts (type-checked against de), index.ts (translate())
server/
  domain/           types, venues + roles, time helpers, InputError
  modules/
    schedule/       documentTextExtractor · scheduleParser · personMatcher · nameIndex
    roster/         rosterService
    estimation/     endTimeEstimator (one strategy per role)
    shifts/         shiftService (orchestration, merge rules)
    calendar/       types · icsExporter · googleCalendar · index (exporter registry)
  infrastructure/   keyValueStore (port + memory impl) · nitroStore (Nitro adapter)
  container.ts      composition root (wires everything)
  api/              thin HTTP handlers
  utils/http.ts     error codes -> HTTP, locale parsing, link building
pages/ components/ composables/ assets/    frontend
tests/              unit tests, fixtures, a .docx sample
docs/               this documentation
```
