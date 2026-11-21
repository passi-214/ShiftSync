# 10. Design decisions, known limitations and ideas

## Decisions (and why)

| # | Decision | Reason / trade-off |
|---|---|---|
| D1 | **No scraping of the theatre's program.** End times are estimated from the call time + a typical length per venue. | The website blocks automated access. Estimates are marked `~` and are good enough for a calendar entry. A real feed can be plugged in later (see [07, recipe 3](07-extending.md#3-change-time-estimation)). |
| D2 | **Parse once, keep the roster server-side**, refer to it by id. | Suggestions while typing and re-checks (typo confirmations) would otherwise re-upload and re-parse the file on every keystroke/click. Cost: parsed names are stored for `sessionTtlHours`. |
| D3 | **Suggestions are computed on the server.** | Single implementation of the matching rules, easy to test; the list is small so latency is fine (debounced). |
| D4 | **Two-tier name matching**: a tolerant normal matcher that applies automatically, and a lenient typo check that is opt-in. | Auto-matching stays precise (different people are not mixed up), while real typos like `Pacsal` can still be found, with the user's confirmation. |
| D5 | **Similar spellings are suggested, never added silently.** | A wrong guess would put someone else's shifts in your calendar. The user ticks what is theirs; confirmed shifts are labelled "Listed as …". |
| D6 | **Intermission gastro is folded into the house shift** (tag) when it exists at the same venue/day. | It starts at the same time; two identical calendar entries are noise. If there is no house shift it stays a separate shift. |
| D7 | **Apple button serves the `.ics` inline instead of `webcal://`.** | `webcal://` creates a read-only subscription that would go stale when the result expires. Inline `text/calendar` lets iOS/macOS offer to *add* the events. |
| D8 | **Direct Google add via OAuth is optional**, events use deterministic ids. | It needs credentials the operator must create; without them the app degrades to the `.ics` import page. Deterministic ids make a second add update instead of duplicate. |
| D9 | **Times are `HH:mm` strings; `end <= start` means after midnight.** | Avoids time-zone bugs in the domain; zone conversion only happens when exporting. |
| D10 | **Storage through Nitro `useStorage`** (files by default). | No database to run; swapping to Redis is configuration. |
| D11 | **Own tiny i18n** (`locales/` + `translate()`) instead of `@nuxtjs/i18n`. | The server also needs translations (calendar text). One dictionary shared by both sides, type-checked key parity. Trade-offs: no locale-prefixed routes, no lazy loading, only `one`/`other` plurals. Fine for two languages; reconsider for many. |
| D12 | **Hand-written ICS**, ~60 lines. | One output, fully covered by tests (folding, escaping, UTC). A library would be a dependency for little gain. |
| D13 | **Flatten-and-tokenise parser** instead of line-based parsing. | PDF and Word extraction break lines arbitrarily and glue words. Markers (`DATE`, `BLOCK`, `ROLE`) are stable, line breaks are not. |

## Known limitations

**Correctness**
1. **Calendar identity includes the start time.** The shift `id` is `<date>-<venue>-<role>-<HHmm>` and the ICS UID /
   Google event id derive from it. Re-importing an unchanged shift updates it, but if the roster *changes the start
   time*, the old event stays and a new one is created. Fixing this requires an identity without the time, but then two
   shifts on the same date/venue/role (e.g. two Weltraum shows) collide. A possible approach is a sequence number per
   (date, venue, role).
2. **First names match by a 3-letter prefix.** Two colleagues with the same last name and first names starting with the
   same three letters (e.g. "Mara Kettner" / "Marie Kettner") would be treated as the same person. Tighten
   `firstNameSimilar` in `personMatcher.ts` if this ever happens.
3. **Two people with exactly the same name** cannot be told apart.
4. **A comma inside one name** (`Gina, Denise Huber`) splits it into `Gina` and `Denise Huber`; the single word is
   dropped. **Typo ties are not flagged.** If two spellings occur equally often (Lilli / Liliana Deimann, 6× each) neither is
   called the typo. Garbled entries from the source (`Marioett Louis Unseld`) are kept as written.
5. **Estimates are guesses.** The typical durations come from experience, not data. Real end times vary by production.

**Input**
6. The layout is hard-coded in the parser: German weekday names, role labels, `ab <time>` (see
   [05](05-roster-format.md#things-that-are-hard-coded-gotchas)). **The roster format drifts between months** (the
   December file switched from `16.45` to `16:45`, added venues, dropped dashes); each drift needed a parser update.
   See "Format history" in [05](05-roster-format.md#format-history), and add a fixture for every new layout.
   A symptom of a changed format is that only a few days are found.
7. Scanned PDFs (images) have no text and are not supported (no OCR). Legacy `.doc` is rejected. Complex Word
   structures (nested tables, text boxes) are untested.

**Operations and security**
8. **No authentication, no rate limiting.** Ids are random but unauthenticated.
9. **File storage is single-instance** and expired entries are only removed when read (no sweeper by default).
10. **Every preview creates a new stored result**; unused ones wait for expiry.
11. The time zone is fixed per deployment.

**Verification**
12. The Google OAuth round trip has not been run against a live Google project, and the Apple "inline" behaviour has not
    been checked on real devices. Only the request building and parsing logic are unit-tested.
13. No automated UI tests.

**UX**
14. Roster notes ("nach Fassade") are shown in German in both languages. Venue names are not translated.
15. Suggestions are capped at 8 and the typed part is not highlighted.

## Ideas / backlog

* **What changed?** Compare two versions of a roster for a person and show added/moved/removed shifts (needs the
  stable identity from limitation 1).
* **Live subscription feed** ([07, recipe 13](07-extending.md#13-live-calendar-subscription-webcal)).
* **Several months at once** (merge rosters) and a month filter in the preview.
* **Playwright tests** for the main journey; component tests for `NameCombobox`.
* **Input validation with a schema library** (e.g. Zod) and a generated OpenAPI description.
* **Admin view for the roster coordinator**: typo list with "copy corrected text", missing call times, double bookings
  (the same person in two venues at the same time).
* **Official performance data**, if a feed becomes available, for exact end times.
* **Structured logging / metrics**, and a health endpoint for monitoring.
* **PWA / "share target"** so the roster can be sent to the app from a phone's share sheet.
