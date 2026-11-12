import { getContainer } from '../../container'
import type { PreviewRequest, PreviewResponse } from '../../domain/types'
import { apiError, linksFor, rethrow } from '../../utils/http'

/** POST JSON { rosterId, name, typoCheck?, include? } -> preview. The roster comes from POST /api/rosters. */
export default defineEventHandler(async (event): Promise<PreviewResponse> => {
  const body = (await readBody<Partial<PreviewRequest>>(event)) ?? {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (typeof body.rosterId !== 'string' || !body.rosterId) apiError('file_missing')
  if (name.length < 3 || name.length > 80 || !name.includes(' ')) apiError('name_invalid')
  const include = Array.isArray(body.include) ? body.include.filter((n): n is string => typeof n === 'string').slice(0, 10) : []

  try {
    const view = await getContainer().shifts.preview(body.rosterId, name, { typoCheck: !!body.typoCheck, include })
    return { ...view, links: linksFor(view.id) }
  } catch (err) {
    rethrow(err)
  }
})
