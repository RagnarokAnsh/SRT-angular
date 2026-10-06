# SRT-angular — Code Audit

*October 2026 · branch `dev` · Angular 21.2*

This is a full review of the app after the Angular 21 upgrade: every source file was read, the
app was built and run, and every route was opened in a headless browser at phone (390 px) and
desktop (1366 px) widths against a mocked API (as AWW and as admin). The bugs marked
**verified** were reproduced with a script or in the browser, not just inferred from reading.

Line numbers refer to the files on `dev`.

**Severity**

| | Meaning |
|---|---|
| 🔴 Critical | Corrupts or leaks data, or breaks a core flow for real users |
| 🟠 High | A feature is broken or behaves badly enough that users notice |
| 🟡 Medium | Real cost in UX, speed or maintainability |
| ⚪ Low | Cleanup and polish |

**At a glance**

| Area | 🔴 | 🟠 | 🟡 | ⚪ |
|---|---|---|---|---|
| A. Data and logic bugs | 2 | 4 | 5 | 1 |
| B. Broken or silent flows | 1 | 6 | 4 | 1 |
| C. Security and privacy | 2 | 2 | 3 | 1 |
| D. Mobile UX, UI, accessibility | – | 4 | 3 | 1 |
| E. Translation (Hindi) blockers | – | 3 | 2 | – |
| F. Performance | – | 2 | 5 | 1 |
| G. Architecture and structure | – | 2 | 4 | 1 |
| H. Code quality, tooling, tests | – | 1 | 3 | 1 |
| **Total (65)** | **5** | **24** | **29** | **7** |

Section I lists things only the backend can fix. Section J is the proposed plan.

---

## Fix first

These are the issues I'd treat as urgent, because they affect real children's records or stop
workers from doing their job:

1. **A1** — every date of birth picked in the form is saved one day early (users in India).
2. **A2** — a child can be shown another child's assessment results, and their next session is then filed wrong.
3. **B1** — when submitting an assessment fails, the worker sees nothing; the error is swallowed.
4. **C2** — an Anganwadi worker's phone downloads every child in the system, then filters on the device.
5. **C1** — logins and children's data travel over plain HTTP.
6. **B4** — after opening the dashboard once, F5 / Ctrl+R stops reloading the page anywhere in the app.
7. **B5** — clicking **Cancel** on the user form saves the user.

---

## Already fixed during the upgrade

- Angular 19.2 → **21.2**, Angular Material/CDK → 21.2, PrimeNG 19 → **21.1** (`@primeng/themes` → `@primeuix/themes`), TypeScript 5.9.
- Build moved to `@angular/build` (esbuild); the webpack-based `@angular-devkit/build-angular` is gone.
- Templates migrated from `*ngIf` / `*ngFor` / `ngSwitch` to `@if` / `@for` / `@switch`.
- Removed unused packages: `ng2-charts`, `chart.js`, `ngx-echarts`, `@popperjs/core`, and the deprecated `@angular/animations` and `@angular/platform-browser-dynamic`.
- Installed packages: 977 → 608. Screens are pixel-identical to the Angular 19 version except PrimeNG 21's slightly larger small icon buttons and toast icons.

---

## A. Data and logic bugs

**A1 🔴 Date of birth is saved one day early** — *verified*
`src/app/AWW/student-management/student.service.ts:156` turns the picked date into text with
`toISOString().split('T')[0]`. The datepicker gives local midnight, and `toISOString()` converts
to UTC first, so in India (UTC+5:30) a child born on 10 May 2020 is stored as **9 May 2020**.
Every child registered or edited with a picked date is affected, and ages computed from it are
wrong around birthdays.
*Fix:* format the local year/month/day, and check existing records on the backend.

**A2 🔴 A child can be shown another child's assessments** — *verified*
`src/app/AWW/assessments/assessments.component.ts:482-492` matches API records to children with
"same child ID **or** the record's name contains this child's first name", and takes the first
hit. With "Ramesh Kumar" listed before "Ram Singh", Ram is shown Ramesh's results even though both
have correct IDs. Ram's next session number is then calculated from Ramesh's history, so his next
assessment is filed under the wrong session. Two children with the same first name also collide.
*Fix:* match on `child_id` only.

