import { createHash } from 'node:crypto'
import { addDaysIso, toMinutes } from '../../domain/time'
import type { Shift } from '../../domain/types'
import { eventDescription, eventLocation, eventTitle, type ExportContext } from './types'

/**
 * Direct "add to Google Calendar" via OAuth. Optional: only active when client id/secret are configured.
 * The access token is used once for this request and never stored.
 */
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export interface GoogleOAuthConfig { clientId: string; clientSecret: string; redirectUri: string }

export function authUrl(cfg: GoogleOAuthConfig, state: string): string {
  const u = new URL(AUTH_URL)
  u.search = new URLSearchParams({
    client_id: cfg.clientId, redirect_uri: cfg.redirectUri, response_type: 'code',
    scope: SCOPE, state, access_type: 'online', include_granted_scopes: 'true'
  }).toString()
  return u.toString()
}

export async function exchangeCode(cfg: GoogleOAuthConfig, code: string, f: typeof fetch = fetch): Promise<string> {
  const res = await f(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: cfg.clientId, client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri, grant_type: 'authorization_code'
    })
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`)
  return ((await res.json()) as { access_token: string }).access_token
}

/** Deterministic id (hex is valid for Google event ids) => adding twice updates instead of duplicating. */
export const googleEventId = (person: string, shiftId: string) =>
  createHash('sha1').update(`${person.toLowerCase()}|${shiftId}`).digest('hex')

export function toGoogleEvent(s: Shift, ctx: ExportContext) {
  const endDate = toMinutes(s.end) <= toMinutes(s.start) ? addDaysIso(s.date, 1) : s.date
  return {
    id: googleEventId(ctx.person, s.id),
    status: 'confirmed',
    summary: eventTitle(s, ctx.locale),
    location: eventLocation(s, ctx.address),
    description: eventDescription(s, ctx.locale),
    start: { dateTime: `${s.date}T${s.start}:00`, timeZone: ctx.timezone },
    end: { dateTime: `${endDate}T${s.end}:00`, timeZone: ctx.timezone }
  }
}

export interface AddResult { added: number; updated: number; failed: number }

export async function addShiftsToGoogle(
  token: string, shifts: Shift[], ctx: ExportContext, f: typeof fetch = fetch
): Promise<AddResult> {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
  const result: AddResult = { added: 0, updated: 0, failed: 0 }

  const one = async (s: Shift) => {
    const event = toGoogleEvent(s, ctx)
    const res = await f(EVENTS_URL, { method: 'POST', headers, body: JSON.stringify(event) })
    if (res.ok) return void result.added++
    if (res.status === 401 || res.status === 403) throw new Error(`Google rejected the request: ${res.status}`)
    if (res.status === 409) { // already exists (re-import) -> update in place
      const put = await f(`${EVENTS_URL}/${event.id}`, { method: 'PUT', headers, body: JSON.stringify(event) })
      return void (put.ok ? result.updated++ : result.failed++)
    }
    result.failed++
  }

  for (let i = 0; i < shifts.length; i += 5) await Promise.all(shifts.slice(i, i + 5).map(one))
  return result
}
