import { describe, expect, it } from 'vitest'
import { matchesPerson } from '../server/modules/schedule/personMatcher'
import { parseSchedule } from '../server/modules/schedule/scheduleParser'
import { SAMPLE } from './fixtures'

const s = parseSchedule(SAMPLE)
const blocksOn = (d: string) => s.blocks.filter((b) => b.date === d)

describe('parser', () => {
  it('reads the year from the header and dates from the day markers', () => {
    expect(s.year).toBe(2026)
    expect(new Set(s.blocks.map((b) => b.date))).toContain('2026-09-26')
  })
  it('handles explicit end, personal overrides and glued days', () => {
    const foyer = blocksOn('2026-09-26').find((b) => b.venue === 'FOYER_GROSSES_HAUS')!
    expect(foyer.start).toBe('14:00'); expect(foyer.end).toBe('23:30')
    expect(foyer.people.find((p) => p.name === 'Elke Rakus')!.end).toBe('18:30')
    expect(foyer.people.find((p) => p.name === 'Constanze Graf')!.start).toBe('19:30')
    expect(blocksOn('2026-09-27').length).toBeGreaterThan(0) // "KirnerSonntag"
  })
  it('keeps continuation blocks on the previous venue and parses roles', () => {
    const d = blocksOn('2026-10-03')
    expect(d.filter((b) => b.venue === 'GROSSES_HAUS' && b.role === 'floor').map((b) => b.start)).toEqual(['17:15', '18:15'])
    expect(d.some((b) => b.role === 'after_show_supervision')).toBe(true)
  })
  it('does not leak the footer into the last person', () => {
    const last = s.blocks.at(-1)!
    expect(last.people.at(-1)!.name).toBe('Marietta Schantz')
  })
})

describe('matcher', () => {
  it('tolerates variants and glued names', () => {
    expect(matchesPerson('Gina-Denise Huber', 'Gina Huber')).toBe(true)
    expect(matchesPerson('Franka Haberland', 'Franka Haberlandt')).toBe(true)
    expect(matchesPerson('Liliana Deimann', 'Lilli Deimann')).toBe(true)
    expect(matchesPerson('Constanze Graf Gina-Denise Huber', 'Gina-Denise Huber')).toBe(true)
    expect(matchesPerson('janette bauerle', 'Janette Bäuerle')).toBe(true)
  })
  it('does not confuse different people', () => {
    expect(matchesPerson('Lukas Huber', 'Dieter Huber')).toBe(false)
    expect(matchesPerson('Sophie Unseld', 'Sophie Hunold')).toBe(false)
    expect(matchesPerson('Constanze Graf Gina-Denise Huber', 'Constanze Huber')).toBe(false)
  })
})
