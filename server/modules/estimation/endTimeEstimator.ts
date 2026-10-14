import { fromMinutes, toMinutes } from '../../domain/time'
import type { RoleId, VenueId } from '../../domain/types'
import { VENUES } from '../../domain/venues'

export interface EstimatorConfig {
  receptionDurationMin: number
  afterShowDurationMin: number
}

export interface ShiftDraft {
  date: string
  venue: VenueId
  role: RoleId
  start: string
  /** Time the typical duration counts from (the performance call, if an earlier briefing was merged in). */
  durationFrom: string
  /** "bis HH.MM Uhr" printed in the roster; always wins. */
  explicitEnd: string | null
}

export interface Estimate {
  start: string
  end: string
  startIsEstimate: boolean
  endIsEstimate: boolean
}

type Strategy = (d: ShiftDraft, cfg: EstimatorConfig) => Estimate

const typicalEnd = (d: ShiftDraft) => toMinutes(d.durationFrom) + VENUES[d.venue].typicalDurationMin

/** Same start as everybody else at the venue; ends after the typical length. */
const standard: Strategy = (d) => ({
  start: d.start,
  end: d.explicitEnd ?? fromMinutes(typicalEnd(d)),
  startIsEstimate: false,
  endIsEstimate: !d.explicitEnd
})

const reception: Strategy = (d, cfg) => ({
  start: d.start,
  end: d.explicitEnd ?? fromMinutes(toMinutes(d.start) + cfg.receptionDurationMin),
  startIsEstimate: false,
  endIsEstimate: !d.explicitEnd
})

/** After-show work starts when the performance is typically over. */
const afterShow: Strategy = (d, cfg) => {
  const start = d.explicitEnd ? toMinutes(d.explicitEnd) : typicalEnd(d)
  return { start: fromMinutes(start), end: fromMinutes(start + cfg.afterShowDurationMin), startIsEstimate: true, endIsEstimate: true }
}

/**
 * Registry: add or change a role-specific rule here, nothing else needs to change.
 * Intermission gastro deliberately uses the standard rule (same call time as the house staff).
 */
export const STRATEGIES: Record<RoleId, Strategy> = {
  floor: standard,
  gastro: standard,
  break_gastro: standard,
  reception,
  after_show_gastro: afterShow,
  after_show_supervision: afterShow
}

export class EndTimeEstimator {
  constructor(private cfg: EstimatorConfig, private strategies: Record<RoleId, Strategy> = STRATEGIES) {}
  estimate(draft: ShiftDraft): Estimate {
    return this.strategies[draft.role](draft, this.cfg)
  }
}
