/** Minimal storage port. Core modules depend on this, never on Nitro directly. */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

/** In-memory implementation: used by tests and handy as a local fallback. */
export class MemoryStore implements KeyValueStore {
  private m = new Map<string, unknown>()
  async get<T>(k: string) { return (this.m.get(k) as T) ?? null }
  async set<T>(k: string, v: T) { this.m.set(k, v) }
  async remove(k: string) { this.m.delete(k) }
}
