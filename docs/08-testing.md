# 8. Testing

## Running

```bash
npm test                  # vitest run (all tests, ~2 s)
npx vitest                # watch mode
npx vitest run tests/names.spec.ts -t "typo"     # one file / one test by name
```

`vitest.config.ts` sets `esbuild.tsconfigRaw: '{}'` so tests do **not** need `nuxt prepare` or the generated
`.nuxt/tsconfig.json`. This works because everything under `server/modules` and `server/domain` is plain TypeScript
(see the dependency rule in [02](02-architecture.md)).

## What exists (49 tests in 6 files at the time of writing)

| File | Covers |
|---|---|
| `tests/schedule.spec.ts` | parser: year, explicit end, personal overrides, glued days, continuation blocks, roles, footer; matcher: variants vs. different people |
| `tests/roster-formats.spec.ts` | the December layout (`DEC_SAMPLE`): colon times, `ab ca`, missing/en dashes, new venues and role labels, markers inside parentheses, glued date headers, year rollover, remarks, "finds every occasion of a person", duplicates, particles in names |
| `tests/documents.spec.ts` | format sniffing (PDF, docx, legacy `.doc`, text), docx → same parse result as PDF text, error codes for broken files |
| `tests/names.spec.ts` | name index (counts, glued names), typing suggestions, typo detection, similar spellings, preview with/without typo check and `include` |
| `tests/shifts.spec.ts` | merge rules (briefing + call, separate shows, intermission gastro fold), explicit times, "did you mean", roster expiry, ICS (UTC/DST, stable UIDs, localisation, line folding), Google event building and insert/update/abort, nothing-matches cases |
| `tests/locales.spec.ts` | identical keys in every language, no empty strings, interpolation |

(`names.spec.ts` also pins the 3-letter threshold for fuzzy suggestions.)

## Test building blocks

* **`tests/fixtures.ts`**: `DEC_SAMPLE` (second roster layout, made-up names) and `SAMPLE` (an excerpt shaped like real extracted text: wrapped lines, a glued `KirnerSonntag`,
  a missing comma, footer) and `TYPO_SAMPLE` (a typo `Pacsal`, an inconsistent `Gina Huber`, a lost comma).
* **`tests/files/sample-roster.docx`**: the same text as separate Word paragraphs with a bold run.
* **`tests/helpers.ts`**:
  ```ts
  makeServices(text)                 // RosterService + ShiftService around a fake extractor, in-memory stores
  previewFor(text, name, opts?)      // upload + preview in one call -> { info, result, roster, shifts }
  ```
  The fake extractor returns `text` for any bytes, so service tests need no real files.

## Writing tests: by layer

| Layer | Approach |
|---|---|
| Parser / matcher / name index | call the pure function with a text snippet; assert on blocks / booleans |
| Estimator | build a `ShiftDraft` literal, assert the `Estimate` |
| Services | `previewFor(SAMPLE, 'Name')` and assert on `shifts` / `similar` |
| Exporters | export `previewFor(...).result.shifts` with a hand-made `ExportContext`; assert on the text |
| Google | pass a fake `fetch` to `addShiftsToGoogle` (see the existing test) |
| i18n | the parity test covers new keys automatically |

Rules of thumb:
* **Add the failing real-world snippet first**, then fix the code. Real roster quirks are the main regression risk.
* Assert behaviour (dates, times, tags), not internal structure.
* Names in fixtures are real-looking but belong to your roster; use made-up ones for anything you publish.

## Creating a docx fixture without Word

```python
import zipfile, html
text = "Sonntag, 04.10.:\nGROSSES HAUS ab 16.45 Uhr - Anna Test, Ben Probe"
body = ''.join(f'<w:p><w:r><w:t xml:space="preserve">{html.escape(l)}</w:t></w:r></w:p>' for l in text.split('\n'))
doc = f'<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{body}</w:body></w:document>'
ct = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
rels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
with zipfile.ZipFile('tests/files/new.docx', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', ct); z.writestr('_rels/.rels', rels); z.writestr('word/document.xml', doc)
```

## Checking against a real roster

Unit tests use excerpts. When a new month's roster arrives, run the dump script from
[05](05-roster-format.md#debugging-a-roster-that-parses-wrongly) and compare the blocks against the PDF for a few
days. To check names and the typo list:

```ts
import { buildNameIndex, findTypoSuspects } from '../server/modules/schedule/nameIndex'
const index = buildNameIndex(parseSchedule(text))
console.log(index.length, findTypoSuspects(index))
```

## End-to-end smoke test over HTTP

```bash
npm run build
PORT=3999 node .output/server/index.mjs &
RID=$(curl -s -F "file=@roster.pdf" localhost:3999/api/rosters | jq -r .id)
curl -s -H 'content-type: application/json' \
  -d "{\"rosterId\":\"$RID\",\"name\":\"Anna Test\",\"typoCheck\":true}" localhost:3999/api/shifts/preview | jq '.shifts | length'
```
Also try the error paths: a text file (415 `unsupported_file`), no file (400), an unknown `rosterId` (404).

## Not covered by automated tests

* The Vue UI (no component or browser tests). Suggested next step: Playwright for the main journey.
* The real Google OAuth round trip (only the request building and conflict handling are tested with a fake `fetch`).
* How Apple Calendar / Outlook / Google import the `.ics`: check manually after changing `icsExporter.ts`.
* Complex Word layouts (nested tables, text boxes).

## Pre-release checklist

1. `npm test`
2. `npm run build` and the smoke test above
3. Upload the newest real roster; spot-check five days against the PDF
4. Import the `.ics` into a test calendar (Apple/Google/Outlook) and verify times in local time, including a shift that
   ends after midnight
