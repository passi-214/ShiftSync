import { getContainer } from '../../../container'
import { exporters } from '../../../modules/calendar'
import { apiError, localeFrom } from '../../../utils/http'

/**
 * ?lang=de|en      language of titles/descriptions
 * ?inline=1        serve without "attachment", so iOS/macOS offer to add the events straight to Calendar
 */
export default defineEventHandler(async (event) => {
  const c = getContainer()
  const result = await c.shifts.load(getRouterParam(event, 'id')!)
  if (!result) apiError(404, 'export_expired')

  const file = exporters.ics.export(result.shifts, c.exportContext(result.person, localeFrom(event)))
  const inline = getQuery(event).inline === '1'
  setHeader(event, 'content-type', file.contentType)
  setHeader(event, 'content-disposition', `${inline ? 'inline' : 'attachment'}; filename="${file.filename}"`)
  setHeader(event, 'cache-control', 'no-store')
  return file.body
})
