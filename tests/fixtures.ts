// Excerpt in the shape pdf text extraction produces (arbitrary line breaks, glued words).
export const SAMPLE = `FOYERMANAGEMENT September/Oktober 2026
Samstag, 26.09.:
FOYER GROSSES HAUS ab 14.00 Uhr bis 23.30 Uhr - Elke Rakus (bis 18.30
Uhr), Martin Vollmer, Janette Bäuerle (nach Fassade), Constanze Graf (ab 19.30 Uhr dazu)
Gastro: Felix Rath, Franka Haberlandt (bis 18.30 Uhr)
KLEINES HAUS ab 18.30 Uhr (offene Probe) - Liane Feist, Antonia KirnerSonntag, 27.09.:
GROSSES HAUS ab 16.45 Uhr - Elke Rakus, Janette Bäuerle, Constanze Graf
Gina-Denise Huber, Marietta Schantz
Pausengastro: Janette Bäuerle, Gina-Denise Huber
Samstag, 03.10.:
GROSSES HAUS ab 17.15 Uhr (Sicherheitseinführung vor dem
Vorstellungsbetrieb) - Gina-Denise Huber, Janette Bäuerle
ab 18.15 Uhr - Elke Rakus, Gina-Denise Huber, Janette Bäuerle
Gastro: Frederike von Einem
Aufsicht Party: Sophie Hunold, Janette Bäuerle
Donnerstag, 15.10.:
WELTRAUM ab 09.15 Uhr - Janette Bäuerle, Ida von Bischopinck
WELTRAUM ab 13.15 Uhr - Janette Bäuerle, Marietta Schantz
Letzter Abgabetermin für Wunschtermine November ist der 16. Oktober.`

// Names with a typo ("Pacsal"), an inconsistent spelling ("Gina Huber") and a comma lost in extraction.
export const TYPO_SAMPLE = `Sonntag, 04.10.:
GROSSES HAUS ab 16.45 Uhr - Pascal Nowarra, Anna Berger, Felix Rath, Gina-Denise Huber
Montag, 05.10.:
GROSSES HAUS ab 16.45 Uhr - Pascal Nowarra, Anna Berger, Gina-Denise Huber, Lilli Deimann
Dienstag, 06.10.:
GROSSES HAUS ab 16.45 Uhr - Pacsal Nowarra, Anna Berger, Constanze Graf
Gina-Denise Huber, Liliana Deimann
Mittwoch, 07.10.:
KLEINES HAUS ab 19.00 Uhr - Constanze Graf, Gina Huber, Felix Rath
Donnerstag, 08.10.:
GROSSES HAUS ab 16.45 Uhr - Pascal Nowarra, Constanze Graf, Felix Rath, Liliana Deimann`
