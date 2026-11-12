import type { EventHandlerRequest, H3Event } from 'h3'
import { getContainer } from '../container'
import { InputError } from '../domain/errors'
import type { ApiErrorCode, PreviewResponse } from '../domain/types'
import { DEFAULT_LOCALE, isLocale, type Locale } from '../../locales'

type Ev = H3Event<EventHandlerRequest>

export const GOOGLE_STATE_COOKIE = 'shiftsync-gstate'

const STATUS: Record<ApiErrorCode, number> = {
  file_missing: 400, file_too_large: 413, unsupported_file: 415, name_invalid: 400,
  not_roster: 422, read_failed: 500, roster_expired: 404, export_expired: 404
}

/** Errors carry a machine-readable code; the UI translates it. */
export function apiError(code: ApiErrorCode): never {
  throw createError({ statusCode: STATUS[code], statusMessage: code, data: { code } })
}

/** Maps domain errors to API errors; anything unexpected becomes read_failed. */
export function rethrow(err: unknown): never {
  if (err instanceof InputError) apiError(err.code)
  console.error('[api]', err)
  apiError('read_failed')
}

export const localeFrom = (event: Ev): Locale => {
  const l = getQuery(event).lang
  return isLocale(l) ? l : DEFAULT_LOCALE
}

export function linksFor(id: string): PreviewResponse['links'] {
  return {
    ics: `/api/exports/${id}/ics`,
    googleAdd: getContainer().google.enabled ? `/api/google/start?id=${id}` : null
  }
}
