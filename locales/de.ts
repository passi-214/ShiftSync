// Source of truth for keys. en.ts is type-checked against this file, so a missing
// translation is a compile error. Used by the UI *and* by the backend (calendar export text).
const de = {
  'lang.label': 'Sprache',
  'app.title': 'Dienste in den Kalender',
  'app.subtitle': 'Lade den monatlichen Foyer-Arbeitsplan hoch, gib deinen Namen ein und übernimm deine Dienste in jede Kalender-App.',

  'form.drop': 'Arbeitsplan (PDF oder Word) hier ablegen',
  'form.dropSub': 'oder klicken zum Auswählen',
  'form.dropChange': 'Klicken, um eine andere Datei zu wählen',
  'form.rosterReading': 'Datei wird gelesen …',
  'form.rosterReady': '{count} Namen im Arbeitsplan gefunden',
  'form.typoCheck': 'Auf Tippfehler im Arbeitsplan prüfen',
  'form.typoCheckHint': 'Findet auch Einträge, bei denen dein Name falsch geschrieben wurde, und zeigt auffällige Schreibweisen an.',
  'form.suggestions': 'Namensvorschläge',
  'form.nameLabel': 'Dein Name, wie er im Arbeitsplan steht',
  'form.namePlaceholder': 'Vor- und Nachname',
  'form.submit': 'Meine Dienste finden',
  'form.loading': 'Arbeitsplan wird gelesen …',

  'result.title.one': '{count} Dienst für {person}',
  'result.title.other': '{count} Dienste für {person}',
  'result.none': 'Unter diesem Namen wurden keine Dienste gefunden.',
  'result.didYouMean': 'Meintest du:',
  'result.until': 'bis',
  'result.legend': 'Eine Tilde (~) kennzeichnet eine geschätzte Zeit. Enden sind meist etwas später als die Vorstellung.',

  'similar.title': 'Ähnliche Schreibweisen im Arbeitsplan',
  'similar.hint': 'Diese Einträge stehen unter einem ähnlichen Namen. Wähle aus, welche zu dir gehören – ihre Dienste werden dann hinzugefügt.',
  'similar.item': '„{name}“ ({count}×)',
  'typo.title': 'Mögliche Tippfehler im Arbeitsplan ({count})',
  'typo.hint': 'Selten verwendete Schreibweisen, die einem häufigeren Namen ähneln. Vielleicht lohnt sich eine Korrektur im Plan.',
  'typo.item': '„{name}“ ({count}×) – meint vermutlich „{means}“ ({meansCount}×)',
  'typo.none': 'Keine auffälligen Schreibweisen gefunden.',
  'shift.listedAs': 'Im Plan eingetragen als „{name}“',
  'shift.listedAsShort': 'Eingetragen als „{name}“',

  'action.apple': 'Zu Apple Kalender hinzufügen',
  'action.google': 'Zu Google Kalender hinzufügen',
  'action.download': 'Kalenderdatei (.ics) herunterladen',
  'action.googleFallback': 'Ohne Google-Anmeldung wird die Datei heruntergeladen und die Importseite von Google Kalender geöffnet. Wähle dort die heruntergeladene Datei aus.',

  'help.title': 'Manuell importieren',
  'help.apple': 'Apple Kalender: Datei öffnen und einen Kalender wählen.',
  'help.outlook': 'Outlook: Datei → Öffnen & Exportieren → Importieren/Exportieren → iCalendar-Datei.',
  'help.other': 'Andere Apps: In den Kalender-Einstellungen nach „Importieren“ suchen und die .ics-Datei wählen.',
  'help.update': 'Wenn du einen aktualisierten Arbeitsplan erneut importierst, werden bestehende Einträge ersetzt statt doppelt angelegt.',

  'banner.googleDone': 'In Google Kalender: {added} hinzugefügt, {updated} aktualisiert.',
  'banner.googleFailed': '{failed} Dienste konnten nicht übertragen werden.',
  'banner.googleCancelled': 'Die Anmeldung bei Google wurde abgebrochen.',
  'banner.googleError': 'Google Kalender war nicht erreichbar. Lade stattdessen die Kalenderdatei herunter.',

  'role.floor': 'Foyer / Haus',
  'role.gastro': 'Gastro',
  'role.break_gastro': 'Pausengastro',
  'role.reception': 'Empfang Donatoren/Förderer',
  'role.after_show_gastro': 'Gastro Feier',
  'role.after_show_supervision': 'Aufsicht Feier',

  'tag.break_gastro': 'Auch Pausengastro',
  'tag.if_intermission': 'Falls Pause',

  'err.file_missing': 'Bitte lade zuerst den Arbeitsplan hoch.',
  'err.file_too_large': 'Die Datei ist zu groß.',
  'err.unsupported_file': 'Bitte lade eine PDF- oder Word-Datei (.docx) hoch.',
  'err.roster_expired': 'Der Arbeitsplan ist nicht mehr gespeichert. Bitte lade die Datei erneut hoch.',
  'err.name_invalid': 'Gib Vor- und Nachnamen ein.',
  'err.not_roster': 'Diese Datei sieht nicht wie ein Foyermanagement-Arbeitsplan aus.',
  'err.read_failed': 'Die Datei konnte nicht gelesen werden.',
  'err.export_expired': 'Dieser Export ist abgelaufen. Lade die PDF erneut hoch.',
  'err.generic': 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',

  'export.calendarName': 'Theaterdienste',
  'export.estimatedEnd': 'Ende geschätzt – bitte prüfen.',
  'export.estimatedTimes': 'Zeiten geschätzt – bitte prüfen.'
} as const

export default de
