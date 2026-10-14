import { createHash } from 'node:crypto'
import { shiftInstants } from '../../domain/time'
import type { Shift } from '../../domain/types'
import { eventDescription, eventLocation, eventTitle, type CalendarExporter, type ExportContext, type ExportFile } from './types'

const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** RFC 5545: lines max 75 octets, continuation lines start with a space. */
export function foldLine(line: string): string {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = Buffer.byteLength(ch)
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0 }
    cur += ch
    bytes += b
  }
  out.push(cur)
  return out.map((l, i) => (i ? ' ' + l : l)).join('\r\n')
}

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Stable per person+shift, so re-importing an updated PDF updates events instead of duplicating them. */
export const shiftUid = (person: string, shiftId: string) =>
  createHash('sha1').update(`${person.toLowerCase()}|${shiftId}`).digest('hex').slice(0, 24) + '@shiftsync'

export class IcsExporter implements CalendarExporter {
  readonly id = 'ics'

  export(shifts: Shift[], ctx: ExportContext): ExportFile {
    const stamp = utc(ctx.now ?? new Date())
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ShiftSync//Theater roster//DE',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeText(ctx.calendarName)}`, `X-WR-TIMEZONE:${ctx.timezone}`
    ]
    for (const s of shifts) {
      const { start, end } = shiftInstants(s.date, s.start, s.end, ctx.timezone)
      lines.push(
        'BEGIN:VEVENT',
        `UID:${shiftUid(ctx.person, s.id)}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${utc(start)}`,
        `DTEND:${utc(end)}`,
        `SUMMARY:${escapeText(eventTitle(s, ctx.locale))}`,
        `LOCATION:${escapeText(eventLocation(s, ctx.address))}`,
        `DESCRIPTION:${escapeText(eventDescription(s, ctx.locale))}`,
        'END:VEVENT'
      )
    }
    lines.push('END:VCALENDAR')
    return {
      filename: `shifts-${ctx.person.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.ics`,
      contentType: 'text/calendar; charset=utf-8',
      body: lines.map(foldLine).join('\r\n') + '\r\n'
    }
  }
}
