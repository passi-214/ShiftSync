import type { RoleId, VenueId } from './types'

export interface VenueDef {
  id: VenueId
  label: string
  /** Exactly as written in the PDF. */
  pdfLabel: string
  /** Typical shift length from the call time (performances usually run a bit longer). */
  typicalDurationMin: number
}

export const VENUES: Record<VenueId, VenueDef> = {
  GROSSES_HAUS: { id: 'GROSSES_HAUS', label: 'Großes Haus', pdfLabel: 'GROSSES HAUS', typicalDurationMin: 270 },
  KLEINES_HAUS: { id: 'KLEINES_HAUS', label: 'Kleines Haus', pdfLabel: 'KLEINES HAUS', typicalDurationMin: 240 },
  WELTRAUM: { id: 'WELTRAUM', label: 'Weltraum', pdfLabel: 'WELTRAUM', typicalDurationMin: 120 },
  FOYER_GROSSES_HAUS: { id: 'FOYER_GROSSES_HAUS', label: 'Foyer Großes Haus', pdfLabel: 'FOYER GROSSES HAUS', typicalDurationMin: 300 },
  STEIN_FOYER: { id: 'STEIN_FOYER', label: 'Stein-Foyer', pdfLabel: 'STEIN-FOYER', typicalDurationMin: 240 },
  THEATER_BAR: { id: 'THEATER_BAR', label: 'Theater-Bar', pdfLabel: 'THEATER-BAR', typicalDurationMin: 180 },
  KONZERTHAUS: { id: 'KONZERTHAUS', label: 'Konzerthaus', pdfLabel: 'KONZERTHAUS', typicalDurationMin: 240 }
}

/** PDF role prefix -> role. Order matters (most specific first). */
export const ROLE_PATTERNS: Array<[RegExp, RoleId]> = [
  [/^Pausengastro$/i, 'break_gastro'],
  [/^Falls Pause$/i, 'break_gastro'],
  [/^Gastro (zur Party|bei Premierenfeier)$/i, 'after_show_gastro'],
  [/^Aufsicht (Party|Premierenfeier)$/i, 'after_show_supervision'],
  [/^Empfang/i, 'reception'],
  [/^Gastro$/i, 'gastro']
]

export function venueByPdfLabel(label: string): VenueDef | undefined {
  return Object.values(VENUES).find((v) => v.pdfLabel === label)
}
