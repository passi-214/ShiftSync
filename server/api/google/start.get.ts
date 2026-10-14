import { randomUUID } from 'node:crypto'
import { getContainer } from '../../container'
import { authUrl } from '../../modules/calendar/googleCalendar'
import { GOOGLE_STATE_COOKIE, apiError, localeFrom } from '../../utils/http'

export default defineEventHandler(async (event) => {
  const c = getContainer()
  if (!c.google.enabled) throw createError({ statusCode: 404 })

  const id = String(getQuery(event).id ?? '')
  if (!(await c.shifts.load(id))) apiError(404, 'export_expired')

  const origin = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
  const nonce = randomUUID()
  setCookie(event, GOOGLE_STATE_COOKIE, nonce, { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/', secure: origin.startsWith('https') })

  return sendRedirect(event, authUrl(
    { ...c.google, redirectUri: c.google.redirectUri || `${origin}/api/google/callback` },
    `${id}.${nonce}.${localeFrom(event)}`
  ))
})
