import type { ParsedSchedule } from '../../domain/types'

/** lower-case, no diacritics, ß->ss, hyphens as spaces, letters only. */
export function normaliseName(s: string): string[] {
  return s
    .normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/ß/g, 'ss')
    .replace(/[-–]/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/).filter(Boolean)
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

const lastNameSimilar = (a: string, b: string) =>
  a === b || (Math.min(a.length, b.length) >= 6 && levenshtein(a, b) <= 1) // Haberland / Haberlandt

function firstNameSimilar(a: string, b: string) {
  if (a === b) return true
  let p = 0
  while (p < a.length && p < b.length && a[p] === b[p]) p++
  return p >= 3 || levenshtein(a, b) <= 1 && Math.min(a.length, b.length) >= 5 // Lilli / Liliana
}

/**
 * True if `item` (a name as printed in the PDF) refers to `query`.
 * Tolerates typos, nickname variants, middle names and PDF items where a missing
 * comma glued two people together ("Constanze Graf Gina-Denise Huber").
 */
export function matchesPerson(item: string, query: string): boolean {
  const q = normaliseName(query)
  const t = normaliseName(item)
  if (q.length < 2 || t.length < 2) return false
  const last = q[q.length - 1]
  const first = q[0]
  for (let j = 0; j < t.length; j++) {
    if (!lastNameSimilar(t[j], last)) continue
    for (let i = Math.max(0, j - 3); i < j; i++) if (firstNameSimilar(t[i], first)) return true
  }
  return false
}

/** Distinct, clean-looking names; used as hints when nothing matched. */
export function listNames(schedule: ParsedSchedule): string[] {
  const seen = new Map<string, string>()
  for (const b of schedule.blocks)
    for (const p of b.people) {
      const tokens = normaliseName(p.name)
      if (tokens.length < 2 || tokens.length > 4 || /\bvom\b/i.test(p.name)) continue
      const key = tokens.join(' ')
      if (!seen.has(key)) seen.set(key, p.name)
    }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'de'))
}
