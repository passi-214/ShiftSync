import { getContainer } from '../../../container'
import type { PreviewResponse } from '../../../domain/types'
import { apiError, linksFor } from '../../../utils/http'

/** Re-open an earlier result (used after the Google redirect, and for bookmarks within the TTL). */
export default defineEventHandler(async (event): Promise<PreviewResponse> => {
  const id = getRouterParam(event, 'id')!
  const shifts = getContainer().shifts
  const stored = await shifts.load(id)
  if (!stored) apiError(404, 'export_expired')
  return { ...shifts.view(id, stored), links: linksFor(id) }
})
