import type { KeyValueStore } from './keyValueStore'

/** Adapter over Nitro's unstorage mount (fs by default, Redis/KV via nuxt.config). */
export function nitroStore(mount: string): KeyValueStore {
  const storage = useStorage(mount)
  return {
    async get<T>(key: string) { return ((await storage.getItem(key)) as T) ?? null },
    async set<T>(key: string, value: T) { await storage.setItem(key, value as any) },
    async remove(key: string) { await storage.removeItem(key) }
  }
}
