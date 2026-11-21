# 3. Backend reference

File-by-file. Paths are relative to `server/`.

## `domain/`

### `types.ts`
All shared types. The frontend imports from here with `import type`, so the contract is defined once.

| Type | Purpose |
|---|---|
| `VenueId`, `RoleId` | Closed unions. Adding a value forces you to update every `Record<VenueId|RoleId, …>` (the compiler tells you where). |
| `ShiftTag` | `'break_gastro' \| 'if_intermission'`: language-neutral labels on a shift. |
| `ApiErrorCode` | `file_missing`, `file_too_large`, `unsupported_file`, `name_invalid`, `not_roster`, `read_failed`, `roster_expired`, `export_expired`. |
| `RosterPerson` | One person entry: `raw`, cleaned `name`, `note`, personal `start`/`end` overrides. |
| `ScheduleBlock` | `{ date, venue, role, start, end, note, tags, people[] }`. |
| `ParsedSchedule` | `{ year, blocks[] }`. |
| `Shift` | Final shift (see fields below). |
| `NameStat`, `SimilarName`, `TypoSuspect` | Name index entries and typo-check results. |
| `RosterInfo`, `PreviewRequest`, `PreviewResponse` | API payloads. |

`Shift` fields: `id` (`<date>-<venue>-<role>-<HHmm>`), `date`, `start`, `end`, `startIsEstimate`, `endIsEstimate`,
`venue`, `venueLabel`, `role`, `notes[]` (raw roster text), `tags[]`, `listedAs` (spelling in the roster when it
differs from the searched name and the user confirmed it, else `null`).

### `venues.ts`
* `VENUES: Record<VenueId, VenueDef>`: `label` (shown), `pdfLabels` (every spelling used in rosters, upper-case: e.g. `['WINTERER-FOYER', 'WINTERER FOYER']`),
  `typicalDurationMin` (estimate basis).
* `ROLE_PATTERNS`: ordered `[RegExp, RoleId]` list that maps a roster role label to a role (**most specific first**).
* `venueByPdfLabel(label)`: looks a venue up by any of its `pdfLabels`.

### `time.ts`
`toMinutes('HH:mm')`, `fromMinutes(n)` (wraps at 24 h), `hhmm(h, m)`, `addDaysIso(date, n)`,
`zonedToUtc(date, time, tz)` (DST-safe), `shiftInstants(date, start, end, tz)` (handles after-midnight).

### `errors.ts`
`InputError(code)`: the only domain exception type that is meant to reach the user.

## `modules/schedule/`

### `documentTextExtractor.ts`
* `DocumentTextExtractor` (port): `extract(file: Uint8Array): Promise<string>`.
* `sniffFormat(bytes)` → `'pdf'` (`%PDF-`), `'docx'` (zip magic `PK\x03\x04`), or `null` (legacy `.doc` is rejected).
* `UnpdfExtractor`, `MammothExtractor`: the concrete adapters.
* `MultiFormatExtractor`: sniffs, routes, and maps failures: unknown format → `unsupported_file`;
  corrupt/encrypted/non-Word zip → `read_failed`.

### `scheduleParser.ts`
`parseSchedule(text): ParsedSchedule`. Full description in [05](05-roster-format.md).
Also exports `parsePeople(string)` and `normaliseText(string)`.

### `personMatcher.ts`
* `normaliseName(s): string[]`: lower-case, strips diacritics, `ß→ss`, hyphen→space, letters only, tokens.
* `matchesPerson(item, query): boolean`: the **normal (strict-ish) matcher**:
  the *last* token of the query must be similar to some token `j` of the item (equal, or Levenshtein ≤ 1 when both
  are ≥ 6 chars), and the *first* token must be similar to one of the 3 tokens before `j`
  (equal, common prefix ≥ 3, or Levenshtein ≤ 1 when ≥ 5 chars). That tolerates middle names
  ("Gina-Denise"), nicknames ("Lilli"/"Liliana"), diacritics, one-letter last-name typos, and names glued
  together by a lost comma.
* `levenshtein`, `osaDistance`: edit distances. OSA counts a swapped neighbour pair as one edit ("Pacsal"/"Pascal").
  The normal matcher intentionally uses plain Levenshtein, so a transposition is *not* silently accepted; it is
  handled by the opt-in typo check.

