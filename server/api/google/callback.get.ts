import { getContainer } from '../../container'
import { addShiftsToGoogle, exchangeCode } from '../../modules/calendar/googleCalendar'
import { DEFAULT_LOCALE, isLocale } from '../../../locales'
import { GOOGLE_STATE_COOKIE } from '../../utils/http'

export default defineEventHandler(async (event) => {
  const c = getContainer()
  const q = getQuery(event)
  const [id, nonce, lang] = String(q.state ?? '').split('.')
  const expected = getCookie(event, GOOGLE_STATE_COOKIE)
  deleteCookie(event, GOOGLE_STATE_COOKIE, { path: '/' })

  const back = (params: Record<string, string | number>) =>
    sendRedirect(event, `/?${new URLSearchParams({ export: id ?? '', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })}`)

  if (!c.google.enabled || !id || !nonce || nonce !== expected) return sendRedirect(event, '/?google=error')
  if (q.error) return back({ google: 'cancelled' })

  const result = await c.shifts.load(id)
  if (!result || typeof q.code !== 'string') return sendRedirect(event, '/?google=error')

  const origin = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
  try {
    const token = await exchangeCode({ ...c.google, redirectUri: c.google.redirectUri || `${origin}/api/google/callback` }, q.code)
    const ctx = c.exportContext(result.person, isLocale(lang) ? lang : DEFAULT_LOCALE)
    const r = await addShiftsToGoogle(token, result.shifts, ctx)
    return back({ google: 'done', ...r })
  } catch (err) {
    console.error('[google]', err instanceof Error ? err.message : err)
    return back({ google: 'error' })
  }
})
