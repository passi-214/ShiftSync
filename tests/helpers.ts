import { MemoryStore } from '../server/infrastructure/keyValueStore'
import { EndTimeEstimator } from '../server/modules/estimation/endTimeEstimator'
import { RosterService } from '../server/modules/roster/rosterService'
import { ShiftService } from '../server/modules/shifts/shiftService'
import type { DocumentTextExtractor } from '../server/modules/schedule/documentTextExtractor'

/** Wires the services around a fake extractor that returns `text` for any upload. */
export function makeServices(text: string, extractor?: DocumentTextExtractor) {
  const roster = new RosterService({ extractor: extractor ?? { extract: async () => text }, store: new MemoryStore(), ttlMs: 1e6 })
  const shifts = new ShiftService({
    roster, results: new MemoryStore(), sessionTtlMs: 1e6,
    estimator: new EndTimeEstimator({ receptionDurationMin: 90, afterShowDurationMin: 90 })
  })
  return { roster, shifts }
}

/** Upload + preview in one go. */
export async function previewFor(text: string, name: string, opts: { typoCheck?: boolean; include?: string[] } = {}) {
  const { roster, shifts } = makeServices(text)
  const info = await roster.ingest(new Uint8Array())
  return { info, result: await shifts.preview(info.id, name, opts), roster, shifts }
}
