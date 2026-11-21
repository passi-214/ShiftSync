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

// Second roster layout (December): colon times, "ab ca", missing/en dashes, new venues and role labels,
// "Mittwoch 23.12:" headers glued to the previous text, year rollover, notes with "ab" inside parentheses.
export const DEC_SAMPLE = `FOYERMANAGEMENT  Dezember 2026

Dienstag, 01.12.:

GROSSES HAUS ab 08:30 Uhr (beide Vorstellungen) -  Anna Beispiel, Ben Muster, Gina Denise Huber

FOYER
GROSSES HAUS ab 19:00 Uhr -  Anna Beispiel, Carla Probe

Gastro: Gina-Denise Huber

Mittwoch, 02.12.:

GROSSES HAUS ab 18:15 Uhr  -  Ben Muster, Zita Von Wallenberg Pachaly

Gastro: Dora Test, Pascal Nowarra

Pausengastro: Ben Muster, Zita Von Wallenberg Pachaly

Gastro zu Tisch: Dora Test

THEATER-BAR ab ca 19:30 Uhr  - Anna Beispiel, Ben Muster

Freitag, 04.12.:

GROSSES HAUS ab 10:00 Uhr - Pascal Nowarra, Anna Beispiel
KANTINE ab 20:15 Uhr (Treffpunkt Pforte) - Anna Beispiel, Carla Probe

Mittwoch, 09.12.:

WINTERER-FOYER ab 18:00 Uhr Anna Beispiel, Ben Muster
Gastro: Pascal Nowarra

Samstag, 12.12.:

WINTERER FOYER ab 14:00 Uhr (beide Vorstellungen) - Anna Beispiel, Ben Muster,
WELTRAUM ab 18:15 Uhr - Dora Test (bleibt), Ben Muster (anschließend ins GH)
GROSSES HAUS ab 18:15 Uhr – Ben Muster, Pascal Nowarra, Anna Beispiel, Ben Muster
Gastro:, Dora Test, Pascal Nowarra
Pausengastro (wenn es eine Pause gibt): Anna Beispiel, Ben Muster
KLEINES HAUS ab 19:00 Uhr - Carla Probe, Dora Test (plus drei vom GH)

Montag, 14.12.:

FOYER
GROSSES HAUS/KONZERTHAUS ab 18.30 Uhr - Anna Beispiel, Carla Probe

Dienstag, 22.12.:

KLEINES HAUS ab 19:00 Uhr - Anna Beispiel, Carla Probe (plus drei vom GH) THEATERBAR ab 19:00 Uhr – Dora Test, (plus zwei vom GH ab 19:30) Mittwoch 23.12:

GROSSES HAUS ab 18:15 Uhr - Anna Beispiel, Pascal Nowarra
Gastro: Dora Test Donnerstag 31.12:

GROSSES HAUS ab 16:45 Uhr - Anna Beispiel
Pausengastro: Anna Beispiel, Dora Test Es bleiben alle bis zum Schluss!
KLEINES HAUS ab 18:00 Uhr - fünf vom GH; anschl. zurück ins GH

Freitag, 01.01.:

FOYER
GROSSES HAUS ab 14.00 Uhr - (Aufräumaktion im Haus, bitte warm anziehen!) - Anna Beispiel, Pascal Nowarra Ab 14:00 Uhr nur zum Gläser trocknen (ab 15:45 Uhr KHZ, Achtung bitte) - Carla Probe, Dora Test
KONZERTHAUS ab 15.45 Uhr - Carla Probe Letzter Abgabetermin für Wunschtermine Januar ist der 13. Dezember.`
