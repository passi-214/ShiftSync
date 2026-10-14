import type { EventHandlerRequest, H3Event } from 'h3'
import { getContainer } from '../container'
import type { ApiErrorCode, PreviewResponse } from '../domain/types'
import { DEFAULT_LOCALE, isLocale, type Locale } from '../../locales'

type Ev = H3Event<EventHandlerRequest>

export const GOOGLE_STATE_COOKIE = 'shiftsync-gstate'

/** Errors carry a machine-readable code; the UI translates it. */
export function apiError(statusCode: number, code: ApiErrorCode): never {
  throw createError({ statusCode, statusMessage: code, data: { code } })
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
