import type { NameStat, PreviewResponse, RosterInfo } from '~~/server/domain/types'

/** The frontend holds no business logic: it sends requests and renders what the API returns. */
export function useShifts() {
  const name = useCookie<string>('shiftsync-name', { default: () => '', maxAge: 60 * 60 * 24 * 365 })
  const typoCheck = useCookie<boolean>('shiftsync-typocheck', { default: () => true, maxAge: 60 * 60 * 24 * 365 })

  const file = ref<File | null>(null)
  const roster = ref<RosterInfo | null>(null)
  const uploading = ref(false)
  const loading = ref(false)
  const errorCode = ref<string | null>(null)
  const result = ref<PreviewResponse | null>(null)
  /** Misspelled entries the user confirmed as their own. */
  const include = ref<string[]>([])

  const codeOf = (e: any) => e?.data?.data?.code ?? 'generic'

  async function upload(): Promise<boolean> {
    if (!file.value) return false
    errorCode.value = null
    uploading.value = true
    try {
      const body = new FormData()
      body.append('file', file.value)
      roster.value = await $fetch<RosterInfo>('/api/rosters', { method: 'POST', body })
      return true
    } catch (e) {
      roster.value = null
      errorCode.value = codeOf(e)
      return false
    } finally {
      uploading.value = false
    }
  }

  async function chooseFile(f: File | null) {
    file.value = f
    roster.value = null
    result.value = null
    include.value = []
    if (f) await upload()
  }

  async function run(retry = true): Promise<void> {
    if (!roster.value) { errorCode.value = 'file_missing'; return }
    errorCode.value = null
    loading.value = true
    try {
      result.value = await $fetch<PreviewResponse>('/api/shifts/preview', {
        method: 'POST',
        body: { rosterId: roster.value.id, name: name.value, typoCheck: typoCheck.value, include: include.value }
      })
    } catch (e) {
      const code = codeOf(e)
      // Server-side copy expired: silently re-upload the file we still hold and try once more.
      if (code === 'roster_expired' && retry && file.value && (await upload())) { loading.value = false; return run(false) }
      result.value = null
      errorCode.value = code
    } finally {
      loading.value = false
    }
  }

  async function submit() { include.value = []; await run() }

  async function toggleSpelling(spelling: string) {
    include.value = include.value.includes(spelling) ? include.value.filter((n) => n !== spelling) : [...include.value, spelling]
    await run()
  }

  async function suggest(q: string): Promise<NameStat[]> {
    if (!roster.value) return []
    try {
      return await $fetch<NameStat[]>(`/api/rosters/${roster.value.id}/names`, { query: { q } })
    } catch {
      return [] // suggestions are a convenience; never block typing
    }
  }

  async function loadExport(id: string) {
    try {
      const r = await $fetch<PreviewResponse>(`/api/exports/${encodeURIComponent(id)}`)
      result.value = r
      name.value = r.person
      include.value = r.similar.filter((s) => s.included).map((s) => s.name)
    } catch (e) {
      errorCode.value = codeOf(e)
    }
  }

  return { name, typoCheck, file, roster, uploading, loading, errorCode, result, include, chooseFile, submit, toggleSpelling, suggest, loadExport }
}