**A3 🟠 Assessments done before 5:30 am get yesterday's date** — *verified*
`assessments.component.ts:705` uses the UTC date (`new Date().toISOString().split('T')[0]`).

**A4 🟠 Assessments can be recorded against the wrong competency**
If the competency fails to load, `assessments.component.ts:339` silently falls back to
`competency_id = 1` (Classification). If a competency isn't found by name, the first competency
is used instead. Either way the worker can submit results to the wrong competency without knowing.
*Fix:* show an error and block submission.

**A5 🟠 Dashboard "Overall progress" under-counts badly** — *verified*
`src/app/AWW/dashboard/dashboard.component.ts:827` merges the data for all competencies and then
keeps only one record per child, so only one competency is counted per child. With test data the
dashboard shows **10 of 280 (4%)** when the real figure is **100 of 280 (36%)**. The level counts
use the same merged data.

**A6 🟠 The Excel export is wrong**
- The "Competency" column always shows the first selected competency: `getCompetencyName()` (`dashboard.component.ts:1648`) is a placeholder that matches everything.
- "Session date" columns are always empty: the code reads `assessed_at`, the API sends `created_at` (`:1522`).
- Height and weight columns are always empty: they read `heightCm` / `weightKg`, which don't exist (`:1492`).

**A7 🟡 Session-numbering edge cases**
- A child who already has 4 sessions gets "attempt 4" sent again (`assessments.component.ts:749`).
- If the selection mixes finished and unfinished children, Submit is disabled with no explanation (the message is commented out).
- Each submission is one request per child in parallel. If one fails, the worker is told everything failed, and retrying can create duplicate sessions for the children that did succeed.

**A8 🟡 Business rules hard-coded in the UI**
- Height/weight entry is tied to competency IDs 10 and 11 (`assessments.component.ts:997`).
- The level descriptions for all 17 competencies (68 sentences) live in the component and are picked by searching the **English competency name** for words like "expression" (`:1008`). Renaming a competency on the backend, or translating it, silently shows generic text instead.
- Level names disagree: the form saves "Beginning / Advancing", the fallback saves "Beginner / Advanced", and the dashboard also looks for "PSR".

**A9 🟡 Every child must have two names**
First name and last name are both required (at least 2 letters each), joined into one `name` for
the API, then split back at the first space. Children with a single name can't be registered
without inventing a surname, and names containing `.`, `-` or `'` are rejected.

**A10 🟡 Missing data is silently replaced with fake values**
`student.service.ts:128` defaults a missing `anganwadi_id` to **1** and a missing date of birth to
**today**, and those values are written back on the next save. `age` is computed on the device and
saved with every edit, so it goes stale.

**A11 🟡 The same rules are implemented differently in different places**
- Age is calculated in four different ways.
- Height/weight limits are 30–200 cm and 5–50 kg in the student form, but 0–200 and 0–100 in the assessment.
- Gender is "Boy / Girl / N/A" for children and "male / female / N/A" for users.

**A12 ⚪ "Select all" ignores the search filter**
It selects every child, not just the filtered ones, and the filter only matches first names.

---

## B. Broken or silent flows

**B1 🔴 Errors are swallowed, so the worker gets no feedback**
`showMessage(message, true)` in `assessments.component.ts:940` does nothing for errors. A failed
assessment submission, a failed student load, a missing Anganwadi ID or an invalid height/weight
all end with the worker tapping **Submit** and nothing happening. Create/update student and create
Anganwadi have the same problem: the comment says "error toast is already handled in the service",
but no service shows one.

**B2 🟠 A wrong password reloads the whole page after 2 seconds**
The login error goes to `ErrorHandlerService`, which treats any 401 as an expired session and runs
`window.location.href = '/login?expired=true'` after 2 seconds
(`src/app/core/error/error-handler.service.ts:113`, `:229`). This assumes the backend answers 401
for bad credentials, which the app's own error messages expect.

**B3 🟠 The Home page can't be opened while logged out** — *verified*
The `UserService` constructor calls `logout()`, which navigates to `/login`
(`src/app/services/user.service.ts:83`, `:140`). Any URL opened while logged out, including
`/home` and `/unauthorized`, ends up on the login page.

