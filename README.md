# ShiftSync

Upload the monthly Foyermanagement roster (PDF or Word .docx) + your name → preview your shifts → add them to Apple Calendar / Google Calendar or download the `.ics` file. German (default) and English UI.

The backend does all the logic; the frontend uploads, renders JSON and links to downloads.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (no Nuxt boot needed)
```

## Request flow

```
POST /api/rosters (file: PDF or .docx)       parse ONCE, keep server-side -> { id, names, typoSuspects }
GET  /api/rosters/:id/names?q=pas            ranked name suggestions while typing
POST /api/shifts/preview {rosterId, name, typoCheck?, include?}
       RosterService -> PersonMatcher -> EndTimeEstimator -> Shift[] (+ similar spellings), stored 7 days under an id
GET  /api/exports/:id                        reopen a result
GET  /api/exports/:id/ics?lang=de|en[&inline=1]
GET  /api/google/start?id=…                  (only if Google OAuth is configured) -> Google -> /api/google/callback
```

## Input formats

PDF and Word (`.docx`). The format is detected from the file's bytes, not its name. Legacy `.doc` is rejected with a hint to save as `.docx`. Add another format (`.odt`, `.txt`, …) by implementing `DocumentTextExtractor` and registering it in `MultiFormatExtractor` (`modules/schedule/documentTextExtractor.ts`). The parser is line-break agnostic, so Word paragraphs, tables and split text runs all work.

## Name suggestions

After the file is uploaded, typing in the name field shows suggestions from the names in that file: prefix match on first or last name (`pas`, `nowa`), case/diacritics-insensitive, and typo tolerant from 4 letters on (`pacs` → Pascal). Names that were glued together by a lost comma in the file are split using the clean names seen elsewhere. Ranking happens on the server; the combobox is keyboard accessible (↑ ↓ Enter Esc).

## Typo check (optional checkbox, on by default)

Two things, both in `modules/schedule/nameIndex.ts`:

- **Possible typos in the roster:** rare spellings that look like a more common name (e.g. "Pacsal Nowarra" 1× vs "Pascal Nowarra" 13×). Listed in a collapsible panel so the roster can be corrected at the source. A swapped letter pair counts as one edit.
- **Similar spellings for your name:** entries under a look-alike name are *suggested, never added silently*. Tick the ones that are yours and they join your shifts, marked "Listed as …", and the calendar entry says so too. If nothing matches your typed name, the same list becomes "Did you mean …".

Already tolerated without the checkbox: first-name variants (Lilli/Liliana), diacritics, one-letter last-name differences (Haberland/Haberlandt). Different people are kept apart (a test covers Lukas/Dieter Huber, Sophie Unseld/Hunold, …). Spellings that tie in frequency (e.g. Lilli/Liliana Deimann 6×/6×) are not flagged, since there is no way to tell which is right.

## Times

- Start = the time printed in the roster (a personal "(ab 19.30 Uhr dazu)" wins).
- End = printed "bis …" time if there is one, otherwise call time + a typical length per venue (`typicalDurationMin` in `server/domain/venues.ts`, e.g. Großes Haus 4 h 30). Estimated times are marked `~` in the UI and noted in the calendar entry.
- Intermission gastro uses the same start as the house staff. If the person is also on the house list at that venue/day, it is folded into that shift (tag "Auch Pausengastro") instead of creating a duplicate; otherwise it is its own shift.
- A briefing + performance call in the same block (e.g. 17:15 + 18:15) becomes one shift from the earliest call; the typical length counts from the performance call.
- Donor reception: 90 min. After-show party/supervision: starts at the typical end of the performance, 90 min (`NUXT_ESTIMATION_*`).

## Adding to calendars

- **Apple Calendar**: the button opens the `.ics` inline, which makes iOS/macOS offer to add all events to Calendar. (I did not use `webcal://`: it creates a read-only *subscription* that would go stale when the 7-day link expires.)
- **Google Calendar, direct**: needs a Google OAuth client. In Google Cloud Console enable the *Google Calendar API*, create an OAuth client (Web application), add the redirect URI `https://<your-host>/api/google/callback`, then set:
  `NUXT_GOOGLE_CLIENT_ID`, `NUXT_GOOGLE_CLIENT_SECRET` (optional `NUXT_GOOGLE_REDIRECT_URI`).
  The app asks only for the `calendar.events` scope, uses the token once and never stores it. Event ids are deterministic, so adding an updated roster updates events instead of duplicating them. While the OAuth app is in "Testing" mode, add coworkers as test users or publish the app.
- **Google without OAuth configured**: the button downloads the file and opens Google's import page.
- **Download .ics**: works everywhere (Outlook, Thunderbird, …).

## Languages

All text lives in `locales/de.ts` (source of truth) and `locales/en.ts` (type-checked against it, plus a test for key parity). The same dictionaries drive the UI and the calendar export text (`?lang=`). To add a language: create `locales/xx.ts` like `en.ts` and list it in `locales/index.ts`. Raw roster notes (e.g. "nach Fassade") are shown as written.

## Structure

```
locales/         de, en, translate()
server/
  domain/        types, venues (+ typical durations), time helpers
  modules/
    schedule/    documentTextExtractor (port: PDF + docx) · scheduleParser · personMatcher · nameIndex
    roster/      rosterService (parse once, suggestions, typo suspects)
    estimation/  endTimeEstimator, one strategy per role
    calendar/    CalendarExporter (port) · icsExporter · googleCalendar
    shifts/      shiftService (orchestration)
  infrastructure/ keyValueStore (port) · nitroStore (unstorage adapter)
  container.ts   composition root
  api/ utils/    thin HTTP layer, error codes
pages/ components/ composables/ assets/   frontend
tests/
```

## How to extend

| Change | Where |
|---|---|
| Typical shift lengths | `typicalDurationMin` in `domain/venues.ts` |
| Different end/start rule for a role | `STRATEGIES` in `endTimeEstimator.ts` |
| New venue or role | `domain/venues.ts` (+ `role.*` keys in `locales/`) |
| New export format | implement `CalendarExporter`, register in `calendar/index.ts` |
| Another input format | `MultiFormatExtractor` in `documentTextExtractor.ts` |
| Typo sensitivity | `tolerance()` / `looksLikeSameName()` in `nameIndex.ts` |
| Different roster layout | marker regexes at the top of `scheduleParser.ts` |
| Redis/KV instead of files for results | change the `sessions` storage driver in `nuxt.config.ts` |

## Notes

- The uploaded file itself is never stored. What is kept for 7 days (`sessionTtlHours`): the parsed roster (dates, venues, names), so suggestions and re-checks work, plus the extracted shifts for the export link.
- Roster files contain personal names: serve the app over HTTPS and behind your own access control if needed.
