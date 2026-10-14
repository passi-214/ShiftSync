import { nitroStore } from './infrastructure/nitroStore'
import { EndTimeEstimator } from './modules/estimation/endTimeEstimator'
import type { ExportContext } from './modules/calendar/types'
import { UnpdfExtractor } from './modules/schedule/pdfTextExtractor'
import { ShiftService } from './modules/shifts/shiftService'
import { translate, type Locale } from '../locales'

/** Composition root: the only place that knows which implementation is wired to which port. */
let instance: ReturnType<typeof build> | undefined

function build() {
  const cfg = useRuntimeConfig()
  const shifts = new ShiftService({
    extractor: new UnpdfExtractor(),
    estimator: new EndTimeEstimator({
      receptionDurationMin: Number(cfg.estimation.receptionDurationMin),
      afterShowDurationMin: Number(cfg.estimation.afterShowDurationMin)
    }),
    results: nitroStore('sessions'),
    sessionTtlMs: Number(cfg.sessionTtlHours) * 3_600_000
  })
  return {
    shifts,
    google: {
      enabled: !!(cfg.google.clientId && cfg.google.clientSecret),
      clientId: String(cfg.google.clientId),
      clientSecret: String(cfg.google.clientSecret),
      redirectUri: String(cfg.google.redirectUri)
    },
    exportContext: (person: string, locale: Locale): ExportContext => ({
      person, locale,
      calendarName: translate(locale, 'export.calendarName'),
      address: cfg.calendar.address,
      timezone: cfg.calendar.timezone
    })
  }
}

export const getContainer = () => (instance ??= build())
