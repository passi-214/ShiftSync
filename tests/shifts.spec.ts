import { describe, expect, it } from 'vitest'
import { shiftInstants } from '../server/domain/time'
import { IcsExporter, foldLine } from '../server/modules/calendar/icsExporter'
import { addShiftsToGoogle, toGoogleEvent } from '../server/modules/calendar/googleCalendar'
import { InputError } from '../server/domain/errors'
import { SAMPLE } from './fixtures'
import { makeServices, previewFor } from './helpers'

const preview = async (name: string) => (await previewFor(SAMPLE, name)).result
const ctx = (locale: 'de' | 'en' = 'de') =>
  ({ person: 'Janette Bäuerle', calendarName: 'T', address: 'Bertoldstraße 46, 79098 Freiburg', timezone: 'Europe/Berlin', locale })

describe('shift service', () => {
  it('merges briefing + call into one shift and estimates the end from the call', async () => {
    const day = (await preview('Janette Bäuerle')).shifts.filter((s) => s.date === '2026-10-03')
    const floor = day.find((s) => s.role === 'floor')!
    expect(floor.start).toBe('17:15')
    expect(floor.end).toBe('22:45') // 18:15 call + 270 min, not counted from the earlier briefing
    expect(floor.endIsEstimate).toBe(true)
  })
  it('keeps shows hours apart as separate shifts', async () => {
    expect((await preview('Janette Bäuerle')).shifts.filter((s) => s.date === '2026-10-15')).toHaveLength(2)
  })
  it('lets explicit roster times win and keeps personal notes', async () => {
    const foyer = (await preview('Janette Bäuerle')).shifts.find((s) => s.venue === 'FOYER_GROSSES_HAUS')!
    expect(foyer.end).toBe('23:30'); expect(foyer.endIsEstimate).toBe(false); expect(foyer.notes).toContain('nach Fassade')
    const elke = (await preview('Elke Rakus')).shifts.find((s) => s.venue === 'FOYER_GROSSES_HAUS')!
    expect(elke.end).toBe('18:30') // "(bis 18.30 Uhr)"
  })
  it('folds intermission gastro into the house shift: same start, no duplicate', async () => {
    const day = (await preview('Janette Bäuerle')).shifts.filter((s) => s.date === '2026-09-27' && s.venue === 'GROSSES_HAUS')
    expect(day).toHaveLength(1)
    expect(day[0].start).toBe('16:45'); expect(day[0].tags).toContain('break_gastro')
  })
  it('keeps intermission gastro as its own shift (same start as the block) when the person is not in the house list', async () => {
    const { result } = await previewFor('Sonntag, 04.10.: GROSSES HAUS ab 16.45 Uhr - Anna Test Pausengastro: Bea Beispiel, Chris Probe', 'Bea Beispiel')
    const [s] = result.shifts
    expect(s.role).toBe('break_gastro'); expect(s.start).toBe('16:45'); expect(s.end).toBe('21:15')
  })
  it('offers "did you mean" spellings when nothing matches', async () => {
    const r = (await previewFor(SAMPLE, 'Janette Bäuerel')).result
    expect(r.shifts).toHaveLength(0)
    expect(r.similar.map((x) => x.name)).toContain('Janette Bäuerle')
  })
  it('can reload a stored result and rejects unknown / expired rosters', async () => {
    const { shifts, result } = await previewFor(SAMPLE, 'Elke Rakus')
    expect((await shifts.load(result.id))!.person).toBe('Elke Rakus')
    expect(await shifts.load('nope')).toBeNull()
    await expect(shifts.preview('missing', 'Elke Rakus')).rejects.toMatchObject({ code: 'roster_expired' })
  })
  it('rejects files that are not a roster', async () => {
    const { roster } = makeServices('Einkaufsliste: Milch, Eier')
    await expect(roster.ingest(new Uint8Array())).rejects.toBeInstanceOf(InputError)
  })
})

describe('calendar export', () => {
  it('converts Berlin time to UTC across DST', () => {
    expect(shiftInstants('2026-10-03', '18:15', '22:00', 'Europe/Berlin').start.toISOString()).toBe('2026-10-03T16:15:00.000Z')
    expect(shiftInstants('2026-10-31', '18:15', '22:00', 'Europe/Berlin').start.toISOString()).toBe('2026-10-31T17:15:00.000Z')
  })
  it('emits valid, stable, localized ICS', async () => {
    const { shifts } = await preview('Janette Bäuerle')
    const de = new IcsExporter().export(shifts, ctx('de')).body, en = new IcsExporter().export(shifts, ctx('en')).body
    expect(de.match(/BEGIN:VEVENT/g)!.length).toBe(shifts.length)
    expect(de).toContain('Foyer / Haus'); expect(en).toContain('Foyer / house')
    expect(de.match(/^UID:.*$/gm)).toEqual(en.match(/^UID:.*$/gm)) // language does not change identity
    expect(de.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true)
    expect(foldLine('X'.repeat(200)).split('\r\n').length).toBeGreaterThan(2)
  })
})

describe('google calendar', () => {
  it('builds events with local time + zone and rolls past midnight', async () => {
    const { shifts } = await preview('Janette Bäuerle')
    const after = shifts.find((s) => s.role === 'after_show_supervision')!
    const e = toGoogleEvent(after, ctx())
    expect(e.start).toEqual({ dateTime: '2026-10-03T22:45:00', timeZone: 'Europe/Berlin' })
    expect(e.end.dateTime).toBe('2026-10-04T00:15:00')
    expect(e.id).toMatch(/^[0-9a-f]{40}$/)
    expect(e.id).toBe(toGoogleEvent(after, ctx('en')).id)
  })
  it('inserts, updates on conflict, counts failures and aborts on auth errors', async () => {
    const { shifts } = await preview('Janette Bäuerle')
    const sample = shifts.slice(0, 4)
    const seen: string[] = []
    const fake = (async (url: string, init: any) => {
      seen.push(init.method)
      const n = seen.length
      return { ok: n === 1, status: n === 1 ? 200 : n === 2 ? 409 : n === 3 ? 200 : 500 }
    }) as any
    const r = await addShiftsToGoogle('tok', sample, ctx(), fake)
    expect(r.added + r.updated + r.failed).toBe(4)
    expect(seen).toContain('PUT')
    await expect(addShiftsToGoogle('bad', sample, ctx(), (async () => ({ ok: false, status: 401 })) as any)).rejects.toThrow()
  })
})
