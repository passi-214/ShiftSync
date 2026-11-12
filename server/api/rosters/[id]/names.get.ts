import { getContainer } from '../../../container'
import type { NameStat } from '../../../domain/types'
import { apiError } from '../../../utils/http'

/** GET ?q=pas -> ranked name suggestions (prefix and typo tolerant) from the roster. */
export default defineEventHandler(async (event): Promise<NameStat[]> => {
  const q = String(getQuery(event).q ?? '').slice(0, 80)
  const names = await getContainer().roster.suggest(getRouterParam(event, 'id')!, q)
  if (!names) apiError('roster_expired')
  return names
})