### `nameIndex.ts`
| Function | Purpose |
|---|---|
| `buildNameIndex(schedule)` | Distinct names with occurrence counts. A "clean" name has 2–3 words, or up to 4 if it contains a particle (`von`, `van`, `de`, …: "Zita Von Wallenberg Pachaly"). Longer items are glued names and are split (DP over the clean names seen elsewhere), drops placeholders like "fünf vom GH", picks the most frequent raw spelling per name. |
| `suggestNames(index, q, limit=8)` | Ranked typing suggestions. Every typed word must match a *different* word of the name: exact (0), prefix (1), or typo-tolerant prefix (2, only for ≥ 4 typed letters). Ties: more occurrences, then alphabetical. Empty `q` → first `limit` names. |
| `looksLikeSameName(a, b)` | Lenient "same person, misspelled" test: first and last tokens within a small OSA distance (tolerance 0 / 1 / 2 by length < 4 / < 8 / ≥ 8), total ≤ 2, **at least one token exactly equal**. |
| `findSimilar(index, query)` | Names that `looksLikeSameName` as the query but are **not** already matched by `matchesPerson`. |
| `findTypoSuspects(index)` | For each name, the most frequent *strictly more frequent* look-alike (lenient or mutual strict match) → `{ name, occurrences, probablyMeans, probablyMeansOccurrences }`. Equal counts are not flagged. |

## `modules/roster/rosterService.ts`
`RosterService({ extractor, store, ttlMs })`
* `ingest(bytes) → RosterInfo`: extract → parse → (throws `not_roster` if no blocks) → index → typo suspects → store.
* `load(id) → StoredRoster | null` (expiry-aware), `suggest(id, q) → NameStat[] | null`.

## `modules/estimation/endTimeEstimator.ts`
`EndTimeEstimator(cfg, strategies = STRATEGIES).estimate(draft) → { start, end, startIsEstimate, endIsEstimate }`.

`ShiftDraft`: `{ date, venue, role, start, durationFrom, explicitEnd }`.
`durationFrom` is the performance call time when an earlier briefing was merged into the shift (so a 17:15
briefing + 18:15 call ends at 18:15 + typical duration, not 17:15 + typical duration).

| Strategy (role) | Start | End |
|---|---|---|
| `standard` (`floor`, `gastro`, `break_gastro`) | roster call time | `explicitEnd` ?? `durationFrom` + venue `typicalDurationMin` (estimate) |
| `reception` | roster time | `explicitEnd` ?? start + `receptionDurationMin` (default 90) |
| `afterShow` (`after_show_*`) | `explicitEnd` ?? `durationFrom` + typical duration (estimate) | start + `afterShowDurationMin` (default 90) (estimate) |

Intermission gastro intentionally uses `standard`: it starts with the house staff.

## `modules/shifts/shiftService.ts`
`ShiftService({ roster, estimator, results, sessionTtlMs })`

* `preview(rosterId, person, { typoCheck?, include? })` → `ShiftsView` (see lifecycle in [02](02-architecture.md)).
* `load(id)` / `view(id, stored)`: read back a stored result.
* `collect()` holds the **merge rules** (the heart of the business logic):
  1. People are matched by `matchesPerson(name, query)`, else by an `include` spelling (then `listedAs` is set).
  2. A personal start override (`p.start`) beats the block start; a personal end override (`p.end`) beats the block end.
  3. **Intermission gastro** (`break_gastro` blocks) is processed last. If the person already has a `floor` shift at
     the same date and venue, the shift gets the tag `break_gastro` (+ `if_intermission` for "Falls Pause")
     instead of a duplicate calendar entry. Otherwise it becomes its own shift.
  4. **Briefing + call**: two `floor` blocks at the same date/venue whose start times are ≤ 90 min apart merge into
     one shift from the earliest start; the later one becomes `durationFrom`. Blocks further apart (e.g. two
     Weltraum shows) stay separate.
  5. **Duplicates**: the same person listed twice in the same date/venue/role with the same start (a typo in the
     roster, seen in real files) yields one shift.
  6. Notes from merged blocks are de-duplicated and concatenated.

## `modules/calendar/`
* `types.ts`: `CalendarExporter` port, `ExportContext { person, calendarName, address, timezone, locale }`,
  and the shared text builders `eventTitle`, `eventLocation`, `eventDescription` (used by **both** ICS and Google, so
  they never diverge).
* `icsExporter.ts`: `IcsExporter` (RFC 5545: UTC timestamps, `METHOD:PUBLISH`, 75-octet line folding,
  escaping) and `shiftUid(person, shiftId)` = first 24 hex chars of `sha1(person.lower|shiftId)` + `@shiftsync`.
* `googleCalendar.ts`: `authUrl`, `exchangeCode`, `toGoogleEvent`, `addShiftsToGoogle(token, shifts, ctx, fetchImpl?)`.
  Event id = full `sha1` hex (valid Google id alphabet). Insert → on HTTP 409 → `PUT` update. 401/403 aborts with an
  error. Concurrency 5. `fetchImpl` is injectable for tests.
* `index.ts`: `exporters` registry (`{ ics }`).

## `infrastructure/`
* `keyValueStore.ts`: `KeyValueStore { get, set, remove }` port and `MemoryStore` (tests/local).
* `nitroStore.ts`: `nitroStore(mount)` adapter over `useStorage(mount)`.

## `utils/http.ts`
`apiError(code)`, `rethrow(err)`, `localeFrom(event)` (`?lang=`, default `de`), `linksFor(id)`
(`{ ics, googleAdd | null }`), `GOOGLE_STATE_COOKIE`.
