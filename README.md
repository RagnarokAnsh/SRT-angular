# School Ready Children

The web app for the School Readiness Tool. Anganwadi workers record how children aged 2–6 are
doing on 17 competencies in 6 domains, four sessions each, and follow their centre's progress on
a dashboard. Admins manage users and Anganwadi centres. The app is built for phones first and
works in English and Hindi.

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

| Role | Email |
|---|---|
| Anganwadi worker | `aww@demo.in` (a second centre: `aww2@demo.in`) |
| Admin | `admin@demo.in` |
| Supervisor | `supervisor@demo.in` |
| CDPO / DPO / State official | `cdpo@demo.in` / `dpo@demo.in` / `state@demo.in` |

Changes are kept in this browser's localStorage. The yellow demo banner has **Reset demo data**,
and a **Simulate server down** switch for trying out the error screens.

`npm start` runs the same app against the real API instead (`src/environments/environment.ts`).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server against the real API |
| `npm run start:mock` | Dev server in demo mode |
| `npm run build` | Production build into `dist/sri/browser` |
| `npm run build:demo` | Optimised demo-mode build into `dist/demo/browser`: a static demo you can host anywhere, no backend needed |
| `npm run build:mock` | Development build in demo mode |
| `npm test` | Translation-key check, then the unit tests (Vitest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run e2e` | End-to-end tests (Playwright) at phone and desktop sizes |
| `npm run lint` | ESLint for TypeScript and templates |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run i18n:check` | Fails if the code uses a translation key that isn't in `en.json` |

## Who sees what

| Role | Screens |
|---|---|
| Anganwadi worker | Competencies and assessments, the children of their centre, the centre dashboard |
| Admin | Overview, users, centres and children |
| Supervisor | Home page, children |
| CDPO, DPO, State official | A home page for their area (reports for these roles need summary data from the backend) |

Roles, navigation and home pages are configured in one place: `src/app/core/auth/roles.ts`.

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
      children/      children list and form
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
docs/              AUDIT.md, SECURITY.md, DEPLOYMENT.md
scripts/           check-translations.mjs
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
  matching results to children, dashboard counts, the Excel export, validators and API mapping.
  They also cover sign-in, guards, interceptors and the translation files. They run in the
  Asia/Kolkata time zone so that date bugs show up.
- **End-to-end tests** (Playwright, run with `npm run e2e`) start the demo app on port 4300. They
  run each flow on a 360 px phone, a Pixel 7 and a 1366 px desktop, plus in Hindi. Every page is
  scanned with axe for WCAG 2.1 AA problems and checked for sideways scrolling. On a new machine,
  install the browser once with `npx playwright install chromium`. The HTML report is written to
  `e2e/report/`.

## Backend

The API address is set in `src/environments/environment.ts` (development) and
`environment.prod.ts` (production). The app sends the same requests and fields as the old one, so
it can be deployed without backend changes. Before it goes live, the backend still needs:

1. **HTTPS.** Logins and children's data currently travel over plain HTTP.
2. **`GET /children` limited** to the caller's centre or area. Today every worker's device
   receives every child.
3. **Role checks on every endpoint.** The app hides screens, but only the server can enforce
   access.

See `docs/SECURITY.md` for the full list and section I of `docs/AUDIT.md` for optional
improvements.

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
