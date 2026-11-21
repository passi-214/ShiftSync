export type VenueId =
  | 'GROSSES_HAUS' | 'KLEINES_HAUS' | 'WELTRAUM' | 'FOYER_GROSSES_HAUS'
  | 'STEIN_FOYER' | 'WINTERER_FOYER' | 'THEATER_BAR' | 'KANTINE' | 'KONZERTHAUS'

export type RoleId =
  | 'floor'                 // Foyer / house staff, the main block of a venue
  | 'gastro'
  | 'break_gastro'          // Pausengastro / "Falls Pause"
  | 'reception'             // Empfang Donatoren/Förderer
  | 'after_show_gastro'     // Party / Premierenfeier
  | 'after_show_supervision'

/** Language-neutral labels the UI/export translate (see locales/). */
export type ShiftTag = 'break_gastro' | 'if_intermission'

export type ApiErrorCode =
  | 'file_missing' | 'file_too_large' | 'unsupported_file' | 'name_invalid'
  | 'not_roster' | 'read_failed' | 'roster_expired' | 'export_expired'

/** One person as listed in the PDF. */
export interface RosterPerson {
  raw: string
  name: string
  note: string | null
  /** Personal override, e.g. "(ab 19.30 Uhr dazu)" */
  start: string | null
  /** Personal override, e.g. "(bis 18.30 Uhr)" */
  end: string | null
}

/** One block of the PDF: a venue/role on a date with a list of people. */
export interface ScheduleBlock {
  date: string // YYYY-MM-DD
  venue: VenueId
  role: RoleId
  start: string | null // HH:mm, null when inherited and unknown
  end: string | null // explicit "bis HH.MM Uhr"
  note: string | null // raw roster text, e.g. "(offene Probe)"
  tags: ShiftTag[]
  people: RosterPerson[]
}

export interface ParsedSchedule {
  year: number
  blocks: ScheduleBlock[]
}

/** What the user sees and what gets exported. */
export interface Shift {
  id: string
  date: string
  start: string
  end: string // if end <= start the shift ends after midnight
  startIsEstimate: boolean
  endIsEstimate: boolean
  venue: VenueId
  venueLabel: string
  role: RoleId
  /** Raw text from the roster (German, shown as written). */
  notes: string[]
  tags: ShiftTag[]
  /** Set when the shift was found under a different spelling the user confirmed (possible typo in the roster). */
  listedAs: string | null
}

/** A name as written in the roster, with how often it occurs. */
export interface NameStat { name: string; occurrences: number }

/** Entries listed under a spelling that resembles the searched name. */
export interface SimilarName extends NameStat { included: boolean }

/** A rarely used spelling that looks like a typo of a more common one. */
export interface TypoSuspect {
  name: string
  occurrences: number
  probablyMeans: string
  probablyMeansOccurrences: number
}

/** Returned after uploading a roster; the file itself is parsed once and kept server-side. */
export interface RosterInfo {
  id: string
  names: number
  typoSuspects: TypoSuspect[]
}

export interface PreviewRequest {
  rosterId: string
  name: string
  /** Typo check: also suggest similar spellings found in the roster. */
  typoCheck?: boolean
  /** Spellings (exactly as listed in `similar`) the user confirmed as their own. */
  include?: string[]
}

export interface PreviewResponse {
  id: string
  person: string
  period: { from: string; to: string } | null
  shifts: Shift[]
  /** Similar spellings in the roster (typo check, or "did you mean" when nothing matched). */
  similar: SimilarName[]
  links: {
    ics: string
    /** Set only when Google OAuth is configured; otherwise the UI falls back to the .ics file. */
    googleAdd: string | null
  }
}
