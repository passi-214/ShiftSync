# 4. API reference

All endpoints are under `/api`. Errors always have the shape
`{ statusCode, statusMessage: "<code>", data: { code: "<code>" } }` (see the table at the end).

## `POST /api/rosters`
Upload and parse a roster. `multipart/form-data` with one file field **`file`** (PDF or `.docx`).

```http
POST /api/rosters
Content-Type: multipart/form-data; boundary=…
```
```json
{
  "id": "0d6e7c58-…",
  "names": 45,
  "typoSuspects": [
    { "name": "Franka Haberland", "occurrences": 2, "probablyMeans": "Franka Haberlandt", "probablyMeansOccurrences": 23 }
  ]
}
```
Errors: `file_missing` (400), `file_too_large` (413), `unsupported_file` (415), `not_roster` (422), `read_failed` (500).

## `GET /api/rosters/:id/names?q=<text>`
Typing suggestions, at most 8, best first. `q` is cut at 80 characters; empty `q` returns the first 8 names alphabetically.
```json
[ { "name": "Pascal Nowarra", "occurrences": 13 } ]
```
Errors: `roster_expired` (404).

## `POST /api/shifts/preview`
JSON body:
```json
{ "rosterId": "0d6e7c58-…", "name": "Pascal Nowarra", "typoCheck": true, "include": ["Pacsal Nowarra"] }
```
| Field | Rules |
|---|---|
| `rosterId` | from `POST /api/rosters` |
| `name` | 3–80 chars and must contain a space (first + last name) |
| `typoCheck` | optional; enables `similar` results |
| `include` | optional; ≤ 10 spellings exactly as listed in `similar`/the index; unknown ones are ignored |

Response (`PreviewResponse`, abbreviated):
```json
{
  "id": "b3c1…",
  "person": "Pascal Nowarra",
  "period": { "from": "2026-10-04", "to": "2026-10-31" },
  "shifts": [
    {
      "id": "2026-10-03-GROSSES_HAUS-floor-1715",
      "date": "2026-10-03", "start": "17:15", "end": "22:45",
      "startIsEstimate": false, "endIsEstimate": true,
      "venue": "GROSSES_HAUS", "venueLabel": "Großes Haus",
      "role": "floor",
      "notes": ["Sicherheitseinführung vor dem Vorstellungsbetrieb"],
      "tags": ["break_gastro"],
      "listedAs": null
    }
  ],
  "similar": [ { "name": "Pacsal Nowarra", "occurrences": 1, "included": false } ],
  "links": { "ics": "/api/exports/b3c1…/ics", "googleAdd": null }
}
```
* `similar` is filled when `typoCheck` is true **or** nothing matched (then it is the "did you mean" list).
* `links.googleAdd` is `null` unless Google OAuth is configured.
* Errors: `name_invalid` (400), `file_missing` (400, no `rosterId`), `roster_expired` (404).
* Every call creates a new stored result with a new `id` (the old ones simply expire).

## `GET /api/exports/:id`
Re-open a stored result (used after the Google redirect). Same shape as the preview response.
Error: `export_expired` (404).

## `GET /api/exports/:id/ics`
| Query | Meaning |
|---|---|
| `lang=de\|en` | language of titles/descriptions (default `de`) |
| `inline=1` | `Content-Disposition: inline` instead of `attachment`: iOS/macOS then offer to add the events to Calendar directly |

Returns `text/calendar; charset=utf-8`, `Cache-Control: no-store`. File name `shifts-<person-slug>.ics`.
Error: `export_expired` (404).

## `GET /api/google/start?id=<resultId>&lang=de|en`
Only if Google OAuth is configured (otherwise 404). Sets the cookie `shiftsync-gstate` (10 min) and redirects (302)
to Google's consent screen. `state = <id>.<nonce>.<lang>`.

## `GET /api/google/callback`
Google's redirect target. Verifies the nonce, adds the shifts, then redirects to the page:

| Redirect | Meaning |
|---|---|
| `/?export=<id>&google=done&added=N&updated=M&failed=K` | finished |
| `/?export=<id>&google=cancelled` | user declined |
| `/?google=error` (with or without `export`) | invalid state, expired result, or Google error |

## Error codes

| Code | HTTP | UI message key |
|---|---|---|
| `file_missing` | 400 | `err.file_missing` |
| `name_invalid` | 400 | `err.name_invalid` |
| `file_too_large` | 413 | `err.file_too_large` |
| `unsupported_file` | 415 | `err.unsupported_file` |
| `not_roster` | 422 | `err.not_roster` |
| `roster_expired` | 404 | `err.roster_expired` |
| `export_expired` | 404 | `err.export_expired` |
| `read_failed` | 500 | `err.read_failed` |

Unknown codes fall back to `err.generic` in the UI.

## Trying it with curl

```bash
RID=$(curl -s -F "file=@arbeitsplan.pdf" localhost:3000/api/rosters | jq -r .id)
curl -s "localhost:3000/api/rosters/$RID/names?q=pas"
curl -s -H 'content-type: application/json' \
     -d "{\"rosterId\":\"$RID\",\"name\":\"Pascal Nowarra\",\"typoCheck\":true}" \
     localhost:3000/api/shifts/preview | jq '.shifts[] | {date,start,end,venueLabel,role}'
```
