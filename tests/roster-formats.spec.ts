import { describe, expect, it } from 'vitest'
import { buildNameIndex } from '../server/modules/schedule/nameIndex'
import { parseSchedule } from '../server/modules/schedule/scheduleParser'
import { DEC_SAMPLE } from './fixtures'
import { previewFor } from './helpers'

const s = parseSchedule(DEC_SAMPLE)
const on = (d: string) => s.blocks.filter((b) => b.date === d)
const names = (d: string, venue: string, role = 'floor') =>
  on(d).filter((b) => b.venue === venue && b.role === role).flatMap((b) => b.people.map((p) => p.name))

describe('December roster layout', () => {
  it('reads dates in all header variants and rolls the year over', () => {
    const dates = [...new Set(s.blocks.map((b) => b.date))]
    expect(dates).toEqual(['2026-12-01', '2026-12-02', '2026-12-04', '2026-12-09', '2026-12-12', '2026-12-14', '2026-12-22', '2026-12-23', '2026-12-31', '2027-01-01'])
  })
  it('reads colon times, "ab ca" and times without "Uhr"', () => {
    expect(on('2026-12-02').find((b) => b.venue === 'GROSSES_HAUS')!.start).toBe('18:15')
    expect(on('2026-12-02').find((b) => b.venue === 'THEATER_BAR')!.start).toBe('19:30')
    expect(on('2026-12-14')[0].start).toBe('18:30') // dotted times still work
  })
  it('accepts a missing dash and en dashes', () => {
    expect(names('2026-12-09', 'WINTERER_FOYER')).toEqual(['Anna Beispiel', 'Ben Muster'])
    expect(names('2026-12-12', 'GROSSES_HAUS')).toContain('Pascal Nowarra')
  })
  it('knows the new venues and their spellings', () => {
    expect(on('2026-12-04').some((b) => b.venue === 'KANTINE')).toBe(true)
    expect(on('2026-12-12').filter((b) => b.venue === 'WINTERER_FOYER')).toHaveLength(1) // "WINTERER FOYER" without hyphen
    expect(on('2026-12-22').some((b) => b.venue === 'THEATER_BAR')).toBe(true) // "THEATERBAR"
    const joint = on('2026-12-14')[0]
    expect(joint.venue).toBe('FOYER_GROSSES_HAUS'); expect(joint.note).toBe('KONZERTHAUS')
  })
  it('reads role variants: "Gastro:,", "zu Tisch", and the conditional intermission label', () => {
    expect(names('2026-12-12', 'GROSSES_HAUS', 'gastro')).toEqual(['Dora Test', 'Pascal Nowarra'])
    const table = on('2026-12-02').find((b) => b.role === 'gastro' && b.note === 'zu Tisch')!
    expect(table.people.map((p) => p.name)).toEqual(['Dora Test'])
    const pause = on('2026-12-12').find((b) => b.role === 'break_gastro')!
    expect(pause.tags).toEqual(['if_intermission'])
  })
  it('never treats "ab …" inside parentheses as a new block', () => {
    expect(on('2026-12-22').map((b) => b.venue)).toEqual(['KLEINES_HAUS', 'THEATER_BAR'])
    expect(names('2026-12-22', 'THEATER_BAR')).toEqual(['Dora Test'])
  })
  it('keeps date headers glued to the previous text', () => {
    expect(names('2026-12-22', 'THEATER_BAR')).toEqual(['Dora Test'])
    expect(names('2026-12-23', 'GROSSES_HAUS', 'gastro')).toEqual(['Dora Test']) // before "Donnerstag 31.12:"
  })
  it('keeps notes, double-dash notes and a capital "Ab" sub-block', () => {
    const [clean, drying] = on('2027-01-01').filter((b) => b.venue === 'FOYER_GROSSES_HAUS')
    expect(clean.note).toBe('Aufräumaktion im Haus, bitte warm anziehen!')
    expect(clean.people.map((p) => p.name)).toEqual(['Anna Beispiel', 'Pascal Nowarra'])
    expect(drying.start).toBe('14:00'); expect(drying.note).toContain('Gläser trocknen')
    expect(drying.people.map((p) => p.name)).toEqual(['Carla Probe', 'Dora Test'])
  })
  it('moves a trailing remark into the note and drops the footer', () => {
    const pause = on('2026-12-31').find((b) => b.role === 'break_gastro')!
    expect(pause.note).toBe('Es bleiben alle bis zum Schluss!')
    expect(pause.people.map((p) => p.name)).toEqual(['Anna Beispiel', 'Dora Test'])
    expect(s.blocks.at(-1)!.people.map((p) => p.name)).toEqual(['Carla Probe'])
  })
})

describe('December roster: names and shifts', () => {
  it('indexes four-part names and merges spelling variants', () => {
    const idx = buildNameIndex(s)
    expect(idx.find((n) => n.name.toLowerCase() === 'zita von wallenberg pachaly')!.occurrences).toBe(2)
    expect(idx.filter((n) => /gina/i.test(n.name))).toHaveLength(1) // "Gina Denise" + "Gina-Denise" share one key
  })
  it('finds every occasion of a person, not just one', async () => {
    const { result } = await previewFor(DEC_SAMPLE, 'Pascal Nowarra')
    expect(result.shifts.map((x) => `${x.date} ${x.venue} ${x.role}`)).toEqual([
      '2026-12-02 GROSSES_HAUS gastro',
      '2026-12-04 GROSSES_HAUS floor',
      '2026-12-09 WINTERER_FOYER gastro',
      '2026-12-12 GROSSES_HAUS floor',
      '2026-12-12 GROSSES_HAUS gastro',
      '2026-12-23 GROSSES_HAUS floor',
      '2027-01-01 FOYER_GROSSES_HAUS floor'
    ])
  })
  it('lists a person once when the roster names them twice in the same block', async () => {
    const { result } = await previewFor(DEC_SAMPLE, 'Ben Muster')
    expect(result.shifts.filter((x) => x.date === '2026-12-12' && x.venue === 'GROSSES_HAUS' && x.role === 'floor')).toHaveLength(1)
  })
  it('folds the conditional intermission label into the house shift', async () => {
    const { result } = await previewFor(DEC_SAMPLE, 'Anna Beispiel')
    const house = result.shifts.find((x) => x.date === '2026-12-12' && x.venue === 'GROSSES_HAUS')!
    expect(house.tags).toEqual(expect.arrayContaining(['break_gastro', 'if_intermission']))
  })
})

describe('name index: particles vs. glued names', () => {
  it('does not mistake two glued names that contain "von" for one long name', () => {
    const text = 'Samstag, 03.10.: GROSSES HAUS ab 18.15 Uhr - Nina Mihulka Enno von Wickede, Nina Mihulka, Enno von Wickede, Zita Von Wallenberg Pachaly'
    const names = buildNameIndex(parseSchedule(text)).map((n) => `${n.name}(${n.occurrences})`)
    expect(names).toContain('Nina Mihulka(2)')
    expect(names).toContain('Enno von Wickede(2)')
    expect(names).toContain('Zita Von Wallenberg Pachaly(1)')
    expect(names.some((n) => n.startsWith('Nina Mihulka Enno'))).toBe(false)
  })
})
