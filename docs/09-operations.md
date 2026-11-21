# 9. Setup, configuration and operations

## Requirements
Node.js 20+ (developed with 22), npm 10+. If `npm install` crashes with
`Cannot read properties of null (reading 'edgesOut')`, see [Troubleshooting](#troubleshooting).

## Commands

| Command | Purpose |
|---|---|
| `npm install` | install; the `postinstall` hook runs `nuxt prepare` (generates `.nuxt/` types) |
| `npm run dev` | dev server on http://localhost:3000 |
| `npm test` | unit tests |
| `npm run build` | production build into `.output/` |
| `node .output/server/index.mjs` | run the production build (`PORT`, `HOST` env) |

Commit `package-lock.json` so installs are reproducible (and `npm ci` works in CI/Docker).

## Configuration

All settings live in `runtimeConfig` in `nuxt.config.ts`. Any key can be overridden at runtime by an environment
variable named `NUXT_` + the key path in `UPPER_SNAKE_CASE` (a `.env` file works in development; see `.env.example`).

| Key | Environment variable | Default | Meaning |
|---|---|---|---|
| `sessionTtlHours` | `NUXT_SESSION_TTL_HOURS` | `168` | how long parsed rosters and results are kept |
| `maxUploadBytes` | `NUXT_MAX_UPLOAD_BYTES` | `5242880` | upload size limit |
| `calendar.timezone` | `NUXT_CALENDAR_TIMEZONE` | `Europe/Berlin` | IANA zone of the shifts |
| `calendar.address` | `NUXT_CALENDAR_ADDRESS` | Theater Freiburg address | calendar `LOCATION` suffix |
| `estimation.receptionDurationMin` | `NUXT_ESTIMATION_RECEPTION_DURATION_MIN` | `90` | donor reception length |
| `estimation.afterShowDurationMin` | `NUXT_ESTIMATION_AFTER_SHOW_DURATION_MIN` | `90` | party/after-show length |
| `google.clientId` | `NUXT_GOOGLE_CLIENT_ID` | empty | enables direct Google add (with secret) |
| `google.clientSecret` | `NUXT_GOOGLE_CLIENT_SECRET` | empty | |
| `google.redirectUri` | `NUXT_GOOGLE_REDIRECT_URI` | `<origin>/api/google/callback` | set when behind a proxy that changes the origin |

Venue-specific typical durations are **not** config; they are in `server/domain/venues.ts`
(see [07, recipe 3](07-extending.md#3-change-time-estimation) to make them configurable).

Storage is configured under `nitro.storage.sessions` (default: files in `./.data/sessions`).

## Google Calendar (direct add)

Without credentials the Google button falls back to the `.ics` import page, which works but is less convenient.
To enable the direct add:

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. *APIs & Services → Library* → enable **Google Calendar API**.
3. *OAuth consent screen*: user type **External** (or Internal for a Workspace org), add the scope
   `https://www.googleapis.com/auth/calendar.events`. While the app is in **Testing**, add every coworker as a test
   user (limit 100) or publish the app. Unverified apps show a warning screen to users.
4. *Credentials → Create credentials → OAuth client ID → Web application*. Authorised redirect URI:
   `https://<your-host>/api/google/callback` (exact match; for local testing also `http://localhost:3000/api/google/callback`).
5. Set `NUXT_GOOGLE_CLIENT_ID` and `NUXT_GOOGLE_CLIENT_SECRET`, restart. The page now shows direct add.

The app requests only `calendar.events`, writes to the user's **primary** calendar, and never stores the token.

## Deployment

The production build is a self-contained Node server.

```bash
npm ci && npm run build
PORT=3000 HOST=0.0.0.0 NUXT_GOOGLE_CLIENT_ID=… node .output/server/index.mjs
```

Checklist:
* **HTTPS** in front (reverse proxy such as nginx/Caddy). Forward `X-Forwarded-Host` and `X-Forwarded-Proto`: the
  Google redirect URI and the secure cookie flag are derived from them. If you cannot, set `NUXT_GOOGLE_REDIRECT_URI`.
* **Persistent volume** for `.data/` (the working directory's `.data/sessions`) if results should survive restarts.
* **One instance** with the default file storage; use Redis/DB when scaling out ([07, recipe 9](07-extending.md#9-change-where-data-is-stored)).
* **Access control** if the roster is not public ([07, recipe 10](07-extending.md#10-protect-the-app)).
* Upload limit: also raise the proxy's body size (`client_max_body_size` in nginx) if you raise `maxUploadBytes`.

### Docker example

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
VOLUME /app/.data
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

## Data and privacy

| Data | Where | How long |
|---|---|---|
| Uploaded file | not stored | – |
| Parsed roster (dates, venues, names, notes) | `.data/sessions/roster:<id>` | `sessionTtlHours` |
| Preview result (the person's shifts) | `.data/sessions/result:<id>` | `sessionTtlHours` |
| Name, language, typo-check preference | browser cookies (1 year) | until cleared |
| Google access token | memory, one request | seconds |

The roster contains coworkers' names. Anyone with a roster id can read its name list and anyone with a result id can
read that result, so treat ids as secrets and keep the TTL short if that matters. See also the data-protection
(DSGVO) obligations that apply to staff data in your organisation.

Logs: unexpected errors are written to stderr as `[api] …` and Google failures as `[google] …`. Names are not logged.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `npm install` fails with `Cannot read properties of null (reading 'edgesOut')` | bug in npm 10.3 while resolving peer dependencies. `npm install -g npm@latest`, or `npm install --legacy-peer-deps`, or use `pnpm install`. Delete `node_modules` and `package-lock.json` after a failed attempt. |
| `tsconfig` / `.nuxt` errors in the editor | run `npx nuxt prepare` |
| Upload says "unsupported file" | a legacy `.doc` or another type. Save as `.docx` or PDF. |
| Upload says "does not look like a roster" | scanned PDF (no text) or a changed layout; see [05](05-roster-format.md#debugging-a-roster-that-parses-wrongly) |
| "No shifts found" for a correct name | the name is spelled differently in the roster. Turn on the typo check, look at "Did you mean" and the typo panel. |
| Google: `redirect_uri_mismatch` | the redirect URI in the Cloud Console must equal `<origin>/api/google/callback` exactly (scheme, host, port). Behind a proxy set `NUXT_GOOGLE_REDIRECT_URI` and forward the `X-Forwarded-*` headers. |
| Google: "Access blocked / app not verified" | OAuth app in Testing mode: add the user as test user, or publish. |
| Google button downloads a file instead of signing in | credentials not set (`googleAdd` is `null`) |
| "This export has expired" | result older than the TTL; upload again |
| Apple Calendar does not offer to add events | some browsers just download the file: open it from Downloads; use "Download .ics" |
| Times off by one hour | check `NUXT_CALENDAR_TIMEZONE`; DST is handled by `Intl`, so a wrong zone is the usual cause |
