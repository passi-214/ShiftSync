import type { RoleId, VenueId } from './types'

export interface VenueDef {
  id: VenueId
  label: string
  /** How the venue is written in the roster (upper-case). Several spellings may exist. */
  pdfLabels: string[]
  /** Typical shift length from the call time (performances usually run a bit longer). */
  typicalDurationMin: number
}

export const VENUES: Record<VenueId, VenueDef> = {
  GROSSES_HAUS: { id: 'GROSSES_HAUS', label: 'Großes Haus', pdfLabels: ['GROSSES HAUS'], typicalDurationMin: 270 },
  KLEINES_HAUS: { id: 'KLEINES_HAUS', label: 'Kleines Haus', pdfLabels: ['KLEINES HAUS'], typicalDurationMin: 240 },
  WELTRAUM: { id: 'WELTRAUM', label: 'Weltraum', pdfLabels: ['WELTRAUM'], typicalDurationMin: 120 },
  FOYER_GROSSES_HAUS: { id: 'FOYER_GROSSES_HAUS', label: 'Foyer Großes Haus', pdfLabels: ['FOYER GROSSES HAUS'], typicalDurationMin: 300 },
  STEIN_FOYER: { id: 'STEIN_FOYER', label: 'Stein-Foyer', pdfLabels: ['STEIN-FOYER', 'STEIN FOYER'], typicalDurationMin: 240 },
  WINTERER_FOYER: { id: 'WINTERER_FOYER', label: 'Winterer-Foyer', pdfLabels: ['WINTERER-FOYER', 'WINTERER FOYER'], typicalDurationMin: 240 },
  THEATER_BAR: { id: 'THEATER_BAR', label: 'Theater-Bar', pdfLabels: ['THEATER-BAR', 'THEATERBAR', 'THEATER BAR'], typicalDurationMin: 180 },
  KANTINE: { id: 'KANTINE', label: 'Kantine', pdfLabels: ['KANTINE'], typicalDurationMin: 120 },
  KONZERTHAUS: { id: 'KONZERTHAUS', label: 'Konzerthaus', pdfLabels: ['KONZERTHAUS'], typicalDurationMin: 240 }
}

/** PDF role prefix -> role. Order matters (most specific first). */
export const ROLE_PATTERNS: Array<[RegExp, RoleId]> = [
  [/^Pausengastro$/i, 'break_gastro'],
  [/^Falls Pause$/i, 'break_gastro'],
  [/^Gastro (zur Party|bei Premierenfeier)$/i, 'after_show_gastro'],
  [/^Gastro zu Tisch$/i, 'gastro'],
  [/^Aufsicht (Party|Premierenfeier)$/i, 'after_show_supervision'],
  [/^Empfang/i, 'reception'],
  [/^Gastro$/i, 'gastro']
]

export function venueByPdfLabel(label: string): VenueDef | undefined {
  return Object.values(VENUES).find((v) => v.pdfLabels.includes(label))
}
