import type { Shift } from '../../domain/types'
import { translate, type Locale } from '../../../locales'

export interface ExportContext {
  person: string
  calendarName: string
  address: string
  timezone: string
  locale: Locale
}

export interface ExportFile { filename: string; contentType: string; body: string }

/** One exporter per output format. Register new ones in calendar/index.ts. */
export interface CalendarExporter {
  readonly id: string
  export(shifts: Shift[], ctx: ExportContext): ExportFile
}

export const roleLabel = (s: Shift, locale: Locale) => translate(locale, `role.${s.role}`)
export const eventTitle = (s: Shift, locale: Locale) => `${s.venueLabel} – ${roleLabel(s, locale)}`
export const eventLocation = (s: Shift, address: string) => `${s.venueLabel}, ${address}`

export function eventDescription(s: Shift, locale: Locale): string {
  const lines = [...s.tags.map((t) => translate(locale, `tag.${t}`)), ...s.notes]
  if (s.listedAs) lines.push(translate(locale, 'shift.listedAs', { name: s.listedAs }))
  if (s.startIsEstimate) lines.push(translate(locale, 'export.estimatedTimes'))
  else if (s.endIsEstimate) lines.push(translate(locale, 'export.estimatedEnd'))
  return lines.join('\n')
}
