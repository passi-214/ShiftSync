import { describe, expect, it } from 'vitest'
import { buildNameIndex, findSimilar, findTypoSuspects, looksLikeSameName, suggestNames } from '../server/modules/schedule/nameIndex'
import { osaDistance } from '../server/modules/schedule/personMatcher'
import { parseSchedule } from '../server/modules/schedule/scheduleParser'
import { TYPO_SAMPLE } from './fixtures'
import { previewFor } from './helpers'

const index = buildNameIndex(parseSchedule(TYPO_SAMPLE))
const names = (xs: { name: string }[]) => xs.map((x) => x.name)

describe('name index', () => {
  it('counts people and splits names glued by a lost comma', () => {
    expect(index.find((n) => n.name === 'Constanze Graf')!.occurrences).toBe(3)
    expect(index.find((n) => n.name === 'Gina-Denise Huber')!.occurrences).toBe(3)
    expect(names(index).every((n) => !n.includes('Graf Gina'))).toBe(true)
  })
})

describe('suggestions while typing', () => {
  it('matches prefixes of first or last name', () => {
    expect(names(suggestNames(index, 'pas'))[0]).toBe('Pascal Nowarra')
    expect(names(suggestNames(index, 'now'))).toContain('Pascal Nowarra')
    expect(names(suggestNames(index, 'pascal no'))[0]).toBe('Pascal Nowarra') // exact match ranks above the fuzzy 'Pacsal'
  })
  it('tolerates a typo while typing and ignores case/diacritics', () => {
    expect(names(suggestNames(index, 'pacs'))).toContain('Pascal Nowarra')
    expect(names(suggestNames(index, 'GINA'))).toContain('Gina-Denise Huber')
  })
  it('returns a limited list for an empty query and nothing for nonsense', () => {
    expect(suggestNames(index, '', 3)).toHaveLength(3)
    expect(suggestNames(index, 'zzzz')).toEqual([])
  })
})

describe('typo detection', () => {
  it('counts a swapped letter pair as one edit', () => {
    expect(osaDistance('pascal', 'pacsal')).toBe(1)
  })
  it('recognises misspellings but not different people', () => {
    expect(looksLikeSameName('Pacsal Nowarra', 'Pascal Nowarra')).toBe(true)
    expect(looksLikeSameName('Franka Haberland', 'Franka Haberlandt')).toBe(true)
    expect(looksLikeSameName('Samira Nowarra', 'Pascal Nowarra')).toBe(false)
    expect(looksLikeSameName('Lukas Huber', 'Dieter Huber')).toBe(false)
    expect(looksLikeSameName('Sophie Unseld', 'Sophie Hunold')).toBe(false)
  })
  it('flags rare spellings next to a more common one', () => {
    const s = findTypoSuspects(index)
    expect(s).toContainEqual({ name: 'Pacsal Nowarra', occurrences: 1, probablyMeans: 'Pascal Nowarra', probablyMeansOccurrences: 3 })
    expect(s.find((x) => x.name === 'Gina Huber')?.probablyMeans).toBe('Gina-Denise Huber')
    expect(s.find((x) => x.name === 'Pascal Nowarra')).toBeUndefined()
  })
  it('finds similar spellings for a searched name', () => {
    expect(names(findSimilar(index, 'Pascal Nowarra'))).toEqual(['Pacsal Nowarra'])
    expect(names(findSimilar(index, 'Pacsal Nowarra'))).toEqual(['Pascal Nowarra'])
  })
})

describe('preview with typo check', () => {
  it('finds nothing extra by default, then adds the confirmed misspelled entries', async () => {
    const plain = (await previewFor(TYPO_SAMPLE, 'Pascal Nowarra')).result
    expect(plain.shifts.map((s) => s.date)).toEqual(['2026-10-04', '2026-10-05', '2026-10-08'])
    expect(plain.similar).toEqual([]) // typo check off

    const checked = (await previewFor(TYPO_SAMPLE, 'Pascal Nowarra', { typoCheck: true })).result
    expect(checked.similar).toEqual([{ name: 'Pacsal Nowarra', occurrences: 1, included: false }])
    expect(checked.shifts).toHaveLength(3) // suggested only, not added yet

    const withTypo = (await previewFor(TYPO_SAMPLE, 'Pascal Nowarra', { typoCheck: true, include: ['Pacsal Nowarra'] })).result
    expect(withTypo.shifts.map((s) => s.date)).toEqual(['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-08'])
    expect(withTypo.shifts.find((s) => s.date === '2026-10-06')!.listedAs).toBe('Pacsal Nowarra')
    expect(withTypo.shifts.find((s) => s.date === '2026-10-04')!.listedAs).toBeNull()
    expect(withTypo.similar[0].included).toBe(true)
  })
  it('ignores spellings that do not occur in the roster', async () => {
    const r = (await previewFor(TYPO_SAMPLE, 'Pascal Nowarra', { include: ['Evil Person'] })).result
    expect(r.shifts).toHaveLength(3)
  })
  it('suggests the correct name when the user mistyped their own', async () => {
    const r = (await previewFor(TYPO_SAMPLE, 'Pacsal Nowarra', { typoCheck: true })).result
    expect(r.shifts.map((s) => s.date)).toEqual(['2026-10-06']) // exactly what was typed
    expect(r.similar.map((s) => s.name)).toEqual(['Pascal Nowarra']) // "did you mean"
  })
})

describe('suggestions stay precise on short input', () => {
  it('does not fuzzy-match three typed letters', () => {
    const idx = [{ name: 'Janette Bäuerle', occurrences: 4 }, { name: 'Hannah Bucher', occurrences: 3 }]
    expect(names(suggestNames(idx, 'jan'))).toEqual(['Janette Bäuerle'])
  })
})
