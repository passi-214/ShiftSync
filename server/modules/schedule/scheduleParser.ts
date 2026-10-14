import { hhmm } from '../../domain/time'
import type { ParsedSchedule, RoleId, RosterPerson, ScheduleBlock, VenueId } from '../../domain/types'
import { ROLE_PATTERNS, VENUES, venueByPdfLabel } from '../../domain/venues'

/**
 * Parses the "Foyermanagement" roster PDF text.
 *
 * Deliberately line-break agnostic: PDF text extraction wraps lines arbitrarily
 * (and sometimes glues words, e.g. "Antonia KirnerSonntag, 27.09."), so we flatten
 * the text and tokenise on three kinds of markers:
 *   DATE   "Sonntag, 20.09.:"
 *   BLOCK  "[VENUE] ab 16.45 Uhr [bis 23.30 Uhr]"   (venue optional = continuation)
 *   ROLE   "Gastro:", "Pausengastro:", "Empfang Donatoren/Förderer (ab 16.15 Uhr):" ...
 * Everything between two markers is the body (note + people list).
 */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const VENUE_ALT = Object.values(VENUES)
  .map((v) => v.pdfLabel)
  .sort((a, b) => b.length - a.length)
  .map(esc)
  .join('|')

const DATE = String.raw`(?<wd>Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),\s*(?<dd>\d{1,2})\.(?<mo>\d{1,2})\.\s*:`
const ROLE = String.raw`(?<role>Pausengastro|Gastro zur Party|Gastro bei Premierenfeier|Gastro|Aufsicht Premierenfeier|Aufsicht Party|Empfang Donatoren\/Förderer(?:\s*\(ab\s*(?<rh>\d{1,2})\.(?<rm>\d{2})\s*Uhr\))?|Falls Pause)\s*:`
// (?<!\() keeps "(ab 19.30 Uhr dazu)" inside a person's note from being read as a block.
const BLOCK = String.raw`(?:(?<venue>${VENUE_ALT})[^-:]*?\s)?(?<!\()\bab\s+(?<h>\d{1,2})\.(?<m>\d{2})\s*Uhr(?:\s+bis\s+(?<eh>\d{1,2})\.(?<em>\d{2})\s*Uhr)?`
const MARKER = new RegExp(`${DATE}|${ROLE}|${BLOCK}`, 'gu')

const MONTHS = 'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember'

export function normaliseText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function detectYear(flat: string): number | null {
  const m = flat.match(new RegExp(`(?:${MONTHS})(?:\\s*\\/\\s*(?:${MONTHS}))?\\s+(20\\d{2})`))
  return m ? Number(m[1]) : null
}

function roleFromLabel(label: string): RoleId {
  const clean = label.replace(/\s*\(.*$/, '').trim()
  return ROLE_PATTERNS.find(([re]) => re.test(clean))?.[1] ?? 'gastro'
}

/** Split on commas that are not inside parentheses. */
function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out
}

export function parsePeople(names: string): RosterPerson[] {
  // "(…) Next Name" with a missing comma -> insert one.
  const prepared = names.replace(/\)+\s+(?=[A-ZÄÖÜ])/gu, '), ')
  const people: RosterPerson[] = []
  for (const chunk of splitTopLevel(prepared)) {
    for (const raw of chunk.split(/\s+und\s+/u)) {
      const notes = [...raw.matchAll(/\(([^()]*)\)?/g)].map((m) => m[1].trim()).filter(Boolean)
      const name = raw.replace(/\([^()]*\)?/g, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim()
      if (!name) continue
      const note = notes.join('; ') || null
      const bis = note?.match(/\bbis\s+(\d{1,2})\.(\d{2})\s*Uhr/)
      const ab = note?.match(/\bab\s+(\d{1,2})\.(\d{2})\s*Uhr/)
      people.push({
        raw: raw.trim(),
        name,
        note,
        start: ab ? hhmm(ab[1], ab[2]) : null,
        end: bis ? hhmm(bis[1], bis[2]) : null
      })
    }
  }
  return people
}

function splitBody(body: string, isBlock: boolean): { note: string | null; people: RosterPerson[] } {
  let b = body.replace(/Letzter Abgabetermin.*$/u, '').trim()
  let note: string | null = null
  if (isBlock) {
    const m = b.match(/^(?:(.*?)\s)?-\s+(.*)$/u)
    if (m) { note = m[1]?.trim().replace(/^\((.*)\)$/u, '$1') || null; b = m[2] }
  } else {
    b = b.replace(/^[-–]\s*/, '')
  }
  return { note, people: parsePeople(b) }
}

export function parseSchedule(rawText: string): ParsedSchedule {
  const flat = normaliseText(rawText)
  let year = detectYear(flat) ?? new Date().getFullYear()
  const markers = [...flat.matchAll(MARKER)]
  const blocks: ScheduleBlock[] = []

  let lastMonth = 0
  let date: string | null = null
  let ctx: { venue: VenueId; start: string | null; end: string | null } | null = null

  markers.forEach((m, i) => {
    const g = m.groups!
    const body = flat.slice(m.index! + m[0].length, markers[i + 1]?.index ?? flat.length)

    if (g.wd) {
      const month = Number(g.mo)
      if (lastMonth && lastMonth - month > 6) year++ // Dec -> Jan rollover
      lastMonth = month
      date = `${year}-${String(month).padStart(2, '0')}-${String(g.dd).padStart(2, '0')}`
      ctx = null
      return
    }
    if (!date) return

    if (g.role) {
      if (!ctx) return
      const { people } = splitBody(body, false)
      blocks.push({
        date, venue: ctx.venue, role: roleFromLabel(g.role),
        start: g.rh ? hhmm(g.rh, g.rm) : ctx.start, end: null,
        note: null, tags: /^Falls Pause/.test(g.role) ? ['if_intermission'] : [], people
      })
      return
    }

    // BLOCK
    const venue = g.venue ? venueByPdfLabel(g.venue)!.id : ctx?.venue
    if (!venue) return
    const start = hhmm(g.h, g.m)
    const end = g.eh ? hhmm(g.eh, g.em) : null
    ctx = { venue, start, end }
    const { note, people } = splitBody(body, true)
    blocks.push({ date, venue, role: 'floor', start, end, note, tags: [], people })
  })

  return { year, blocks }
}
