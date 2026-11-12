import type { NameStat, ParsedSchedule, TypoSuspect } from '../../domain/types'
import { matchesPerson, normaliseName, osaDistance } from './personMatcher'

/** All people in a roster with how often each is listed; the basis for suggestions and typo detection. */

const key = (name: string) => normaliseName(name).join(' ')
const wsTokens = (name: string) => name.split(/\s+/).filter(Boolean)

/**
 * Names the PDF/Word export glued together because a comma was lost
 * ("Constanze Graf Gina-Denise Huber") are split using the clean names seen elsewhere.
 * Unresolvable ones are dropped from the index; the matcher still finds people inside them.
 */
function segment(tokens: string[], clean: Map<string, string>): string[] | null {
  const memo = new Map<number, string[] | null>()
  const go = (i: number): string[] | null => {
    if (i === tokens.length) return []
    if (memo.has(i)) return memo.get(i)!
    let result: string[] | null = null
    for (const len of [3, 2]) {
      const raw = tokens.slice(i, i + len).join(' ')
      const known = i + len <= tokens.length ? clean.get(key(raw)) : undefined
      if (!known) continue
      const rest = go(i + len)
      if (rest) { result = [known, ...rest]; break }
    }
    memo.set(i, result)
    return result
  }
  return go(0)
}

export function buildNameIndex(schedule: ParsedSchedule): NameStat[] {
  const raw = schedule.blocks.flatMap((b) => b.people.map((p) => p.name))
  const looksClean = (n: string) => { const t = wsTokens(n).length; return t >= 2 && t <= 3 }
  const clean = new Map<string, string>()
  for (const n of raw) if (looksClean(n) && !clean.has(key(n))) clean.set(key(n), n)

  const counts = new Map<string, { names: Map<string, number>; n: number }>()
  const add = (name: string) => {
    const k = key(name)
    const e = counts.get(k) ?? { names: new Map(), n: 0 }
    e.n++; e.names.set(name, (e.names.get(name) ?? 0) + 1)
    counts.set(k, e)
  }
  for (const n of raw) {
    if (/\bvom\b/i.test(n) || wsTokens(n).length < 2) continue // "fünf vom GH" placeholders
    if (looksClean(n)) add(n)
    else segment(wsTokens(n), clean)?.forEach(add)
  }
  return [...counts.values()]
    .map(({ names, n }) => ({ name: [...names.entries()].sort((a, b) => b[1] - a[1])[0][0], occurrences: n }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/** Prefix/typo-tolerant suggestions while typing. Every typed word must match a different word of the name. */
export function suggestNames(index: NameStat[], query: string, limit = 8): NameStat[] {
  const q = normaliseName(query)
  if (!q.length) return index.slice(0, limit)

  const scored: Array<{ stat: NameStat; score: number }> = []
  for (const stat of index) {
    const tokens = normaliseName(stat.name)
    const used = new Set<number>()
    let score = 0
    let ok = true
    for (const qt of q) {
      let best = Infinity, bestIdx = -1
      tokens.forEach((t, i) => {
        if (used.has(i)) return
        const prefix = t.slice(0, qt.length)
        const s = t === qt ? 0 : prefix === qt ? 1 : qt.length >= 4 && osaDistance(prefix, qt) <= 1 ? 2 : Infinity
        if (s < best) { best = s; bestIdx = i }
      })
      if (bestIdx < 0) { ok = false; break }
      used.add(bestIdx); score += best
    }
    if (ok) scored.push({ stat, score })
  }
  return scored
    .sort((a, b) => a.score - b.score || b.stat.occurrences - a.stat.occurrences || a.stat.name.localeCompare(b.stat.name, 'de'))
    .slice(0, limit).map((x) => x.stat)
}

const tolerance = (a: string, b: string) => { const m = Math.min(a.length, b.length); return m < 4 ? 0 : m < 8 ? 1 : 2 }

/**
 * Lenient "could be the same person, misspelled": first and last name within a small edit distance
 * (a swapped letter pair counts as one edit), and at least one of them exactly equal.
 */
export function looksLikeSameName(a: string, b: string): boolean {
  const ta = normaliseName(a), tb = normaliseName(b)
  if (ta.length < 2 || tb.length < 2) return false
  const df = osaDistance(ta[0], tb[0]), dl = osaDistance(ta.at(-1)!, tb.at(-1)!)
  if (df > tolerance(ta[0], tb[0]) || dl > tolerance(ta.at(-1)!, tb.at(-1)!)) return false
  return df + dl <= 2 && Math.min(df, dl) === 0
}

/** Spellings in the roster that resemble `query` but are not already matched by the normal matcher. */
export function findSimilar(index: NameStat[], query: string): NameStat[] {
  if (normaliseName(query).length < 2) return []
  return index.filter((s) => key(s.name) !== key(query) && !matchesPerson(s.name, query) && looksLikeSameName(s.name, query))
    .sort((a, b) => b.occurrences - a.occurrences)
}

/** Rare spellings that look like a typo of a clearly more common one. */
export function findTypoSuspects(index: NameStat[]): TypoSuspect[] {
  const out: TypoSuspect[] = []
  for (const rare of index) {
    const better = index
      .filter((o) => o !== rare && o.occurrences > rare.occurrences && (looksLikeSameName(o.name, rare.name) || (matchesPerson(o.name, rare.name) && matchesPerson(rare.name, o.name))))
      .sort((a, b) => b.occurrences - a.occurrences)[0]
    if (better) out.push({ name: rare.name, occurrences: rare.occurrences, probablyMeans: better.name, probablyMeansOccurrences: better.occurrences })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'de'))
}
