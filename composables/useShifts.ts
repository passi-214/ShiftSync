import type { PreviewResponse } from '~~/server/domain/types'

/** The frontend holds no business logic: it sends the form and renders what the API returns. */
export function useShifts() {
  const name = useCookie<string>('shiftsync-name', { default: () => '', maxAge: 60 * 60 * 24 * 365 })
  const file = ref<File | null>(null)
  const loading = ref(false)
  const errorCode = ref<string | null>(null)
  const result = ref<PreviewResponse | null>(null)

  const codeOf = (e: any) => e?.data?.data?.code ?? 'generic'

  async function submit() {
    if (!file.value) { errorCode.value = 'pdf_missing'; return }
    errorCode.value = null
    loading.value = true
    try {
      const body = new FormData()
      body.append('pdf', file.value)
      body.append('name', name.value)
      result.value = await $fetch<PreviewResponse>('/api/shifts/preview', { method: 'POST', body })
    } catch (e) {
      result.value = null
      errorCode.value = codeOf(e)
    } finally {
      loading.value = false
    }
  }

  async function loadExport(id: string) {
    try {
      result.value = await $fetch<PreviewResponse>(`/api/exports/${encodeURIComponent(id)}`)
      name.value = result.value.person
    } catch (e) {
      errorCode.value = codeOf(e)
    }
  }

  return { name, file, loading, errorCode, result, submit, loadExport }
}
