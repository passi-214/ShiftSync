# 5. The roster format and the parser

The parser (`server/modules/schedule/scheduleParser.ts`) is the part most likely to need attention when the
roster's layout changes. This page describes what it expects and how each real-world quirk is handled.

## Grammar (informal)

```
Roster     := Header Day*
Header     := "FOYERMANAGEMENT" Month ["/" Month] Year            e.g. "FOYERMANAGEMENT Dezember 2026"
Day        := Weekday ["," ] DD "." MM ["."] ":"  (Block | RoleLine)*     "Sonntag, 20.09.:"  or  "Mittwoch 23.12:"
Block      := [VENUE [text]] ("ab"|"Ab") ["ca"] Time ["Uhr"] ["bis" Time ["Uhr"]] [Sep] (Note* [Sep]) People
RoleLine   := RoleLabel ["(" note ")"] ":" People                   "Pausengastro (wenn es eine Pause gibt): A B, C D"
Time       := HH "." MM  |  HH ":" MM
Sep        := "-" | "–" | "—"          (may be missing)
People     := Person ("," | ";" Person)*      ("und" also separates people)
Person     := Name ["(" note ")"]
```

Examples (both layouts the parser has seen):

```
Samstag, 26.09.:
FOYER GROSSES HAUS ab 14.00 Uhr bis 23.30 Uhr - Elke Rakus (bis 18.30 Uhr), Martin Vollmer, Constanze Graf (ab 19.30 Uhr dazu)
Gastro: Felix Rath, Franka Haberlandt
KLEINES HAUS ab 18.30 Uhr (offene Probe) - Liane Feist, Antonia Kirner

Mittwoch 23.12:
GROSSES HAUS ab 18:15 Uhr – Anna Beispiel, Pascal Nowarra
Pausengastro (wenn es eine Pause gibt): Anna Beispiel
WINTERER-FOYER ab 18:00 Uhr Anna Beispiel, Ben Muster            <- no dash at all
```

## How it works

1. **Flatten.** All whitespace (including line breaks and non-breaking spaces) collapses to single spaces. The
   parser therefore does **not** depend on line structure, which differs between PDF text extraction and Word.
2. **Tokenise on markers** with one global regex made of three alternatives (`MARKER = DATE | ROLE | BLOCK`):

   | Marker | Matches | Effect |
   |---|---|---|
   | `DATE` | `Sonntag, 20.09.:`, `Mittwoch 23.12:` (comma and trailing dot optional) | sets the current date, resets the venue context |
   | `BLOCK` | `[VENUE …] ab 16.45 Uhr`, `ab 16:45`, `ab ca 19:30 Uhr`, `Ab 14:00 Uhr`, with optional `bis HH:MM` | creates a `floor` block. The venue is optional: without it the block **continues the previous venue** of the day. |
   | `ROLE` | `Gastro:`, `Gastro zu Tisch:`, `Pausengastro:`, `Pausengastro (wenn es eine Pause gibt):`, `Gastro zur Party:`, `Gastro bei Premierenfeier:`, `Aufsicht Party:`, `Aufsicht Premierenfeier:`, `Empfang Donatoren/Förderer (ab 16.15 Uhr):`, `Falls Pause:` | creates a block for that role at the **current venue**, inheriting the call time of the last `BLOCK` (except Empfang, which has its own) |

3. **Markers inside parentheses are ignored.** `(plus zwei vom GH ab 19:30)` or `(ab 15:45 Uhr KHZ, …)` are notes,
   not new blocks. (Implemented by dropping any marker match that starts inside a balanced `( … )`.)
