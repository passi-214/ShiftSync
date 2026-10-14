# ShiftSync

Upload the monthly Foyermanagement roster PDF + your name → preview your shifts → add them to Apple Calendar / Google Calendar or download the `.ics` file. German (default) and English UI.

The backend does all the logic; the frontend uploads, renders JSON and links to downloads.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (no Nuxt boot needed)
```

## Request flow

```
POST /api/shifts/preview (pdf + name)
  PdfTextExtractor -> ScheduleParser -> PersonMatcher -> EndTimeEstimator -> Shift[] (stored 7 days under an id)
GET  /api/exports/:id                 reopen a result
GET  /api/exports/:id/ics?lang=de|en[&inline=1]
GET  /api/google/start?id=…           (only if Google OAuth is configured) -> Google -> /api/google/callback
```

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
    schedule/    pdfTextExtractor (port) · scheduleParser · personMatcher
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
| Different PDF layout | marker regexes at the top of `scheduleParser.ts` |
| Redis/KV instead of files for results | change the `sessions` storage driver in `nuxt.config.ts` |

## Notes

- Uploaded PDFs are never stored; only the extracted shifts are kept for the export link (7 days).
- Roster files contain personal names: serve the app over HTTPS and behind your own access control if needed.
