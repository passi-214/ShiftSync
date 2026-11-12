import { randomUUID } from 'node:crypto'
import { InputError } from '../../domain/errors'
import type { NameStat, ParsedSchedule, RosterInfo, TypoSuspect } from '../../domain/types'
import type { KeyValueStore } from '../../infrastructure/keyValueStore'
import type { DocumentTextExtractor } from '../schedule/documentTextExtractor'
import { buildNameIndex, findTypoSuspects, suggestNames } from '../schedule/nameIndex'
import { parseSchedule } from '../schedule/scheduleParser'

export interface StoredRoster {
  schedule: ParsedSchedule
  index: NameStat[]
  typoSuspects: TypoSuspect[]
  expiresAt: number
}

/** Parses an uploaded roster once and keeps the result, so typing suggestions and previews don't re-read the file. */
export class RosterService {
  constructor(private deps: { extractor: DocumentTextExtractor; store: KeyValueStore; ttlMs: number }) {}

  async ingest(file: Uint8Array): Promise<RosterInfo> {
    const schedule = parseSchedule(await this.deps.extractor.extract(file))
    if (!schedule.blocks.length) throw new InputError('not_roster')

    const index = buildNameIndex(schedule)
    const typoSuspects = findTypoSuspects(index)
    const id = randomUUID()
    await this.deps.store.set<StoredRoster>(`roster:${id}`, { schedule, index, typoSuspects, expiresAt: Date.now() + this.deps.ttlMs })
    return { id, names: index.length, typoSuspects }
  }

  async load(id: string): Promise<StoredRoster | null> {
    const r = await this.deps.store.get<StoredRoster>(`roster:${id}`)
    if (!r) return null
    if (r.expiresAt < Date.now()) { await this.deps.store.remove(`roster:${id}`); return null }
    return r
  }

  async suggest(id: string, query: string): Promise<NameStat[] | null> {
    const r = await this.load(id)
    return r && suggestNames(r.index, query)
  }
}