4. **Body = text between two markers.**
   * Block bodies may start with any number of `(note)` groups and/or free text before the first spaced dash:
     `(beide Vorstellungen) - …`, `- (Aufräumaktion …) - …`, `und anschl. Konzert - …`. These become the block `note`.
     Text between the venue and `ab` (`GROSSES HAUS/KONZERTHAUS ab …`) is added to the note as well.
   * If there is no dash, everything after the time is the people list.
   * Leading separators are stripped (`Gastro:, Name`).
   * A trailing remark glued to the last name (`… Sonja Schweiger Es bleiben alle bis zum Schluss!`) is moved to the
     note (it recognises sentences starting with *Es, Bitte, Achtung, Wichtig, Alle* and ending with `!` or `.`).
   * The footer `Letzter Abgabetermin …` is cut off.
5. **People**: split on commas and semicolons outside parentheses and on `und`. Parentheses become the person's
   `note`; `bis HH:MM` in it → personal `end`, `ab HH:MM` → personal `start`. A parenthesis without a name
   (`(plus drei vom KH)`) is dropped.
6. **Role labels** with a parenthesis: `(ab 16.15 Uhr)` sets the role's own start time; a text containing "Pause"
   (`wenn es eine Pause gibt`) sets the tag `if_intermission` (like `Falls Pause:`); other text becomes a note.
   `Gastro zu Tisch` is role `gastro` with the note "zu Tisch".
7. **Year**: taken from the header (`… 2026`). If the month number drops by more than 6 (December → January) the
   year increments (`Freitag, 01.01.:` becomes 2027).

Venue labels for `BLOCK` come from `VENUES[...].pdfLabels` (all spellings), sorted longest-first so
`FOYER GROSSES HAUS` wins over `GROSSES HAUS`.

## Real-world quirks and how they are handled

| Quirk in the files | Handling |
|---|---|
| Lines wrapped anywhere, even mid-name; Word paragraphs between every item | flattening |
| `FOYER` on one line and `GROSSES HAUS` on the next | flattening joins them into `FOYER GROSSES HAUS` |
| Times as `16.45` in one month and `16:45` in the next; `ab ca 19:30`; `ab 11:00` without `Uhr` | `Time` accepts `.` or `:`; `ca` and `Uhr` are optional |
| Separator `-`, `–`, `—`, or none: `ab 18:00 Uhr Janette …` | dash class `[-–—]`; no dash = all names |
| Day headers `Mittwoch 23.12:` (no comma, no dot) glued to the previous line | `DATE` has optional `,` and `.`, and no leading word boundary |
| Words glued across a page break: `Antonia KirnerSonntag, 27.09.:` | same as above |
| Venue spelled `WINTERER-FOYER` / `WINTERER FOYER`, `THEATER-BAR` / `THEATERBAR` | `pdfLabels` aliases |
| `GROSSES HAUS/KONZERTHAUS ab …` | venue = Großes Haus, "KONZERTHAUS" kept as note |
| `Gastro:, Frederike von Einem` and trailing commas | leading separators stripped, empty items skipped |
| Missing comma between people: `Constanze Graf Gina-Denise Huber` | kept as one item; the matcher still finds each person inside it (window of ≤ 3 tokens), the name index splits it using clean names |
| Missing comma after a note: `Antonia Kirner (bis zum Schluss) Ida von Bischopinck` | `)` followed by a capital letter gets a comma inserted |
| Same person twice in one block | the shift service de-duplicates |
| `Zita Von Wallenberg Pachaly` (four words) | the name index accepts up to 4 words when a particle (`von`, `van`, …) is present |
| `Gina Denise Huber` vs `Gina-Denise Huber` | same key in the name index (hyphen = space) |
| Stray `))`, doubled commas (`Vollmer,,`) | cleaned in `parsePeople` |
| `(ab 19.30 Uhr dazu)` or `(… ab 19:30)` looks like a block start | markers inside parentheses are ignored |
| `Empfang Donatoren/Förderer (ab 16.15 Uhr):` contains an `ab … Uhr` | part of the `ROLE` match, which starts earlier |
| Placeholders: `fünf vom GH`, `drei vom GH`, `vier vom GH plus zwei vom WR` | parsed as "people" but never match a real name; excluded from the name index |
| Typos in names (`Franka Haberland`, `Gina Huber`, `Pacsal`) | normal matcher tolerance + opt-in typo check |
| Garbled source entries (`Marioett Louis Unseld`, `Lea Maximilian Rath`) | kept as written; they appear as their own names |
| `Gina, Denise Huber` (a comma inside one name) | not repaired: it becomes `Gina` (dropped, one word) and `Denise Huber` |

