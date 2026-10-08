# School Ready Children

The web app for the School Readiness Tool. Anganwadi workers record how their students (children aged 2–6) are
doing on 17 competencies in 6 domains, four sessions each, and follow their centre's progress on
a dashboard. Admins manage users and Anganwadi centres. The app is built for phones first and
works in English and Hindi; an Assamese translation is being prepared (see
[Translations](#translations)).

Built with Angular 21 (standalone components, signals, zoneless), Angular Material 3 and
Transloco.

## Quick start

You need Node.js 20.19+, 22.12+ or 24+, and npm.

```bash
npm ci
npm run start:mock     # demo mode, no backend needed: http://localhost:4200
```

Demo mode answers every API call in the browser from sample data. Sign in with one of these
accounts, all with the password `demo1234` (the login page lists the first three; tapping one
fills in the form):

| Role                        | Email                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Anganwadi worker            | `aww@demo.in` (a second centre: `aww2@demo.in`; not linked to any centre: `aww3@demo.in`) |
| Admin                       | `admin@demo.in`                                                                           |
| Supervisor                  | `supervisor@demo.in`                                                                      |
| CDPO / DPO / State official | `cdpo@demo.in` / `dpo@demo.in` / `state@demo.in`                                          |

The sample domains and competencies are a copy of the real API's (ids, names and
descriptions, word for word). Changes are kept in this browser's localStorage. The yellow demo
banner has **Reset demo data**,
and a **Simulate server down** switch for trying out the error screens.

`npm start` runs the same app against the real API instead (`src/environments/environment.ts`).

## Scripts

| Command                                   | What it does                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm start`                               | Dev server against the real API                                                                            |
| `npm run start:mock`                      | Dev server in demo mode                                                                                    |
| `npm run build`                           | Production build into `dist/sri/browser`                                                                   |
| `npm run build:demo`                      | Optimised demo-mode build into `dist/demo/browser`: a static demo you can host anywhere, no backend needed |
| `npm run build:mock`                      | Development build in demo mode, into `dist/mock` (never into the production folder)                        |
| `npm test`                                | Translation-key check, then the unit tests (Vitest)                                                        |
| `npm run test:watch`                      | Unit tests in watch mode                                                                                   |
| `npm run e2e`                             | End-to-end tests (Playwright) at phone and desktop sizes                                                   |
| `npm run lint`                            | ESLint for TypeScript and templates                                                                        |
| `npm run format` / `npm run format:check` | Prettier                                                                                                   |
| `npm run i18n:check`                      | Fails if the code uses a translation key that isn't in `en.json`                                           |
| `npm run i18n:sheet`                      | Writes every English text to `docs/translations/translations-assamese.xlsx` for the translators            |

## Who sees what

| Role                      | Screens                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| Anganwadi worker          | Home page, domains and assessments, their students, the centre dashboard |
| Admin                     | Overview, users, centres and students                                    |
| Supervisor                | A dashboard page, and the students of the centres in their sector        |
| CDPO, DPO, State official | A dashboard page for their area                                          |

Workers land on the home page after signing in, admins on their overview and officials on their
dashboard page. The dashboards of supervisors, CDPOs, DPOs and state officials need summary data
from the backend, so for now their page only welcomes them. A page opened before signing in (for example a competency tapped
on the wheel) opens after sign-in when the user's role may see it, and their home page otherwise.

Roles, navigation and home pages are configured in one place: `src/app/core/auth/roles.ts`.
Which centres each user may see is decided in `src/app/core/auth/access.ts`: everything for
admins, their own centre for workers (nothing if their account has no centre), and the centres
in their area for supervisors. The API currently returns every centre's students, so the app
filters them; the server must enforce the same rules (see `docs/SECURITY.md`).

## The home page

The client-approved text and the readiness wheel, nothing else. On wider screens the domains sit
around the centre and a domain's competencies fan out while the pointer rests on it (or while it
has keyboard focus); on phones, tapping a domain shows its competencies all around it, and
tapping the centre goes back. Tapping a competency opens it; visitors log in first. The wheel
uses the original app's labels: the full domain names and its short competency names
(`catalog.*.wheel` in the translation files).

## The centre dashboard

Workers see their own centre; admins choose a centre first.

- **Tiles**: students, sessions recorded, the share of latest results that are School Ready, and
  how many students need attention (tapping it opens the list).
- **Filters**: a domain, competencies within it, and the sessions to compare. They apply to the
  four views below.
- **Overview**: every domain at a glance, a bar per session with the students at each level (and
  those not assessed), and how many results went up, stayed or went down. Tapping a domain opens
  its competencies.
- **Competencies**: the same for each competency, the names of the students at each level, and a
  table view.
- **Students**: each student's level in every competency, session by session, with the change
  since the session before.
- **Needs attention**: students whose level went down, or stayed the same below School Ready,
  since their session before, and students who weren't assessed in the latest session the
  others had.

Every comparison uses each student's last two results within the chosen sessions, so choosing
sessions 1 and 2 compares S1 with S2. Levels keep their colours everywhere, with their number
(1–4) next to the colour so they never depend on colour alone. The Excel download has the
summary, the students, every result per session, and the needs-attention list.

## Project structure

```text
src/
  app/
    core/          app-wide services: API clients, sign-in and session, translations, the
                   domain/competency catalogue, the demo backend, errors, loading, offline
    shared/        form validators and helpers, pipes, small UI components
    layout/        language switcher, account menu
    features/
      public/        home page with the readiness wheel, login, not found, unauthorized
      competencies/  competency list and details, the assessment flow
      children/      students list and form (the API calls students "children")
      dashboard/     centre dashboard and Excel export
      admin/         overview, users, centres
      officials/     home page for state, DPO, CDPO and supervisor users
    app.ts, app.routes.ts, app.config.ts
  i18n/            en.json, hi.json, and a test that keeps them in sync
  styles/          design tokens (colours, type, spacing), Material theme, base styles
  environments/    API address for each build
  testing/         helpers for the unit tests
public/assets/     images and video
e2e/               Playwright tests
docs/              AUDIT.md, CODE-REVIEW.md, SECURITY.md, DEPLOYMENT.md, translations/
scripts/           check-translations.mjs, translation-sheet.mjs
```

## Translations

All text is in `src/i18n/en.json` and `src/i18n/hi.json`. Each language is loaded only when it
is chosen, and the choice is remembered on the device. Page titles, `<html lang>`, dates and
numbers follow the language.

- **Plurals** are groups with `one` and `other` entries, used as `{{ 'key' | plural: n }}` in
  templates or `notify.successCount('key', n)` in code.
- **Competency names, descriptions and level texts** come from the API in English. Other
  languages take them from the `catalog` section of their file, falling back to the API text.
- **Assessment levels** are still saved with the same English labels the backend already stores.
  Translated labels are only for display.

**Assamese.** `docs/translations/translations-assamese.xlsx` lists every English text with its
key, an empty Assamese column, where the text appears and what to keep (placeholders, line
breaks, singular and plural). Send it to the translators; `npm run i18n:sheet` writes it again
after texts change. When it comes back, the Assamese column becomes `src/i18n/as.json` (same
keys), and Assamese is added like any other language below, with `locale: 'as-IN'` and a font for
the Assamese script (for example `@fontsource/noto-sans-bengali`).

To add a language, for example Tamil:

1. Copy `src/i18n/en.json` to `src/i18n/ta.json` and translate the values. Keep the keys and the
   `{{placeholders}}` as they are.
2. Add it to `LANGUAGES` in `src/app/core/i18n/languages.ts`:
   `{ code: 'ta', label: 'தமிழ்', short: 'த', locale: 'ta-IN' }`.
3. The build now stops with two errors pointing at where the new file has to be listed: the
   loader (`src/app/core/i18n/translation-loader.ts`) and the test (`src/i18n/translations.spec.ts`).
   Add one line to each.
4. If Figtree and Noto Sans Devanagari don't cover the script, add a font, for example
   `npm i @fontsource/noto-sans-tamil`. Add its CSS file to the `styles` list in `angular.json`,
   next to the other `@fontsource` files, and add the family to `--font-sans` in
   `src/styles/_tokens.scss`.
5. Run `npm test`. It fails if the new file is missing any key or placeholder.

## Tests

- **Unit tests** (Vitest, run with `npm test`) cover the business rules: age, session numbering,
  matching results to students, dashboard counts, the Excel export, validators and API mapping.
  They also cover sign-in, guards, interceptors and the translation files. They run in the
  Asia/Kolkata time zone so that date bugs show up.
- **End-to-end tests** (Playwright, run with `npm run e2e`) start the demo app on port 4300. They
  run each flow on a 360 px phone, a Pixel 7 and a 1366 px desktop, plus in Hindi, and check
  that every page fits a 320 px screen. Pages are scanned with axe for WCAG 2.1 AA problems.
  `e2e/access.spec.ts` checks what every demo role can see and open, and
  `e2e/session.spec.ts` how several open tabs follow a sign-in or sign-out. On a new machine,
  install the browser once with `npx playwright install chromium`. The HTML report is written to
  `e2e/report/`.

## Backend

The API address is set in `src/environments/environment.ts` (development) and
`environment.prod.ts` (production). The app sends the same requests and fields as the old one, so
it can be deployed without backend changes. Before it goes live, the backend still needs:

1. **HTTPS.** Logins and students' data currently travel over plain HTTP.
2. **`GET /children` limited** to the caller's centre or area. Today every worker's device
   receives every student.
3. **Role checks on every endpoint.** The app hides screens, but only the server can enforce
   access.

See `docs/SECURITY.md` for the full list, "Needs the backend" in `docs/CODE-REVIEW.md` for
what the latest review added, and section I of `docs/AUDIT.md` for optional improvements.

## Deployment

`docs/DEPLOYMENT.md` has ready-made nginx and Apache configuration: routing for a single-page
app, caching, HTTPS and the security headers, including the Content-Security-Policy.

## Legacy files (please delete)

The old app's source code is still in the repository. It is no longer built, linted, formatted or
tested; only the new code under `core/` (apart from the folders below), `shared/`, `layout/` and
`features/` is used. To remove it:

```bash
git rm -r src/app/AWW src/app/admin src/app/auth src/app/cdpo src/app/components \
  src/app/dpo src/app/home src/app/login src/app/services src/app/state src/app/supervisor \
  src/app/competency.service.ts src/app/app.component.ts src/app/app.component.html \
  src/app/app.component.scss src/app/core/error src/app/core/http src/app/core/interceptors \
  src/app/core/logger.service.ts src/app/core/performance src/app/core/security \
  src/app/core/services src/app/core/state
```

Then delete `legacy-paths.json` and remove the places that skip these paths: `eslint.config.js`,
`scripts/check-translations.mjs`, `.prettierignore`, and the `exclude` list in
`tsconfig.app.json`.

## Troubleshooting

- **`npm install <package>` fails with "Cannot read properties of null (reading 'edgesOut')".**
  This is an npm 10 bug that showed up while upgrading Vitest. Retry with `--legacy-peer-deps`.
  `npm ci` and `npm install` from the lockfile work normally.
- **A blank page or "failed to fetch dynamically imported module" after a deploy.** The app
  reloads itself once to pick up the new version. If it keeps happening, check that
  `index.html` is served with `Cache-Control: no-cache` (see `docs/DEPLOYMENT.md`).
