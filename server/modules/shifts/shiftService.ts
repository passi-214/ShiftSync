import { randomUUID } from 'node:crypto'
import { toMinutes } from '../../domain/time'
import type { PreviewResponse, ScheduleBlock, Shift, ShiftTag } from '../../domain/types'
import { VENUES } from '../../domain/venues'
import type { KeyValueStore } from '../../infrastructure/keyValueStore'
import { EndTimeEstimator, type ShiftDraft } from '../estimation/endTimeEstimator'
import type { PdfTextExtractor } from '../schedule/pdfTextExtractor'
import { listNames, matchesPerson } from '../schedule/personMatcher'
import { parseSchedule } from '../schedule/scheduleParser'

export interface StoredResult { person: string; shifts: Shift[]; availableNames: string[]; expiresAt: number }
export type ShiftsView = Omit<PreviewResponse, 'links'>

/** Carries a code the API layer maps to an HTTP status and the UI to a translated message. */
export class InputError extends Error {
  constructor(public code: 'not_roster') { super(code) }
}

interface Entry { draft: ShiftDraft; notes: string[]; tags: ShiftTag[] }

export class ShiftService {
  constructor(
    private deps: {
      extractor: PdfTextExtractor
      estimator: EndTimeEstimator
      results: KeyValueStore
      sessionTtlMs: number
    }
  ) {}

  async preview(pdf: Uint8Array, personQuery: string): Promise<ShiftsView> {
    const schedule = parseSchedule(await this.deps.extractor.extract(pdf))
    if (!schedule.blocks.length) throw new InputError('not_roster')

    const shifts = this.collect(schedule.blocks, personQuery).map(({ draft, notes, tags }): Shift => {
      const est = this.deps.estimator.estimate(draft)
      return {
        id: `${draft.date}-${draft.venue}-${draft.role}-${est.start.replace(':', '')}`,
        date: draft.date, ...est,
        venue: draft.venue, venueLabel: VENUES[draft.venue].label,
        role: draft.role, notes, tags
      }
    }).sort((a, b) => a.date.localeCompare(b.date) || toMinutes(a.start) - toMinutes(b.start))

    const id = randomUUID()
    const stored: StoredResult = {
      person: personQuery, shifts,
      availableNames: shifts.length ? [] : listNames(schedule),
      expiresAt: Date.now() + this.deps.sessionTtlMs
    }
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
      id, person: r.person, shifts: r.shifts, availableNames: r.availableNames,
      period: r.shifts.length ? { from: r.shifts[0].date, to: r.shifts.at(-1)!.date } : null
    }
  }

  private collect(blocks: ScheduleBlock[], person: string): Entry[] {
    const out: Entry[] = []
    // Intermission gastro last, so it can be folded into the person's house shift.
    const ordered = [...blocks.filter((b) => b.role !== 'break_gastro'), ...blocks.filter((b) => b.role === 'break_gastro')]

    for (const b of ordered) {
      for (const p of b.people.filter((x) => matchesPerson(x.name, person))) {
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

        // Briefing + performance call in the same house block (within 90 min) => one shift from the earliest
        // call. Blocks further apart (two Weltraum shows hours apart) stay separate shifts.
        const near = b.role === 'floor' && out.find((o) =>
          o.draft.date === b.date && o.draft.venue === b.venue && o.draft.role === 'floor' &&
          Math.abs(toMinutes(o.draft.start) - toMinutes(start)) <= 90)
        if (near) {
          if (toMinutes(start) < toMinutes(near.draft.start)) near.draft.start = start
          if (toMinutes(start) > toMinutes(near.draft.durationFrom)) near.draft.durationFrom = start
          near.draft.explicitEnd ??= p.end ?? b.end
          for (const n of notes) if (!near.notes.includes(n)) near.notes.push(n)
          continue
        }

        out.push({
          draft: { date: b.date, venue: b.venue, role: b.role, start, durationFrom: start, explicitEnd: p.end ?? b.end },
          notes, tags: [...b.tags]
        })
      }
    }
    return out
  }
}
