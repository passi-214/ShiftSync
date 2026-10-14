import { getContainer } from '../../container'
import type { PreviewResponse } from '../../domain/types'
import { InputError } from '../../modules/shifts/shiftService'
import { apiError, linksFor } from '../../utils/http'

/** POST multipart/form-data: `pdf` (file) + `name` (text) -> preview JSON. */
export default defineEventHandler(async (event): Promise<PreviewResponse> => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'pdf')
  const name = parts?.find((p) => p.name === 'name')?.data.toString('utf8').trim()
  const { maxUploadBytes } = useRuntimeConfig()

  if (!file?.data?.length) apiError(400, 'pdf_missing')
  if (file.data.length > Number(maxUploadBytes)) apiError(413, 'pdf_too_large')
  if (file.data.subarray(0, 5).toString('latin1') !== '%PDF-') apiError(415, 'not_pdf')
  if (!name || name.length < 3 || name.length > 80 || !name.includes(' ')) apiError(400, 'name_invalid')

  try {
    const view = await getContainer().shifts.preview(new Uint8Array(file.data), name)
    return { ...view, links: linksFor(view.id) }
  } catch (err) {
    if (err instanceof InputError) apiError(422, err.code)
    console.error('[preview]', err)
    apiError(500, 'read_failed')
  }
})
