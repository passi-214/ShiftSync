import type de from './de'

const en: Record<keyof typeof de, string> = {
  'lang.label': 'Language',
  'app.title': 'Shift Sync',
  'app.subtitle': 'Upload the monthly foyer roster, enter your name, and add your shifts to any calendar app.',

  'form.drop': 'Drop the roster (PDF or Word) here',
  'form.dropSub': 'or click to browse',
  'form.dropChange': 'Click to choose a different file',
  'form.rosterReading': 'Reading file…',
  'form.rosterReady': '{count} names found in the roster',
  'form.typoCheck': 'Check the roster for typos',
  'form.typoCheckHint': 'Also finds entries where your name is misspelled, and highlights suspicious spellings.',
  'form.suggestions': 'Name suggestions',
  'form.nameLabel': 'Your name as it appears in the roster',
  'form.namePlaceholder': 'First and last name',
  'form.submit': 'Find my shifts',
  'form.loading': 'Reading roster…',

  'result.title.one': '{count} shift for {person}',
  'result.title.other': '{count} shifts for {person}',
  'result.none': 'No shifts found under that name.',
  'result.didYouMean': 'Did you mean:',
  'result.until': 'until',
  'result.legend': 'A tilde (~) marks an estimated time. End times are usually a little later than the performance.',

  'similar.title': 'Similar spellings in the roster',
  'similar.hint': 'These entries are listed under a similar name. Choose which ones are yours – their shifts will be added.',
  'similar.item': '“{name}” ({count}×)',
  'typo.title': 'Possible typos in the roster ({count})',
  'typo.hint': 'Rarely used spellings that resemble a more common name. It may be worth correcting them in the roster.',
  'typo.item': '“{name}” ({count}×) – probably means “{means}” ({meansCount}×)',
  'typo.none': 'No suspicious spellings found.',
  'shift.listedAs': 'Listed in the roster as “{name}”',
  'shift.listedAsShort': 'Listed as “{name}”',

  'action.apple': 'Add to Apple Calendar',
  'action.google': 'Add to Google Calendar',
  'action.download': 'Download calendar file (.ics)',
  'action.googleFallback': 'Without Google sign-in, the file is downloaded and Google Calendar’s import page opens. Choose the downloaded file there.',

  'help.title': 'Import manually',
  'help.apple': 'Apple Calendar: open the file and choose a calendar.',
  'help.outlook': 'Outlook: File → Open & Export → Import/Export → iCalendar file.',
  'help.other': 'Other apps: look for “Import” in the calendar settings and select the .ics file.',
  'help.update': 'Importing an updated roster later replaces the matching events instead of duplicating them.',

  'banner.googleDone': 'In Google Calendar: {added} added, {updated} updated.',
  'banner.googleFailed': '{failed} shifts could not be transferred.',
  'banner.googleCancelled': 'Google sign-in was cancelled.',
  'banner.googleError': 'Google Calendar could not be reached. Download the calendar file instead.',

  'role.floor': 'Foyer / house',
  'role.gastro': 'Gastro',
  'role.break_gastro': 'Intermission gastro',
  'role.reception': 'Donor reception',
  'role.after_show_gastro': 'After-show gastro',
  'role.after_show_supervision': 'After-show supervision',

  'tag.break_gastro': 'Also intermission gastro',
  'tag.if_intermission': 'If there is an intermission',

  'err.file_missing': 'Please upload the roster first.',
  'err.file_too_large': 'The file is too large.',
  'err.unsupported_file': 'Please upload a PDF or Word (.docx) file.',
  'err.roster_expired': 'The roster is no longer stored. Please upload the file again.',
  'err.name_invalid': 'Enter your first and last name.',
  'err.not_roster': 'This file does not look like a Foyermanagement roster.',
  'err.read_failed': 'The file could not be read.',
  'err.export_expired': 'This export has expired. Upload the PDF again.',
  'err.generic': 'Something went wrong. Please try again.',

  'export.calendarName': 'Theater shifts',
  'export.estimatedEnd': 'End time estimated – please double-check.',
  'export.estimatedTimes': 'Times estimated – please double-check.'
}

export default en
