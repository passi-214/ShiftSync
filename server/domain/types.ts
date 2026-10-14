export type VenueId =
  | 'GROSSES_HAUS' | 'KLEINES_HAUS' | 'WELTRAUM' | 'FOYER_GROSSES_HAUS'
  | 'STEIN_FOYER' | 'THEATER_BAR' | 'KONZERTHAUS'

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
  | 'pdf_missing' | 'pdf_too_large' | 'not_pdf' | 'name_invalid'
  | 'not_roster' | 'read_failed' | 'export_expired'

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
}

export interface PreviewResponse {
  id: string
  person: string
  period: { from: string; to: string } | null
  shifts: Shift[]
  /** Only filled when nothing matched, to help the user fix a typo. */
  availableNames: string[]
  links: {
    ics: string
    /** Set only when Google OAuth is configured; otherwise the UI falls back to the .ics file. */
    googleAdd: string | null
  }
}