**B4 🟠 F5 / Ctrl+R stops working everywhere after visiting the dashboard** — *verified*
`dashboard.component.ts:1897` adds a page-wide key listener that cancels F5 and Ctrl+R, and never
removes it. After the dashboard has been opened once, those keys are cancelled on every page, and
each visit adds another listener.

**B5 🟠 Clicking Cancel on the user form saves the user**
The Cancel button in `create-edit-user.component.html:240` has no `type="button"`, so it submits
the form (creating or updating the user) before navigating away.

**B6 🟠 Admins and supervisors can't add children**
The student form requires an Anganwadi, but only Anganwadi workers get one filled in; there is no
field to choose it, so **Save** stays disabled for everyone else. Supervisors are listed as allowed
on `/students`, but the permission check sends them to "unauthorized".

**B7 🟠 Five of the six role dashboards are placeholders**
The admin, state, DPO, CDPO and supervisor dashboards just say "…-dashboard works!". Admins land on
that page right after logging in.

**B8 🟡 Navigation is inconsistent**
- The navbar shows **Students** and **Domains** to supervisors, CDPOs, DPOs and state officials, who are then sent to "unauthorized".
- Login sends Anganwadi workers to `/select-competency`, but their **Dashboard** link goes to `/aww/dashboard`.
- Routes are duplicated: `/dashboard` and `/aww/dashboard`, and three separate `/assessments` routes.

**B9 🟡 List loading states are wrong**
The Anganwadi list never stops loading when there are no centres (`forkJoin([])` finishes without a
value). "No users found" / "No centres found" appears at the same time as the loading skeleton.

**B10 🟡 Login flow quirks**
- After success the service navigates immediately, then the component navigates again after an artificial 1-second delay, so the return URL races.
- "Remember me" does nothing.
- The `?timeout=true` and `?expired=true` flags are never shown to the user.

**B11 🟡 Two separate redirects fire for the same expired session**
The interceptor and the error handler both handle a 401 and both redirect; session timeout uses a
full page reload.

**B12 ⚪ Small leftovers**
- The assessments table has paginator code but no paginator in the template, so it never paginates.
- Noisy toasts: "Student Loaded", "User Loaded", "Level hidden", "All filters cleared successfully!".

---

## C. Security and privacy

**C1 🔴 The API is called over plain HTTP**
`src/environments/environment.ts:7` (production is identical) uses `http://`. Passwords, login
tokens and children's personal data travel unencrypted, and if the site itself is served over HTTPS
the browser blocks these calls entirely. I couldn't reach the server from here to check whether it
supports HTTPS.

**C2 🔴 An Anganwadi worker's device downloads every child**
`student.service.ts:283` calls `GET /children` and filters by Anganwadi in the browser; the
dashboard does the same. Unless the backend already limits this endpoint, every worker's phone
receives the names, dates of birth, heights and weights of children at **all** centres.
*Fix:* filter on the server (see I2).

**C3 🟠 Dependencies with known vulnerabilities**
- `swiper` 11 — critical, prototype pollution (GHSA-hmx5-qpq5-p643); fixed in 12.1.2+.
- `xlsx` 0.18.5 — high, prototype pollution and ReDoS; no fixed version is published on npm.
- `echarts` 5 — moderate, XSS; fixed in 6.1.

**C4 🟠 Third-party code loaded without integrity checks**
Bootstrap's JavaScript bundle (which the app doesn't even use), Bootstrap CSS and Font Awesome are
loaded from CDNs with no integrity hashes (`src/index.html:9`, `:12`, `:20`), and there is no
Content-Security-Policy.

**C5 🟡 "Security" code that doesn't protect anything**
- XOR "encryption" with a hard-coded key, currently switched off "for debugging".
- A "CSRF token" generated in the browser.
- Input "sanitising" on the email field.
- A rate limiter that never runs.
- Headers that are never actually sent: `HttpHeaders.set()` returns a new object, and the code throws it away (`security.service.ts:290`, `http.service.ts:266`).

**C6 🟡 The login token and profile are stored three times**
`auth_token`, `user_data` and `appState` in localStorage all hold copies, readable by any injected
script, and logout leaves part of `appState` behind. Role checks happen only in the browser; that's
fine for hiding UI, but the backend must enforce them too.

**C7 🟡 Weak password rules for new users**
New user passwords only need 6 characters. A strength checker exists in the code but isn't used.

