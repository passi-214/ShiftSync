import { IcsExporter } from './icsExporter'
import type { CalendarExporter } from './types'

/** Add e.g. a CsvExporter / JsonExporter here and expose it via /api/exports/:id/:format. */
export const exporters: Record<string, CalendarExporter> = {
  ics: new IcsExporter()
}
