import { getContainer } from '../../container'
import type { RosterInfo } from '../../domain/types'
import { apiError, rethrow } from '../../utils/http'

/** POST multipart/form-data: `file` (PDF or .docx) -> parsed once, kept server-side, returns its id + name stats. */
export default defineEventHandler(async (event): Promise<RosterInfo> => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file')
  const { maxUploadBytes } = useRuntimeConfig()

  if (!file?.data?.length) apiError('file_missing')
  if (file.data.length > Number(maxUploadBytes)) apiError('file_too_large')

  try {
    return await getContainer().roster.ingest(new Uint8Array(file.data))
  } catch (err) {
    rethrow(err)
  }
})