**C8 ⚪ Production hides every error**
`src/main.ts:9` silences the console in production with no error reporting to replace it, and
development logs include emails and full request bodies.

---

## D. Mobile UX, UI and accessibility

**D1 🟠 The dashboard chart doesn't work in portrait on phones**
It is replaced by a "Rotate your device" message, in an app that's meant to be mobile-first.

**D2 🟠 Tables don't fit on phones**
The student list has 10 columns and scrolls sideways, which puts **Edit** and **Delete** off-screen.
The gross/fine motor assessment table cuts off session results. Phones need a card layout instead.

**D3 🟠 Assessment level cards are hard to read**
White text sits on pastel colours, e.g. `#FFD657` gives a contrast ratio of 1.4:1, where WCAG
requires 4.5:1. These cards are the core of the assessment screen.

**D4 🟠 Text is too small on phones**
Competency names are about 9 px (`0.55rem`), the details button is `0.65rem`, and dates are 10 px.
Competency descriptions only appear on mouse hover, so touch users never see them.

**D5 🟡 The visual language is inconsistent**
- Four UI kits (Bootstrap, Angular Material, PrimeNG and a custom dropdown) and three icon fonts.
- The orange `#f84525` and indigo `#6366f1` accents are used interchangeably.
- Angular Material is themed azure/blue and PrimeNG is configured blue (`#3B82F6`).
- A leftover Material override gives filled buttons an orange background with red text (`src/styles.scss:11`).
- The unauthorized page uses stock Bootstrap blue and grey.
- The brand font Figtree is loaded, but the page actually renders in Roboto because a later rule overrides it (`styles.scss:210`) — *verified*.

**D6 🟡 Accessibility gaps**
- Clickable `<div>`s and links without `href` (competency cards, the Manage menu, Logout, chip remove icons) can't be reached with a keyboard.
- The custom dropdown has no ARIA roles and no keyboard support.
- The level cards nest `<label>` inside `<label>`.
- Alt text is generic ("Details Image"), and every page has the same browser title.
- Touch targets are 16–32 px; the guideline is 44 px.

**D7 🟡 Loading and feedback are clumsy**
- A full-screen overlay blocks the app on every request and navigation, on top of the skeleton loaders.
- The loading flag is a simple on/off switch, so parallel requests make it flicker.
- Dates are US-style `M/d/yy` in the student list but `dd/mm/yyyy` elsewhere.
- The assessment table shows first names only.
- Age is shown in whole years, which is too coarse for 2–6-year-olds.

**D8 ⚪ The details page is heavy and repetitive**
- The infographic's text is unreadable on phones.
- The page renders 6 `<video>` elements, all the same 34 MB placeholder file.
- All four checkboxes have to be ticked again every time.

---

## E. Translation (Hindi) blockers

**E1 🟠 All text is hard-coded in English**
That's roughly 220 strings in templates and 190 in TypeScript (toasts, validation messages, chart
labels), plus the 68 level descriptions.

**E2 🟠 The backend stores display text, not codes**
The assessment level is saved as its English label (e.g. "School Ready"), and the dashboard reads
it back by searching for words like "beginner". Translating the labels directly would corrupt the
data. The app needs stable level codes, with the translated label shown only on screen.

**E3 🟠 Hindi names can't be entered**
The name and home-language fields only accept A–Z, and strip anything else as you type
(`create-edit-student.component.ts:293`). Devanagari input is impossible.

**E4 🟡 Competency data and images depend on English names**
Competency names, descriptions and domain names come from the API in English. Competency image
paths are built from the English name (`src/app/competency.service.ts`), so translated names would
break the images. The home-page dial has its domain names hard-coded.

**E5 🟡 Formatting isn't locale-aware**
- Dates and ages are built by hand ("dd/mm/yyyy", "5y 2m") instead of with locale-aware formatting.
- `<html lang="en">` is fixed.
- Figtree has no Devanagari characters, so Hindi needs a fallback font such as Noto Sans Devanagari.

---

## F. Performance

**F1 🟠 The dashboard sends one request per competency (17) on every load and refresh**
See `dashboard.component.ts:785`. A bulk call (`getAllAssessmentsByAnganwadi`) already exists in the
service but isn't used.

