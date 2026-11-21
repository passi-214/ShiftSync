import { randomUUID } from 'node:crypto'
import { toMinutes } from '../../domain/time'
import { InputError } from '../../domain/errors'
import type { PreviewResponse, ScheduleBlock, Shift, ShiftTag, SimilarName } from '../../domain/types'
import { VENUES } from '../../domain/venues'
import type { KeyValueStore } from '../../infrastructure/keyValueStore'
import { EndTimeEstimator, type ShiftDraft } from '../estimation/endTimeEstimator'
import type { RosterService } from '../roster/rosterService'
import { findSimilar } from '../schedule/nameIndex'
import { matchesPerson } from '../schedule/personMatcher'

export interface StoredResult { person: string; shifts: Shift[]; similar: SimilarName[]; expiresAt: number }
export type ShiftsView = Omit<PreviewResponse, 'links'>

export interface PreviewOptions { typoCheck?: boolean; include?: string[] }

interface Entry { draft: ShiftDraft; notes: string[]; tags: ShiftTag[]; listedAs: string | null }

export class ShiftService {
  constructor(
    private deps: {
      roster: RosterService
      estimator: EndTimeEstimator
      results: KeyValueStore
      sessionTtlMs: number
    }
  ) {}

  async preview(rosterId: string, personQuery: string, opts: PreviewOptions = {}): Promise<ShiftsView> {
    const roster = await this.deps.roster.load(rosterId)
    if (!roster) throw new InputError('roster_expired')

    // Only spellings that really occur in the roster can be included.
    const known = new Set(roster.index.map((n) => n.name))
    const include = (opts.include ?? []).filter((n) => known.has(n))

    const shifts = this.collect(roster.schedule.blocks, personQuery, include).map(({ draft, notes, tags, listedAs }): Shift => {
      const est = this.deps.estimator.estimate(draft)
      return {
        id: `${draft.date}-${draft.venue}-${draft.role}-${est.start.replace(':', '')}`,
        date: draft.date, ...est,
        venue: draft.venue, venueLabel: VENUES[draft.venue].label,
        role: draft.role, notes, tags, listedAs
      }
    }).sort((a, b) => a.date.localeCompare(b.date) || toMinutes(a.start) - toMinutes(b.start))

    // Similar spellings: when the typo check is on, and as a "did you mean" when nothing was found.
    const found = findSimilar(roster.index, personQuery)
    const confirmed = roster.index.filter((n) => include.includes(n.name) && !found.some((f) => f.name === n.name))
    const similar: SimilarName[] = opts.typoCheck || !shifts.length
      ? [...found, ...confirmed].map((n) => ({ ...n, included: include.includes(n.name) }))
      : []

    const id = randomUUID()
    const stored: StoredResult = { person: personQuery, shifts, similar, expiresAt: Date.now() + this.deps.sessionTtlMs }
    await this.deps.results.set(`result:${id}`, stored)
    return this.view(id, stored)
  }

  async load(id: string): Promise<StoredResult | null> {
    const r = await this.deps.results.get<StoredResult>(`result:${id}`)
    if (!r) return null
    if (r.expiresAt < Date.now()) { await this.deps.results.remove(`result:${id}`); return null }
    return r
  }

  view(id: string, r: StoredResult): ShiftsView {
    return {
      id, person: r.person, shifts: r.shifts, similar: r.similar,
      period: r.shifts.length ? { from: r.shifts[0].date, to: r.shifts.at(-1)!.date } : null
    }
  }

  private collect(blocks: ScheduleBlock[], person: string, include: string[]): Entry[] {
    const out: Entry[] = []
    // Intermission gastro last, so it can be folded into the person's house shift.
    const ordered = [...blocks.filter((b) => b.role !== 'break_gastro'), ...blocks.filter((b) => b.role === 'break_gastro')]

    for (const b of ordered) {
      for (const p of b.people) {
        const exact = matchesPerson(p.name, person)
        const viaSpelling = exact ? undefined : include.find((n) => matchesPerson(p.name, n))
        if (!exact && !viaSpelling) continue
        const listedAs = viaSpelling ?? null
        const start = p.start ?? b.start
        if (!start) continue
        const notes = [b.note, p.note].filter((n): n is string => !!n)

        // Intermission gastro starts with the house staff: same shift, flagged instead of duplicated.
        if (b.role === 'break_gastro') {
          const house = out.find((o) => o.draft.date === b.date && o.draft.venue === b.venue && o.draft.role === 'floor')
          if (house) {
            for (const t of ['break_gastro', ...b.tags] as ShiftTag[]) if (!house.tags.includes(t)) house.tags.push(t)
            continue
          }
        }

        // Same person twice in the same block/role (a roster typo) => one shift. For house shifts, a briefing +
        // performance call (≤ 90 min apart) also becomes one shift from the earliest call; blocks further apart
        // (two Weltraum shows hours apart) stay separate shifts.
        const window = b.role === 'floor' ? 90 : 0
        const near = out.find((o) =>
          o.draft.date === b.date && o.draft.venue === b.venue && o.draft.role === b.role &&
          Math.abs(toMinutes(o.draft.start) - toMinutes(start)) <= window)
        if (near) {
          if (toMinutes(start) < toMinutes(near.draft.start)) near.draft.start = start
          if (toMinutes(start) > toMinutes(near.draft.durationFrom)) near.draft.durationFrom = start
          near.draft.explicitEnd ??= p.end ?? b.end
          for (const n of notes) if (!near.notes.includes(n)) near.notes.push(n)
          near.listedAs ??= listedAs
          continue
        }

        out.push({
          draft: { date: b.date, venue: b.venue, role: b.role, start, durationFrom: start, explicitEnd: p.end ?? b.end },
          notes, tags: [...b.tags], listedAs
        })
      }
    }
    return out
  }
}
