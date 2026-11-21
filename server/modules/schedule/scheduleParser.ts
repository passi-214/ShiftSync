import { hhmm } from '../../domain/time'
import type { ParsedSchedule, RoleId, RosterPerson, ScheduleBlock, ShiftTag, VenueId } from '../../domain/types'
import { ROLE_PATTERNS, VENUES, venueByPdfLabel } from '../../domain/venues'

/**
 * Parses the "Foyermanagement" roster text (from PDF or Word).
 *
 * Deliberately line-break agnostic: text extraction wraps lines arbitrarily (and sometimes glues words,
 * e.g. "Antonia KirnerSonntag, 27.09."), so we flatten the text and tokenise on three kinds of markers:
 *   DATE   "Sonntag, 20.09.:"  /  "Mittwoch 23.12:"
 *   BLOCK  "[VENUE] ab 16.45 Uhr [bis 23.30 Uhr]"   (venue optional = continuation of the previous venue)
 *   ROLE   "Gastro:", "Pausengastro (wenn es eine Pause gibt):", "Empfang Donatoren/Förderer (ab 16.15 Uhr):" ...
 * Everything between two markers is the body (notes + people list).
 *
 * Times may be written "16.45" or "16:45", "Uhr" is optional, "ca" is allowed, and the separator after
 * the time may be "-", "–", "—" or missing. Markers inside parentheses are never markers.
 */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const VENUE_ALT = Object.values(VENUES)
  .flatMap((v) => v.pdfLabels)
  .sort((a, b) => b.length - a.length)
  .map(esc)
  .join('|')

const DATE = String.raw`(?<wd>Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),?\s*(?<dd>\d{1,2})\.(?<mo>\d{1,2})\.?\s*:`
const ROLE = String.raw`(?<role>Pausengastro|Gastro zu Tisch|Gastro zur Party|Gastro bei Premierenfeier|Gastro|Aufsicht Premierenfeier|Aufsicht Party|Empfang Donatoren\/Förderer|Falls Pause)(?:\s*\((?<rp>[^()]*)\))?\s*:`
// (?<!\() keeps "(ab 19.30 Uhr dazu)" from being read as a block; parenthesised matches are also filtered below.
const BLOCK = String.raw`(?:(?<venue>${VENUE_ALT})(?<extra>[^-–—:]*?)\s)?(?<!\()\b[Aa]b\s+(?:ca\.?\s*)?(?<h>\d{1,2})[.:](?<m>\d{2})(?:\s*Uhr)?(?:\s+bis\s+(?:ca\.?\s*)?(?<eh>\d{1,2})[.:](?<em>\d{2})(?:\s*Uhr)?)?`
const MARKER = new RegExp(`${DATE}|${ROLE}|${BLOCK}`, 'gu')

const MONTHS = 'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember'
const DASH = '\\-–—' // escaped hyphen: safe inside [...] next to other characters

export function normaliseText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function detectYear(flat: string): number | null {
  const m = flat.match(new RegExp(`(?:${MONTHS})(?:\\s*\\/\\s*(?:${MONTHS}))?\\s+(20\\d{2})`))
  return m ? Number(m[1]) : null
}

function roleFromLabel(label: string): RoleId {
  return ROLE_PATTERNS.find(([re]) => re.test(label.trim()))?.[1] ?? 'gastro'
}

/** Split on commas/semicolons that are not inside parentheses. */
function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if ((ch === ',' || ch === ';') && depth === 0) { out.push(cur); cur = '' } else cur += ch
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
      if (!name) continue // e.g. "(plus drei vom GH)" on its own
      const note = notes.join('; ') || null
      const bis = note?.match(/\bbis\s+(\d{1,2})[.:](\d{2})/)
      const ab = note?.match(/\bab\s+(\d{1,2})[.:](\d{2})/)
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

function splitBody(body: string, isBlock: boolean): { notes: string[]; people: RosterPerson[] } {
  let b = body.replace(/Letzter Abgabetermin.*$/u, '').trim()
  const notes: string[] = []

  // A trailing remark glued to the last name, e.g. "… Sonja Schweiger Es bleiben alle bis zum Schluss!"
  const remark = b.match(/\s+((?:Es|Bitte|Achtung|Wichtig|Alle)\s[^,;()]*[!.])\s*$/u)
  if (remark) { notes.push(remark[1]); b = b.slice(0, remark.index).trim() }

  // Leading separators, e.g. the comma in "Gastro:, Name" or the dash before the people list.
  b = b.replace(new RegExp(`^[\\s,;:${DASH}]+`, 'u'), '')

  if (isBlock) {
    // Leading "(note)" groups, each optionally followed by a dash: "(beide Vorstellungen) - …", "- (Aufräumaktion …) - …"
    for (;;) {
      const p = b.match(new RegExp(`^\\(([^()]*)\\)\\s*[${DASH}]?\\s*`, 'u'))
      if (!p) break
      notes.push(p[1].trim())
      b = b.slice(p[0].length)
    }
    // Free text before the people list: "und anschl. Konzert - names". No dash at all = only names.
    const d = b.match(new RegExp(`^(.*?)\\s[${DASH}]\\s+(.*)$`, 'u'))
    if (d) { notes.push(d[1].trim()); b = d[2] }
  }
  return { notes: notes.filter(Boolean), people: parsePeople(b) }
}

export function parseSchedule(rawText: string): ParsedSchedule {
  const flat = normaliseText(rawText)
  let year = detectYear(flat) ?? new Date().getFullYear()

  // Anything that starts inside "( … )" is part of a note, never a marker.
  const parens = [...flat.matchAll(/\([^()]*\)/g)].map((m) => [m.index!, m.index! + m[0].length] as const)
  const insideParens = (i: number) => parens.some(([a, b]) => a < i && i < b)
  const markers = [...flat.matchAll(MARKER)].filter((m) => !insideParens(m.index!))

  const blocks: ScheduleBlock[] = []
  let lastMonth = 0
  let date: string | null = null
  let ctx: { venue: VenueId; start: string | null } | null = null

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
      const { notes, people } = splitBody(body, false)
      const tags: ShiftTag[] = []
      const roleNotes: string[] = []
      if (/zu Tisch/i.test(g.role)) roleNotes.push('zu Tisch')
      const rp = g.rp?.trim()
      if (/^Falls Pause/i.test(g.role) || (rp && /Pause/i.test(rp))) tags.push('if_intermission')
      else if (rp && !/^ab\s/i.test(rp)) roleNotes.push(rp)
      const own = rp?.match(/\bab\s+(?:ca\.?\s*)?(\d{1,2})[.:](\d{2})/) // "Empfang … (ab 16.15 Uhr):"
      const all = [...roleNotes, ...notes]
      blocks.push({
        date, venue: ctx.venue, role: roleFromLabel(g.role),
        start: own ? hhmm(own[1], own[2]) : ctx.start, end: null,
        note: all.join('; ') || null, tags, people
      })
      return
    }

    // BLOCK
    const venue = g.venue ? venueByPdfLabel(g.venue)!.id : ctx?.venue
    if (!venue) return
    const start = hhmm(g.h, g.m)
    const end = g.eh ? hhmm(g.eh, g.em) : null
    ctx = { venue, start }
    const { notes, people } = splitBody(body, true)
    const extra = g.extra?.trim().replace(/^\/+\s*/, '') // "GROSSES HAUS/KONZERTHAUS ab …"
    const all = [...(extra ? [extra] : []), ...notes]
    blocks.push({ date, venue, role: 'floor', start, end, note: all.join('; ') || null, tags: [], people })
  })

  return { year, blocks }
}