**F2 🟠 The Anganwadi list makes 3 extra requests per centre**
It looks up the country, state and district separately for each centre, so 100 centres means 300
requests (`anganwadi.service.ts:75`).

**F3 🟡 The dashboard bundle is 1.51 MB (387 kB compressed)**
It imports all of echarts and the Excel library up front. Importing only the chart parts used, and
loading the exporter only when someone clicks Export, would remove most of it.

**F4 🟡 About 19 MB of unused files ship with every build**
- About 19 MB of unused images and audio (listed in the appendix).
- The login background is 2746 × 1322 px.
- The same 34 MB placeholder video is used for every competency.

**F5 🟡 Too many render-blocking stylesheets and fonts**
- Bootstrap CSS is loaded twice: 5.3.0 from a CDN plus 5.3.6 compiled into the app.
- All of Font Awesome is loaded for a single eye icon.
- Material Icons, Roboto and Figtree are also loaded, Figtree via a CSS `@import`.

**F6 🟡 Change detection does a lot of repeated work**
- Templates call functions that recompute on every change detection (the home dial recomputes its geometry three times per segment).
- Dozens of `setTimeout` / `detectChanges()` workarounds.
- No OnPush or signals; the app still runs on zone.js.

**F7 🟡 Event listeners leak**
Window `resize` / `orientationchange` listeners are never removed in the assessments page, the
student/user/Anganwadi lists, the details page and the dashboard. Removal uses a fresh `bind()`, so
it never matches, and the dashboard adds a new listener every time it redraws the chart.

**F8 ⚪ Whole lists are downloaded to find one item**
All Anganwadi centres are fetched to find one or filter by sector, even though a
`getCentersBySector` endpoint exists and is unused.

---

## G. Architecture and structure

**G1 🟠 Two components do far too much**
The AWW dashboard is ~1,900 lines and the assessments component ~1,470. Each mixes API calls, data
mapping, business rules, chart setup, export and UI state in one class.

**G2 🟠 About 2,000 lines of services are unused or nearly unused**
- `HttpService` (395 lines) and `PerformanceService` (300) are never used.
- `AppStateService` (268) only mirrors login state.
- `SecurityService` (392) is mostly the no-op code from C5.
- `ErrorHandlerService` + `UXErrorService` (570) — while the places that need error handling (B1) have none.

**G3 🟡 Copy-paste instead of shared code**
- 11 guard classes with near-identical bodies.
- Two interceptor implementations, one of them unused.
- The role → dashboard mapping is duplicated in three places, with different upper/lower-case handling.

**G4 🟡 Folders, names and models are inconsistent**
- `AWW/` vs `admin/` folder naming, and `competency.service.ts` sitting at the app root.
- Two different classes are both called `UserService`.
- Models are duplicated: Anganwadi ×3, Country/State/District ×2, Role ×2, Student ×2, and `LevelDescription` declared twice in one file.

**G5 🟡 The "lazy-loaded" management sections aren't lazy**
They use `loadChildren: () => ROUTES` with the routes imported eagerly, even though the old notes
say they're lazy.

**G6 🟡 Redundant wrappers and dialogs**
- Wrapper components with unused `showSuccess` / `showError` methods, and cards nested inside cards.
- Three identical delete dialogs sharing one selector, plus a logout dialog and an unused generic confirm dialog.

**G7 ⚪ Inconsistent TypeScript style**
- Constructor injection mixed with `inject()`.
- `any` used throughout.
- Deprecated `toPromise()`.
- Subscriptions that are never cleaned up.

---

## H. Code quality, dead code, tooling and tests

**H1 🟠 The test suite doesn't compile**
All 17 spec files are stale or default boilerplate, so 0 tests run. Angular 21 now uses Vitest by
default.

**H2 🟡 Lots of dead code**
- About 300 lines of commented-out features ("VERSION 2 pending assessments", teaching-strategies dialog, remarks dialog).
- A 405-line stylesheet that's never loaded (`create-edit-student` uses `styles: []`).
- About 80% of the home dial's 900-line stylesheet targets elements that don't exist, and its template contains a `<script>` tag.
- An unused `SkeletonLoaderModule`.
- `ErrorHandlerService` injected but never used in 5 components.

