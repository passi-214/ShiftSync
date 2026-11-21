# 7. Extending the project: recipes

Each recipe lists **every file you have to touch**, in order. Compile errors help: most extension points are
`Record<Union, …>` or `Record<keyof typeof de, …>`, so TypeScript tells you what you forgot.

**Before you start:** `npm install`, `npm test` (everything green), then work test-first where you can
(see [08](08-testing.md)).

## Quick index

| I want to… | Recipe |
|---|---|
| add a venue | [1](#1-add-a-venue) |
| add a role (e.g. cloakroom) | [2](#2-add-a-role) |
| change how start/end times are estimated | [3](#3-change-time-estimation) |
| add a language | [4](#4-add-a-language) |
| accept another file format | [5](#5-accept-another-input-format) |
| export to another format (CSV, JSON…) | [6](#6-add-an-export-format) |
| show a new piece of data on each shift (end-to-end) | [7](#7-add-a-field-end-to-end-example-colleagues-on-the-shift) |
| add an API endpoint | [8](#8-add-an-api-endpoint) |
| store data in Redis / a database | [9](#9-change-where-data-is-stored) |
| password-protect the app / rate-limit | [10](#10-protect-the-app) |
| support a different roster layout or theatre | [11](#11-support-another-roster-layout) |
| delete expired data automatically | [12](#12-cleanup-job-for-expired-data) |
| offer a live calendar subscription | [13](#13-live-calendar-subscription-webcal) |

---

## 1. Add a venue

Example: a new room "Studiobühne", printed as `STUDIOBÜHNE` in the roster.

1. `server/domain/types.ts`: add `'STUDIOBUEHNE'` to `VenueId`.
2. `server/domain/venues.ts`: add an entry to `VENUES`:
   ```ts
   STUDIOBUEHNE: { id: 'STUDIOBUEHNE', label: 'Studiobühne', pdfLabels: ['STUDIOBÜHNE', 'STUDIO BÜHNE'], typicalDurationMin: 150 },
   ```
3. Done. The parser builds its venue regex from every entry of `pdfLabels` (list each spelling that appears in rosters),
   and the label is not translated.
4. Test: add a line to a fixture and assert the block's `venue`.

Mind longest-first matching: if the new label contains an existing one (like `FOYER GROSSES HAUS` contains
`GROSSES HAUS`) the parser already sorts by length, so no extra work is needed.

## 2. Add a role

Example: "Garderobe" (cloakroom), a roster line like `Garderobe: Anna Test, Ben Probe` after a venue block.

1. `server/domain/types.ts`: add `'cloakroom'` to `RoleId`.
2. `server/modules/schedule/scheduleParser.ts`: add the label to the `ROLE` regex alternation:
   `(?<role>Garderobe|Pausengastro|…`. (Put longer labels before their prefixes, e.g. `Gastro zur Party` before `Gastro`.)
3. `server/domain/venues.ts`: map it in `ROLE_PATTERNS`: `[/^Garderobe$/i, 'cloakroom'],`
4. `server/modules/estimation/endTimeEstimator.ts`: add it to `STRATEGIES` (compile error until you do):
   `cloakroom: standard,` or write a new strategy (recipe 3).
5. `locales/de.ts` and `locales/en.ts`: `'role.cloakroom': 'Garderobe'` / `'Cloakroom'`.
6. Test in `tests/schedule.spec.ts`:
   ```ts
   it('parses cloakroom lines', () => {
     const s = parseSchedule('Samstag, 03.10.: GROSSES HAUS ab 18.15 Uhr - A B Garderobe: Anna Test')
     expect(s.blocks.find((b) => b.role === 'cloakroom')!.people[0].name).toBe('Anna Test')
   })
   ```

If the new role should fold into the house shift like intermission gastro, extend the merge logic in
`ShiftService.collect` (look for the `break_gastro` branch).

## 3. Change time estimation

All rules live in `server/modules/estimation/endTimeEstimator.ts`; a rule is a function
`(draft, cfg) => { start, end, startIsEstimate, endIsEstimate }`.

* **Different typical length for a venue:** edit `typicalDurationMin` in `domain/venues.ts`.
* **Different reception/after-show length:** env `NUXT_ESTIMATION_RECEPTION_DURATION_MIN`,
  `NUXT_ESTIMATION_AFTER_SHOW_DURATION_MIN` (or the defaults in `nuxt.config.ts`).
* **A new rule**, e.g. Friday/Saturday shows run 15 min longer: add a field to the draft if you need more input
  (set in `ShiftService.collect`), then:
  ```ts
  const weekendLonger: Strategy = (d, cfg) => {
    const base = standard(d, cfg)
    const day = new Date(`${d.date}T12:00:00Z`).getUTCDay()      // 5 = Fri, 6 = Sat
    return d.explicitEnd || ![5, 6].includes(day) ? base : { ...base, end: fromMinutes(toMinutes(base.end) + 15) }
  }
  export const STRATEGIES = { ...,  floor: weekendLonger, ... }
  ```
* **Venue durations from configuration instead of code:** add `estimation.durations: { GROSSES_HAUS: 270, … }` to
  `runtimeConfig`, pass it into `EstimatorConfig`, and read it in `typicalEnd()` instead of
  `VENUES[d.venue].typicalDurationMin`. Update `container.ts`.
* **Real performance data** (if you ever get an official feed): add a port `PerformanceSource` to
  `ShiftService`, load the day's performances in `preview`, and pass the matching one into the draft (e.g.
  `draft.performanceEnd`). Strategies then prefer it over the typical duration. This is how the earlier, scraper-based
  version worked.

Always set the `...IsEstimate` flags honestly: they drive the `~` in the UI and the note in the calendar entry.

## 4. Add a language

1. Create `locales/fr.ts` (example), typed like English so missing keys fail to compile:
   ```ts
   import type de from './de'
   const fr: Record<keyof typeof de, string> = { 'lang.label': 'Langue', /* … every key … */ }
   export default fr
   ```
2. `locales/index.ts`: import it, add to `messages` and to `LOCALES`: `['de', 'en', 'fr']`.
3. That's all: `LanguageSwitch`, `?lang=fr` on exports (`isLocale`), `Intl` date formatting, and the OAuth `state`
   pick it up automatically. `tests/locales.spec.ts` checks key parity for every listed language.

Tip: keep `de.ts` the source of truth: add new keys there first, then to the other files.

## 5. Accept another input format

1. `documentTextExtractor.ts`: extend `DocumentFormat`, teach `sniffFormat` to recognise it (by bytes), write a
   class implementing `DocumentTextExtractor`, and add it to the default map in `MultiFormatExtractor`.
   Zip-based formats (`.docx`, `.odt`) share the same first bytes: to tell them apart you must look inside the
   zip (e.g. read `mimetype` for ODF), which needs a zip library.
2. `pages/index.vue`: add the extension/MIME type to `ACCEPT`.
3. `locales`: update `form.drop` and `err.unsupported_file` wording.
4. Add a small sample file to `tests/files/` and extend `tests/documents.spec.ts`: extract it and compare the parsed
   result with the PDF fixture, as the docx test does.

## 6. Add an export format

Example: CSV for spreadsheets.

1. `server/modules/calendar/csvExporter.ts`:
   ```ts
   import type { Shift } from '../../domain/types'
   import { roleLabel, type CalendarExporter, type ExportContext, type ExportFile } from './types'

   const cell = (v: string) => `"${v.replace(/"/g, '""')}"`

   export class CsvExporter implements CalendarExporter {
     readonly id = 'csv'
     export(shifts: Shift[], ctx: ExportContext): ExportFile {
       const rows = shifts.map((s) => [s.date, s.start, s.end, s.venueLabel, roleLabel(s, ctx.locale), s.notes.join('; ')])
       const body = [['Date', 'Start', 'End', 'Venue', 'Role', 'Notes'], ...rows].map((r) => r.map(cell).join(';')).join('\r\n')
       return { filename: 'shifts.csv', contentType: 'text/csv; charset=utf-8', body: '\uFEFF' + body } // BOM: Excel
     }
   }
   ```
2. `calendar/index.ts`: `export const exporters = { ics: new IcsExporter(), csv: new CsvExporter() }`
3. Endpoint: copy `server/api/exports/[id]/ics.get.ts` to `csv.get.ts` and use `exporters.csv`.
4. UI: add a link in `pages/index.vue` and a label key in both locales.
5. Test: export a result from `previewFor(...)` and assert the header row and the number of lines.

To reduce duplication later, replace the two endpoints with one `[format].get.ts` that looks the exporter up
by name (404 for unknown formats).

## 7. Add a field end-to-end (example: colleagues on the shift)

This walks through the full path a new piece of data takes. Goal: each shift shows who else is listed in the same
block.

**1. Type** (`domain/types.ts`): add `colleagues: string[]` to `Shift`.

**2. Logic** (`modules/shifts/shiftService.ts`):
   * `Entry` gets `colleagues: string[]`.
   * In `collect`, compute the others of the current block and fill/merge them everywhere an entry is created or
     merged:
     ```ts
     const others = b.people.filter((x) => x !== p).map((x) => x.name)
     // new entry:
     out.push({ draft: {...}, notes, tags: [...b.tags], listedAs, colleagues: others })
     // merge into a nearby floor shift:
     for (const c of others) if (!near.colleagues.includes(c)) near.colleagues.push(c)
     ```
   * In `preview`, destructure `colleagues` from the entry and add it to the `Shift` object.

**3. Calendar text** (`calendar/types.ts`, `eventDescription`):
   ```ts
   if (s.colleagues.length) lines.push(translate(locale, 'export.colleagues', { names: s.colleagues.join(', ') }))
   ```
   with `'export.colleagues'` in both locales ("Mit: {names}" / "With: {names}"). ICS and Google both use this
   function, so both are updated.

**4. UI** (`pages/index.vue`): in the `.info` block add
   `<span v-if="s.colleagues.length" class="notes">{{ s.colleagues.join(', ') }}</span>`.

**5. Tests** (`tests/shifts.spec.ts`):
   ```ts
   it('lists colleagues of the same block', async () => {
     const day = (await preview('Elke Rakus')).shifts.find((s) => s.date === '2026-10-03')!
     expect(day.colleagues).toContain('Felix Rath')
   })
   ```

**6. Storage compatibility:** results already stored under the old shape do not have the field. They expire after
7 days; if that is not acceptable, read it defensively (`s.colleagues ?? []`).

Pattern to remember: **parse → merge rules → Shift → exporters/UI**, with tests at the service level.

## 8. Add an API endpoint

Keep handlers thin: validate, call a service, return. Put logic in a service method (testable without HTTP).

```ts
// server/api/rosters/[id]/summary.get.ts
import { getContainer } from '../../../container'
import { apiError } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const summary = await getContainer().roster.summary(getRouterParam(event, 'id')!)   // new RosterService method
  if (!summary) apiError('roster_expired')
  return summary
})
```
Checklist: type in `domain/types.ts` → service method + unit test → handler → composable function → document it in
[04](04-api-reference.md). New error code? See "Error handling" in [02](02-architecture.md).

## 9. Change where data is stored

Everything goes through `KeyValueStore` / Nitro storage mount `sessions`.

* **Redis** (or any unstorage driver): change only `nuxt.config.ts`:
  ```ts
  nitro: { storage: { sessions: { driver: 'redis', url: process.env.REDIS_URL } } }
  ```
  and install the driver's client (`npm i ioredis`). Because of the lazy-expiry design, also set a Redis TTL or run
  the cleanup task (recipe 12).
* **A SQL database:** implement `KeyValueStore` (`get/set/remove` on a `kv(key, value, expires_at)` table) and
  return it from `container.ts` instead of `nitroStore('sessions')`. No other code changes.
* **Multiple server instances** need a shared store (Redis/DB), since the default file driver is local to one machine.

## 10. Protect the app

**Password for the whole site** (HTTP Basic), `server/middleware/access.ts`:
```ts
export default defineEventHandler((event) => {
  const password = String(useRuntimeConfig().accessPassword || '')
  if (!password) return                                   // disabled when unset
  const encoded = (getHeader(event, 'authorization') ?? '').split(' ')[1] ?? ''
  const given = Buffer.from(encoded, 'base64').toString().split(':').slice(1).join(':')
  if (given !== password) {
    setHeader(event, 'www-authenticate', 'Basic realm="ShiftSync"')
    throw createError({ statusCode: 401 })
  }
})
```
Add `accessPassword: ''` to `runtimeConfig` (env: `NUXT_ACCESS_PASSWORD`). Use HTTPS, otherwise the password is
sent in clear text. For real user accounts, use an auth module (e.g. `nuxt-auth-utils`) and check the session in
the same middleware.

**Rate limiting:** do it at the reverse proxy (nginx `limit_req`) where possible. In-app, add a middleware that
counts requests per IP in a `KeyValueStore` with a short expiry and throws `createError({ statusCode: 429 })`.

## 11. Support another roster layout

The parser is a single function. To support more than one layout (another theatre, a redesigned plan):

1. Define a port next to `RosterService`:
   ```ts
   export interface RosterParser { parse(text: string): ParsedSchedule }
   ```
2. Wrap the existing function: `export const foyerParser: RosterParser = { parse: parseSchedule }`.
3. Give `RosterService` a `parser` dependency (replacing the direct `parseSchedule` call) and wire it in
   `container.ts`.
4. Write the new parser. It only has to produce `ParsedSchedule` (blocks with date, venue, role, start, people).
   Everything downstream (matching, estimation, export) keeps working.
5. If the venues or roles differ, make `VENUES`/`ROLE_PATTERNS` injectable too, or keep one superset.
6. To choose between parsers automatically, try each and keep the one that yields blocks, or ask the user.

## 12. Cleanup job for expired data

Expired entries are deleted lazily when read. To sweep the rest, add a Nitro scheduled task:

```ts
// server/tasks/storage/cleanup.ts
export default defineTask({
  meta: { name: 'storage:cleanup', description: 'Delete expired rosters and results' },
  async run() {
    const storage = useStorage('sessions')
    let removed = 0
    for (const key of await storage.getKeys()) {
      const item = await storage.getItem<{ expiresAt?: number }>(key)
      if (item?.expiresAt && item.expiresAt < Date.now()) { await storage.removeItem(key); removed++ }
    }
    return { result: { removed } }
  }
})
```
```ts
// nuxt.config.ts
nitro: { experimental: { tasks: true }, scheduledTasks: { '0 3 * * *': ['storage:cleanup'] }, /* storage … */ }
```
Run it manually with `npx nuxi task run storage:cleanup`. (Scheduled tasks run on the Node server preset.)

## 13. Live calendar subscription (webcal)

Not implemented on purpose: a `webcal://` link creates a read-only *subscription* that the calendar app polls, so it
needs a **stable, long-lived URL**. Today results expire after 7 days and ids change on every preview. To build it:

1. Create a durable, per-person feed id (random, unguessable) and store `{ rosterId-independent shifts }` for it.
2. Serve `GET /api/feeds/:feedId.ics` with the existing `IcsExporter`.
3. Update the feed whenever a new roster is uploaded for the same person (decide how to identify them: name +
   confirmation).
4. Offer a `webcal://host/api/feeds/<id>.ics` button. Mind the privacy implications of long-lived public URLs.

---

## Definition of done for any change

- [ ] `npm test` passes (add or adjust tests; see [08](08-testing.md)).
- [ ] New user-facing text exists in **both** `locales/de.ts` and `locales/en.ts`.
- [ ] No Nitro globals in `server/modules/` or `server/domain/`.
- [ ] `npm run build` succeeds.
- [ ] Docs updated: API shape in [04](04-api-reference.md), new rules in [03](03-backend-reference.md) or [05](05-roster-format.md).