## Format history

The roster's layout drifts from month to month. Known generations:

| Roster | Notable layout |
|---|---|
| September/October 2026 (PDF) | times `16.45`, always ` - `, venues Großes/Kleines Haus, Weltraum, Foyer GH, Stein-Foyer, Theater-Bar, Konzerthaus, `Falls Pause:` |
| December 2026 (Word) | times `18:15` (a few `18.15`), `–` or no dash, `ab ca`, new venues (Winterer-Foyer, Kantine, Theaterbar), `Gastro zu Tisch`, conditional `Pausengastro (…)`, notes in parentheses with times inside, `Mittwoch 23.12:` headers, year change |

Whenever the layout changes: add the new quirks to a fixture (see `DEC_SAMPLE` in `tests/fixtures.ts` and
`tests/roster-formats.spec.ts`), fix the parser, and add a row here.

## Output example

```ts
{
  date: '2026-09-26', venue: 'FOYER_GROSSES_HAUS', role: 'floor',
  start: '14:00', end: '23:30', note: null, tags: [],
  people: [
    { raw: 'Elke Rakus (bis 18.30 Uhr)', name: 'Elke Rakus', note: 'bis 18.30 Uhr', start: null, end: '18:30' },
    { raw: 'Constanze Graf (ab 19.30 Uhr dazu)', name: 'Constanze Graf', note: 'ab 19.30 Uhr dazu', start: '19:30', end: null }
  ]
}
```

## Things that are hard-coded (gotchas)

* **Weekday names** (German) are spelled out in the `DATE` regex.
* **Role labels** are spelled out in the `ROLE` regex *and* mapped in `ROLE_PATTERNS` (`domain/venues.ts`). A new
  role needs both (see [07](07-extending.md#2-add-a-role)).
* **Venue labels** are derived from `VENUES`, so a new venue only needs an entry there.
* A block start needs the word `ab`/`Ab` followed by a time. A line like `Foyer 16.45 Uhr - …` would not be recognised.
* The sentence starters for trailing remarks (`Es`, `Bitte`, `Achtung`, `Wichtig`, `Alle`) are a fixed list in `splitBody`.

## Debugging a roster that parses wrongly

Dump what the parser sees:

```ts
// scripts/dump.mts      run: npx tsx scripts/dump.mts roster.pdf
import { readFileSync } from 'node:fs'
import { MultiFormatExtractor } from '../server/modules/schedule/documentTextExtractor'
import { parseSchedule } from '../server/modules/schedule/scheduleParser'

const text = await new MultiFormatExtractor().extract(new Uint8Array(readFileSync(process.argv[2])))
console.log(text.slice(0, 1500))                     // 1. is the extracted text what you expect?
const { blocks } = parseSchedule(text)
for (const b of blocks) console.log(b.date, b.venue, b.role, b.start, b.end, b.people.map((p) => p.name).join(', '))
```

Typical causes and fixes:

| Symptom | Likely cause |
|---|---|
| `not_roster` error | no `DATE`+`BLOCK` markers found: text extraction returned nothing (scanned PDF → needs OCR) or the layout changed |
| A person is missing on a day | the venue/role label is not in the regexes (`VENUES.pdfLabels`, the `ROLE` regex), or the line has no `ab <time>` |
| Only a handful of days are found | a changed time or date format: compare a raw line with the `DATE`/`BLOCK` regexes (this happened when `16.45` became `16:45`) |
| Two people merged into one name | a comma was lost in the file (expected; the matcher copes) |
| Wrong year | header not recognised; check `detectYear` / `MONTHS` |

When you fix a case, add the offending snippet to `tests/fixtures.ts` and a test to `tests/schedule.spec.ts`.