**H3 🟡 Leftover notes from earlier AI sessions**
Eight markdown files (`SESSION_COMPLETE.md`, `MEMORY_LEAK_FIXES.md`, …) contain outdated or wrong
claims, and the README just says "npm install swiper".

**H4 🟡 No linting, formatting or CI**
- No ESLint or Prettier config, and no CI.
- Development and production environments point at the same server.
- About 40 environment flags are never read, and `apiUrl` and `baseUrl` duplicate each other.

**H5 ⚪ Small leftovers**
- `angular.json` points to a `src/favicon.ico` that doesn't exist.
- The size budget is a very loose 4 MB.
- `main.ts:18` calls `inject()` inside a promise `catch`, which throws and hides any real startup error.
- An unused `title` property.
- The graph skeleton uses `Math.random()` in its template, which causes errors in development.
- A debug `console.log` is left in the custom dropdown.

---

## I. Needs the backend

1. **HTTPS** for `ready.unilearn.org.in` (C1).
2. **Limit `GET /children`** to the caller's centre (or district/project for supervisors) (C2).
3. **Bulk assessments**: is `/assessments/anganwadi/{id}/all` implemented? It would replace 17 requests (F1).
4. **Level codes**: store assessment levels as codes (e.g. `1–4`, or `BEGINNING…SCHOOL_READY`) instead of English labels (E2).
5. **Competency `code` / image URL**: send a stable code or image URL with each competency, and ideally Hindi names and descriptions (E4).
6. **Location names inline**: include country/state/district names in `/anganwadi-centers` (F2).
7. **Batch submit**: can one POST carry several children, each with its own session number? (A7)
8. **Login errors**: what does a wrong password return, 401 or 422? (B2)

---

## J. Proposed plan

Nothing in sections A–H has been changed yet. This is the plan I'd follow once you've reviewed the
list.

1. **Foundation**
   - A clean folder structure (`core/`, `shared/`, `features/<role>/`) and one typed API layer with a single set of models.
   - Functional guards and interceptors, and one role configuration.
   - Signals, OnPush and zoneless change detection.
   - Remove the dead services, code and markdown files.
   - Add ESLint and Prettier, and switch tests to Vitest with real tests for the business rules (age, session numbering, level mapping, child matching).
2. **Fix the bugs** in A–C that the frontend can fix, each with a test, and work around the backend items where possible.
3. **Translation** with **Transloco**: switch language at runtime without reloading, keep translations in `en.json` / `hi.json`, add a language switcher, remember the choice, use a Devanagari font fallback, and format dates and numbers for the chosen locale. Adding another language later means adding one JSON file.
4. **UI/UX redesign with the same palette**
   - The current colours become design tokens:
     - `#f84525` primary (hover `#d63819`)
     - `#f8f4f3` background
     - `#374151` text
     - `#6366f1` secondary
     - the four level colours, kept as one consistent set with dark text on them for contrast
     - Figtree as the actual font
   - One component kit (Angular Material 21, themed to the palette) instead of four, and one icon set.
   - Mobile-first screens:
     - bottom navigation for Anganwadi workers on phones
     - card lists instead of tables on small screens
     - the assessment flow as a clear two-step stepper with large touch targets
     - a dashboard chart that works in portrait
     - inline skeletons instead of the full-screen overlay
   - Every screen checked at 360, 390, 768 and 1366 px before it's committed, so the mobile work you already did isn't lost.

---

## Appendix — unused files (≈19 MB)

`src/assets/audio/instruction1.mp3` (1.1 MB), `src/assets/images/landing.png` (3.4 MB),
`number.jpg` (3.1 MB), `pattern.jpg` (2.7 MB), `class.jpg` (2.2 MB),
`Creative Expression.jpg` (0.9 MB), `read.jpg`, `sharing.jpg`, `vocab.jpg`, `seriation.jpg`,
`listen.jpg`, `Initiative.jpg`, `Task Persistence.jpg`, `fine.jpg`, `gross.jpg`, `interaction.jpg`,
`exp.jpg`, `EW.jpg`, `Imagination.jpg`, `assessment-illustration.svg`, `child.svg`,
`competency.svg`, `logo.svg`.

The images in `images/competencies/` and `images/details/` **are** used: their paths are built
from competency names at runtime.
