# ShiftSync

Upload the monthly Foyermanagement roster (**PDF or Word .docx**), type your name, preview your shifts
(date, start, venue, approximate end) and add them to **Apple Calendar**, **Google Calendar** or any calendar app
via `.ics`. German (default) and English UI.

* Name suggestions while typing, based on the names in the uploaded file
* Optional typo check: finds misspelled entries of your name and lists suspicious spellings in the roster
* Direct add to Google Calendar (optional OAuth), inline `.ics` for Apple Calendar, plain `.ics` download
* Backend does all the logic; the frontend is a thin interface

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests
npm run build      # production build -> .output/
```

Optional settings (see `.env.example` and [docs/09-operations.md](docs/09-operations.md)); Google direct add needs
`NUXT_GOOGLE_CLIENT_ID` and `NUXT_GOOGLE_CLIENT_SECRET`.

## Documentation

Start with **[docs/README.md](docs/README.md)**:

1. [Overview](docs/01-overview.md) · 2. [Architecture](docs/02-architecture.md) ·
3. [Backend reference](docs/03-backend-reference.md) · 4. [API reference](docs/04-api-reference.md) ·
5. [Roster format & parser](docs/05-roster-format.md) · 6. [Frontend](docs/06-frontend.md) ·
7. [Extending: recipes](docs/07-extending.md) · 8. [Testing](docs/08-testing.md) ·
9. [Operations](docs/09-operations.md) · 10. [Decisions & limitations](docs/10-decisions-and-limitations.md)

## Structure at a glance

```
locales/     texts (de = source of truth, en)
server/      domain · modules (pure TypeScript) · infrastructure · api (thin) · container.ts
pages/ components/ composables/ assets/    frontend
tests/       Vitest, fixtures, a .docx sample
docs/        full documentation
```
