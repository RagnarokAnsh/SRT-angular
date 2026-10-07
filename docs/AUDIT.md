# SRT-angular — Code Audit

*October 2026 · branch `dev` · Angular 21.2 · statuses updated after the rewrite*

This is a full review of the app after the Angular 21 upgrade: every source file was read, the
app was built and run, and every route was opened in a headless browser at phone (390 px) and
desktop (1366 px) widths against a mocked API (as AWW and as admin). The bugs marked
**verified** were reproduced with a script or in the browser, not just inferred from reading.

Line numbers refer to the original files, which stay in the repository until they are deleted
(see “Legacy files” in the README). Each item now ends with its status.

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

Section I lists things only the backend can fix. Section J is the plan that was followed.

**Status after the rewrite**

| | Count | Meaning |
|---|---|---|
| ✅ Fixed | 53 | Fixed in the app (4 of these still have old files waiting to be deleted) |
| ⚠️ Partly fixed | 10 | The app does what it can; the rest needs the backend or is a known limit |
| 🔌 Needs backend | 2 | Only the server can fix it (HTTPS, and limiting `GET /children`) |

---

## Fix first

These are the issues I'd treat as urgent, because they affect real children's records or stop
workers from doing their job:

1. **A1** — every date of birth picked in the form is saved one day early (users in India). ✅
2. **A2** — a child can be shown another child's assessment results, and their next session is then filed wrong. ✅
3. **B1** — when submitting an assessment fails, the worker sees nothing; the error is swallowed. ✅
4. **C2** — an Anganwadi worker's phone downloads every child in the system, then filters on the device. 🔌
5. **C1** — logins and children's data travel over plain HTTP. 🔌
6. **B4** — after opening the dashboard once, F5 / Ctrl+R stops reloading the page anywhere in the app. ✅
7. **B5** — clicking **Cancel** on the user form saves the user. ✅

---

## Already fixed during the upgrade

- Angular 19.2 → **21.2**, Angular Material/CDK → 21.2, PrimeNG 19 → **21.1** (`@primeng/themes` → `@primeuix/themes`), TypeScript 5.9.
- Build moved to `@angular/build` (esbuild); the webpack-based `@angular-devkit/build-angular` is gone.
- Templates migrated from `*ngIf` / `*ngFor` / `ngSwitch` to `@if` / `@for` / `@switch`.
- Removed unused packages: `ng2-charts`, `chart.js`, `ngx-echarts`, `@popperjs/core`, and the deprecated `@angular/animations` and `@angular/platform-browser-dynamic`.
- Installed packages: 977 → 608. Screens are pixel-identical to the Angular 19 version except PrimeNG 21's slightly larger small icon buttons and toast icons.
- Later, in the redesign, PrimeNG, Bootstrap, echarts, swiper, xlsx and zone.js were removed completely; Angular Material is now the only component kit.

---

## A. Data and logic bugs

**A1 🔴 Date of birth is saved one day early** — *verified*
`src/app/AWW/student-management/student.service.ts:156` turns the picked date into text with
`toISOString().split('T')[0]`. The datepicker gives local midnight, and `toISOString()` converts
to UTC first, so in India (UTC+5:30) a child born on 10 May 2020 is stored as **9 May 2020**.
Every child registered or edited with a picked date is affected, and ages computed from it are
wrong around birthdays.
*Fix:* format the local year/month/day, and check existing records on the backend.

> **✅ Fixed.** Dates are built from the local calendar day (`toIsoDate` in `core/util/dates.ts`), and the unit tests run in the Asia/Kolkata time zone. Records saved before the fix may still be a day early; only the backend can find and correct those.

**A2 🔴 A child can be shown another child's assessments** — *verified*
`src/app/AWW/assessments/assessments.component.ts:482-492` matches API records to children with
"same child ID **or** the record's name contains this child's first name", and takes the first
hit. With "Ramesh Kumar" listed before "Ram Singh", Ram is shown Ramesh's results even though both
have correct IDs. Ram's next session number is then calculated from Ramesh's history, so his next
assessment is filed under the wrong session. Two children with the same first name also collide.
*Fix:* match on `child_id` only.

> **✅ Fixed.** `matchProgress` (`core/assessment/progress.ts`) matches on `child_id`. A row without an ID only matches a child with exactly the same full name, and only when that name is unique, so "Ram" can never pick up "Ramesh"'s results. Unit-tested.

**A3 🟠 Assessments done before 5:30 am get yesterday's date** — *verified*
`assessments.component.ts:705` uses the UTC date (`new Date().toISOString().split('T')[0]`).

> **✅ Fixed.** The assessment date is the local day (`toIsoDate`).

**A4 🟠 Assessments can be recorded against the wrong competency**
If the competency fails to load, `assessments.component.ts:339` silently falls back to
`competency_id = 1` (Classification). If a competency isn't found by name, the first competency
is used instead. Either way the worker can submit results to the wrong competency without knowing.
*Fix:* show an error and block submission.

> **✅ Fixed.** If the competency can't be loaded, the page shows an error with Retry (or "not found") and nothing can be submitted. There is no fallback competency any more.

**A5 🟠 Dashboard "Overall progress" under-counts badly** — *verified*
`src/app/AWW/dashboard/dashboard.component.ts:827` merges the data for all competencies and then
keeps only one record per child, so only one competency is counted per child. With test data the
dashboard shows **10 of 280 (4%)** when the real figure is **100 of 280 (36%)**. The level counts
use the same merged data.

> **✅ Fixed.** Each competency is counted on its own row and the totals add up across rows (`features/dashboard/dashboard-model.ts`, unit-tested).

**A6 🟠 The Excel export is wrong**
- The "Competency" column always shows the first selected competency: `getCompetencyName()` (`dashboard.component.ts:1648`) is a placeholder that matches everything.
- "Session date" columns are always empty: the code reads `assessed_at`, the API sends `created_at` (`:1522`).
- Height and weight columns are always empty: they read `heightCm` / `weightKg`, which don't exist (`:1492`).

> **✅ Fixed.** The new export (`dashboard-export.ts`) writes the right competency on every row, session dates from `created_at`, and height and weight from the child record. Labels are in the current language, and the Excel library (`write-excel-file`) only downloads when Export is pressed.

**A7 🟡 Session-numbering edge cases**
- A child who already has 4 sessions gets "attempt 4" sent again (`assessments.component.ts:749`).
- If the selection mixes finished and unfinished children, Submit is disabled with no explanation (the message is commented out).
- Each submission is one request per child in parallel. If one fails, the worker is told everything failed, and retrying can create duplicate sessions for the children that did succeed.

> **✅ Fixed.** Students with all 4 sessions are shown as done and can't be selected; the list has All / To do / Done filters. Results are sent at most 3 at a time; if some fail, the page names those students and **Try again** resends only them, so successful results are never duplicated. It is still one POST per student until the backend offers a batch call (I7).

**A8 🟡 Business rules hard-coded in the UI**
- Height/weight entry is tied to competency IDs 10 and 11 (`assessments.component.ts:997`).
- The level descriptions for all 17 competencies (68 sentences) live in the component and are picked by searching the **English competency name** for words like "expression" (`:1008`). Renaming a competency on the backend, or translating it, silently shows generic text instead.
- Level names disagree: the form saves "Beginning / Advancing", the fallback saves "Beginner / Advanced", and the dashboard also looks for "PSR".

> **⚠️ Partly fixed.** The 68 level descriptions are now translations keyed by competency code (`catalog.competencies.<code>.levels` in `src/i18n/*.json`), and every stored spelling of a level ("Beginner", "PSR", "3", …) is read through one mapping (`parseLevel`). Height and weight are still tied to the gross and fine motor competencies, now by code with IDs 10 and 11 as a backup. The codes come from the English names until the backend sends stable codes (I5).

**A9 🟡 Every child must have two names**
First name and last name are both required (at least 2 letters each), joined into one `name` for
the API, then split back at the first space. Children with a single name can't be registered
without inventing a surname, and names containing `.`, `-` or `'` are rejected.

> **✅ Fixed.** One "Full name" field. It accepts single names, Devanagari and `.` `-` `'`.

**A10 🟡 Missing data is silently replaced with fake values**
`student.service.ts:128` defaults a missing `anganwadi_id` to **1** and a missing date of birth to
**today**, and those values are written back on the next save. `age` is computed on the device and
saved with every edit, so it goes stale.

> **⚠️ Partly fixed.** Missing values stay empty instead of being replaced with fake ones. `age` is still sent on every save because the API expects it, but it is calculated from the date of birth at that moment.

**A11 🟡 The same rules are implemented differently in different places**
- Age is calculated in four different ways.
- Height/weight limits are 30–200 cm and 5–50 kg in the student form, but 0–200 and 0–100 in the assessment.
- Gender is "Boy / Girl / N/A" for children and "male / female / N/A" for users.

> **✅ Fixed.** One age function (`ageOn`) and one set of height and weight limits (`CHILD_LIMITS`), shared by the child form and the assessment. Gender labels are translated; the stored values are unchanged so existing records stay valid.

**A12 ⚪ "Select all" ignores the search filter**
It selects every child, not just the filtered ones, and the filter only matches first names.

> **✅ Fixed.** "Select all" selects only the children shown by the current search and filter, and the search matches full names.

---

## B. Broken or silent flows

**B1 🔴 Errors are swallowed, so the worker gets no feedback**
`showMessage(message, true)` in `assessments.component.ts:940` does nothing for errors. A failed
assessment submission, a failed student load, a missing Anganwadi ID or an invalid height/weight
all end with the worker tapping **Submit** and nothing happening. Create/update student and create
Anganwadi have the same problem: the comment says "error toast is already handled in the service",
but no service shows one.

> **✅ Fixed.** Every failure shows a message: a translated toast, an inline error, or an error panel with Retry. Field errors from the server appear on the matching field.

**B2 🟠 A wrong password reloads the whole page after 2 seconds**
The login error goes to `ErrorHandlerService`, which treats any 401 as an expired session and runs
`window.location.href = '/login?expired=true'` after 2 seconds
(`src/app/core/error/error-handler.service.ts:113`, `:229`). This assumes the backend answers 401
for bad credentials, which the app's own error messages expect.

> **✅ Fixed.** A wrong password shows an inline "email or password is incorrect" message, whether the server answers 401 or 422. The sign-out handler ignores the login request, so nothing reloads.

**B3 🟠 The Home page can't be opened while logged out** — *verified*
The `UserService` constructor calls `logout()`, which navigates to `/login`
(`src/app/services/user.service.ts:83`, `:140`). Any URL opened while logged out, including
`/home` and `/unauthorized`, ends up on the login page.

> **✅ Fixed.** Home, Login, Unauthorized and Not found are public, and nothing signs the user out at start-up.

**B4 🟠 F5 / Ctrl+R stops working everywhere after visiting the dashboard** — *verified*
`dashboard.component.ts:1897` adds a page-wide key listener that cancels F5 and Ctrl+R, and never
removes it. After the dashboard has been opened once, those keys are cancelled on every page, and
each visit adds another listener.

> **✅ Fixed.** There are no page-wide key listeners.

**B5 🟠 Clicking Cancel on the user form saves the user**
The Cancel button in `create-edit-user.component.html:240` has no `type="button"`, so it submits
the form (creating or updating the user) before navigating away.

> **✅ Fixed.** Cancel is `type="button"`, and leaving with unsaved changes asks first.

**B6 🟠 Admins and supervisors can't add children**
The student form requires an Anganwadi, but only Anganwadi workers get one filled in; there is no
field to choose it, so **Save** stays disabled for everyone else. Supervisors are listed as allowed
on `/students`, but the permission check sends them to "unauthorized".

> **✅ Fixed.** Admins and supervisors choose the centre in the student form, and supervisors can open Students.

**B7 🟠 Five of the six role dashboards are placeholders**
The admin, state, DPO, CDPO and supervisor dashboards just say "…-dashboard works!". Admins land on
that page right after logging in.

> **⚠️ Partly fixed.** Admins get a real overview page. State, DPO, CDPO and supervisor users get a home page that shows their area and what they can open, but the reports themselves need summary data from the backend.

**B8 🟡 Navigation is inconsistent**
- The navbar shows **Students** and **Domains** to supervisors, CDPOs, DPOs and state officials, who are then sent to "unauthorized".
- Login sends Anganwadi workers to `/select-competency`, but their **Dashboard** link goes to `/aww/dashboard`.
- Routes are duplicated: `/dashboard` and `/aww/dashboard`, and three separate `/assessments` routes.

> **✅ Fixed.** One role configuration (`core/auth/roles.ts`) drives both navigation and guards, so no one sees a link they can't open. There is one route per screen and the old URLs redirect.

**B9 🟡 List loading states are wrong**
The Anganwadi list never stops loading when there are no centres (`forkJoin([])` finishes without a
value). "No users found" / "No centres found" appears at the same time as the loading skeleton.

> **✅ Fixed.** Every list has separate loading, empty, error (with Retry) and loaded states.

**B10 🟡 Login flow quirks**
- After success the service navigates immediately, then the component navigates again after an artificial 1-second delay, so the return URL races.
- "Remember me" does nothing.
- The `?timeout=true` and `?expired=true` flags are never shown to the user.

> **✅ Fixed.** One navigation after login, to a checked return URL. The "Remember me" box (now "Keep me signed in on this device") decides whether the session survives closing the browser, and the login page explains expired and idle sign-outs.

**B11 🟡 Two separate redirects fire for the same expired session**
The interceptor and the error handler both handle a 401 and both redirect; session timeout uses a
full page reload.

> **✅ Fixed.** One interceptor handles 401 and signs out once; there are no full page reloads.

**B12 ⚪ Small leftovers**
- The assessments table has paginator code but no paginator in the template, so it never paginates.
- Noisy toasts: "Student Loaded", "User Loaded", "Level hidden", "All filters cleared successfully!".

> **✅ Fixed.** The dead paginator code and the noisy toasts are gone.

---

## C. Security and privacy

**C1 🔴 The API is called over plain HTTP**
`src/environments/environment.ts:7` (production is identical) uses `http://`. Passwords, login
tokens and children's personal data travel unencrypted, and if the site itself is served over HTTPS
the browser blocks these calls entirely. I couldn't reach the server from here to check whether it
supports HTTPS.

> **🔌 Needs backend.** The API host has to support HTTPS. When it does, change `apiUrl` in `src/environments/environment.prod.ts`; the Content-Security-Policy already allows both. See `docs/SECURITY.md` (S1).

**C2 🔴 An Anganwadi worker's device downloads every child**
`student.service.ts:283` calls `GET /children` and filters by Anganwadi in the browser; the
dashboard does the same. Unless the backend already limits this endpoint, every worker's phone
receives the names, dates of birth, heights and weights of children at **all** centres.
*Fix:* filter on the server (see I2).

> **🔌 Needs backend.** The app still has to call `GET /children` and filter on the device, because the API has no filter. See `docs/SECURITY.md` (S2).

**C3 🟠 Dependencies with known vulnerabilities**
- `swiper` 11 — critical, prototype pollution (GHSA-hmx5-qpq5-p643); fixed in 12.1.2+.
- `xlsx` 0.18.5 — high, prototype pollution and ReDoS; no fixed version is published on npm.
- `echarts` 5 — moderate, XSS; fixed in 6.1.

> **✅ Fixed.** `swiper`, `xlsx` and `echarts` (and PrimeNG and Bootstrap) are removed. `npm audit` reports 0 vulnerabilities.

**C4 🟠 Third-party code loaded without integrity checks**
Bootstrap's JavaScript bundle (which the app doesn't even use), Bootstrap CSS and Font Awesome are
loaded from CDNs with no integrity hashes (`src/index.html:9`, `:12`, `:20`), and there is no
Content-Security-Policy.

> **✅ Fixed.** Nothing loads from a CDN: fonts and icons are bundled. The production build ships a Content-Security-Policy (`src/index.prod.html`), and `docs/DEPLOYMENT.md` has the matching server headers.

**C5 🟡 "Security" code that doesn't protect anything**
- XOR "encryption" with a hard-coded key, currently switched off "for debugging".
- A "CSRF token" generated in the browser.
- Input "sanitising" on the email field.
- A rate limiter that never runs.
- Headers that are never actually sent: `HttpHeaders.set()` returns a new object, and the code throws it away (`security.service.ts:290`, `http.service.ts:266`).

> **✅ Fixed.** None of this code is built any more, and `docs/SECURITY.md` lists the protections that are real. The old files are still in the repository until they are deleted (see the README).

**C6 🟡 The login token and profile are stored three times**
`auth_token`, `user_data` and `appState` in localStorage all hold copies, readable by any injected
script, and logout leaves part of `appState` behind. Role checks happen only in the browser; that's
fine for hiding UI, but the backend must enforce them too.

> **⚠️ Partly fixed.** The token and profile are stored once: in localStorage with "Keep me signed in", otherwise in sessionStorage. Logout, idle time-out, token expiry and signing out in another tab all clear everything. Browser role checks only hide UI, so the backend must enforce roles (SECURITY.md S3). The token stays readable by scripts until the backend moves it to an httpOnly cookie (S6).

**C7 🟡 Weak password rules for new users**
New user passwords only need 6 characters. A strength checker exists in the code but isn't used.

> **✅ Fixed.** New passwords need 8–128 characters with at least one letter and one digit.

**C8 ⚪ Production hides every error**
`src/main.ts:9` silences the console in production with no error reporting to replace it, and
development logs include emails and full request bodies.

> **⚠️ Partly fixed.** The console is no longer silenced, start-up errors are visible, and nothing logs personal data. There is still no remote error reporting.

---

## D. Mobile UX, UI and accessibility

**D1 🟠 The dashboard chart doesn't work in portrait on phones**
It is replaced by a "Rotate your device" message, in an app that's meant to be mobile-first.

> **✅ Fixed.** The dashboard uses horizontal stacked bars that work in portrait from 360 px, with a legend, tooltips and a table view.

**D2 🟠 Tables don't fit on phones**
The student list has 10 columns and scrolls sideways, which puts **Edit** and **Delete** off-screen.
The gross/fine motor assessment table cuts off session results. Phones need a card layout instead.

> **✅ Fixed.** Lists are cards on phones, with the actions always visible. The end-to-end tests check for sideways scrolling at 360, 412 and 1366 px.

**D3 🟠 Assessment level cards are hard to read**
White text sits on pastel colours, e.g. `#FFD657` gives a contrast ratio of 1.4:1, where WCAG
requires 4.5:1. These cards are the core of the assessment screen.

> **✅ Fixed.** Level cards use dark text on light tints, and automated (axe) colour-contrast checks pass on every page tested.

**D4 🟠 Text is too small on phones**
Competency names are about 9 px (`0.55rem`), the details button is `0.65rem`, and dates are 10 px.
Competency descriptions only appear on mouse hover, so touch users never see them.

> **✅ Fixed.** Body text is 16 px, secondary text 14 px, and only small tags, chips and field errors use 12 px (they were 9–10 px). Competency descriptions are always visible, not hover-only.

**D5 🟡 The visual language is inconsistent**
- Four UI kits (Bootstrap, Angular Material, PrimeNG and a custom dropdown) and three icon fonts.
- The orange `#f84525` and indigo `#6366f1` accents are used interchangeably.
- Angular Material is themed azure/blue and PrimeNG is configured blue (`#3B82F6`).
- A leftover Material override gives filled buttons an orange background with red text (`src/styles.scss:11`).
- The unauthorized page uses stock Bootstrap blue and grey.
- The brand font Figtree is loaded, but the page actually renders in Roboto because a later rule overrides it (`styles.scss:210`) — *verified*.

> **✅ Fixed.** One component kit (Angular Material, themed to the palette), one SVG icon set, design tokens, and Figtree actually in use.

**D6 🟡 Accessibility gaps**
- Clickable `<div>`s and links without `href` (competency cards, the Manage menu, Logout, chip remove icons) can't be reached with a keyboard.
- The custom dropdown has no ARIA roles and no keyboard support.
- The level cards nest `<label>` inside `<label>`.
- Alt text is generic ("Details Image"), and every page has the same browser title.
- Touch targets are 16–32 px; the guideline is 44 px.

> **✅ Fixed.** Everything works with a keyboard, focus is managed, every page has its own translated title, and touch targets are at least 44 px. The end-to-end tests run axe WCAG 2.1 AA checks.

**D7 🟡 Loading and feedback are clumsy**
- A full-screen overlay blocks the app on every request and navigation, on top of the skeleton loaders.
- The loading flag is a simple on/off switch, so parallel requests make it flicker.
- Dates are US-style `M/d/yy` in the student list but `dd/mm/yyyy` elsewhere.
- The assessment table shows first names only.
- Age is shown in whole years, which is too coarse for 2–6-year-olds.

> **✅ Fixed.** A thin progress bar replaces the overlay and counts parallel requests. Dates are formatted for the chosen language, names are shown in full, and ages read like "5 y 2 m".

**D8 ⚪ The details page is heavy and repetitive**
- The infographic's text is unreadable on phones.
- The page renders 6 `<video>` elements, all the same 34 MB placeholder file.
- All four checkboxes have to be ticked again every time.

> **✅ Fixed.** The infographic is replaced by translated text, there is one video (re-encoded from 34.8 MB to 2.3 MB) that only downloads when played, and the checklist is remembered on the device.

---

## E. Translation (Hindi) blockers

**E1 🟠 All text is hard-coded in English**
That's roughly 220 strings in templates and 190 in TypeScript (toasts, validation messages, chart
labels), plus the 68 level descriptions.

> **✅ Fixed.** All text is in `src/i18n/en.json` and `hi.json`. A unit test checks that both files have the same keys and placeholders, and `npm run i18n:check` fails when the code uses a key that doesn't exist.

**E2 🟠 The backend stores display text, not codes**
The assessment level is saved as its English label (e.g. "School Ready"), and the dashboard reads
it back by searching for words like "beginner". Translating the labels directly would corrupt the
data. The app needs stable level codes, with the translated label shown only on screen.

> **⚠️ Partly fixed.** The app works with level codes and only shows translated labels; it still saves the English labels the API already stores, so old and new data read the same. The backend should move to codes (I4).

**E3 🟠 Hindi names can't be entered**
The name and home-language fields only accept A–Z, and strip anything else as you type
(`create-edit-student.component.ts:293`). Devanagari input is impossible.

> **✅ Fixed.** Name and language fields accept any script, including Devanagari.

**E4 🟡 Competency data and images depend on English names**
Competency names, descriptions and domain names come from the API in English. Competency image
paths are built from the English name (`src/app/competency.service.ts`), so translated names would
break the images. The home-page dial has its domain names hard-coded.

> **⚠️ Partly fixed.** Images and the Hindi names and descriptions come from a built-in catalogue keyed by competency code, and the home wheel is translated. The codes are derived from the English API names, so if a competency is renamed on the backend the app falls back to the API's text, generic level descriptions and no image, until the backend sends stable codes (I5).

**E5 🟡 Formatting isn't locale-aware**
- Dates and ages are built by hand ("dd/mm/yyyy", "5y 2m") instead of with locale-aware formatting.
- `<html lang="en">` is fixed.
- Figtree has no Devanagari characters, so Hindi needs a fallback font such as Noto Sans Devanagari.

> **✅ Fixed.** Dates and numbers use `Intl` for the chosen language, `<html lang>` follows the language, and Noto Sans Devanagari is bundled for Hindi.

---

## F. Performance

**F1 🟠 The dashboard sends one request per competency (17) on every load and refresh**
See `dashboard.component.ts:785`. A bulk call (`getAllAssessmentsByAnganwadi`) already exists in the
service but isn't used.

> **⚠️ Partly fixed.** The dashboard loads once per centre and sends at most 4 requests at a time, but it is still one request per competency until a bulk endpoint is confirmed (I3).

**F2 🟠 The Anganwadi list makes 3 extra requests per centre**
It looks up the country, state and district separately for each centre, so 100 centres means 300
requests (`anganwadi.service.ts:75`).

> **✅ Fixed.** Location names come from a shared cache: one request per country or state, not three per centre.

**F3 🟡 The dashboard bundle is 1.51 MB (387 kB compressed)**
It imports all of echarts and the Excel library up front. Importing only the chart parts used, and
loading the exporter only when someone clicks Export, would remove most of it.

> **✅ Fixed.** echarts is gone (the chart is plain HTML and CSS) and the Excel library loads only on export. The whole app's first download is about 165 kB compressed.

**F4 🟡 About 19 MB of unused files ship with every build**
- About 19 MB of unused images and audio (listed in the appendix).
- The login background is 2746 × 1322 px.
- The same 34 MB placeholder video is used for every competency.

> **✅ Fixed.** The unused files are deleted, the login picture is cropped and converted to WebP, and the video is 2.3 MB. `public/assets` is 2.7 MB in total.

**F5 🟡 Too many render-blocking stylesheets and fonts**
- Bootstrap CSS is loaded twice: 5.3.0 from a CDN plus 5.3.6 compiled into the app.
- All of Font Awesome is loaded for a single eye icon.
- Material Icons, Roboto and Figtree are also loaded, Figtree via a CSS `@import`.

> **✅ Fixed.** No external stylesheets: fonts are bundled through `@fontsource` and icons are inline SVG.

**F6 🟡 Change detection does a lot of repeated work**
- Templates call functions that recompute on every change detection (the home dial recomputes its geometry three times per segment).
- Dozens of `setTimeout` / `detectChanges()` workarounds.
- No OnPush or signals; the app still runs on zone.js.

> **✅ Fixed.** Zoneless change detection, signals and OnPush everywhere. The wheel geometry is computed once per layout.

**F7 🟡 Event listeners leak**
Window `resize` / `orientationchange` listeners are never removed in the assessments page, the
student/user/Anganwadi lists, the details page and the dashboard. Removal uses a fresh `bind()`, so
it never matches, and the dashboard adds a new listener every time it redraws the chart.

> **✅ Fixed.** Listeners are cleaned up through `DestroyRef`, `takeUntilDestroyed` and a `ResizeObserver` that is disconnected.

**F8 ⚪ Whole lists are downloaded to find one item**
All Anganwadi centres are fetched to find one or filter by sector, even though a
`getCentersBySector` endpoint exists and is unused.

> **⚠️ Partly fixed.** A single centre loads by ID. The user form and the centre picker (admins and supervisors only) still load the full centre list and filter it on the device.

---

## G. Architecture and structure

**G1 🟠 Two components do far too much**
The AWW dashboard is ~1,900 lines and the assessments component ~1,470. Each mixes API calls, data
mapping, business rules, chart setup, export and UI state in one class.

> **✅ Fixed.** Logic lives in small tested modules (`dashboard-model.ts`, `assessment-model.ts`, `dashboard-export.ts`). The largest page class is now about 420 lines, template included.

**G2 🟠 About 2,000 lines of services are unused or nearly unused**
- `HttpService` (395 lines) and `PerformanceService` (300) are never used.
- `AppStateService` (268) only mirrors login state.
- `SecurityService` (392) is mostly the no-op code from C5.
- `ErrorHandlerService` + `UXErrorService` (570) — while the places that need error handling (B1) have none.

> **✅ Fixed.** None of these services are built or imported any more. The old files are still in the repository until they are deleted (see the README).

**G3 🟡 Copy-paste instead of shared code**
- 11 guard classes with near-identical bodies.
- Two interceptor implementations, one of them unused.
- The role → dashboard mapping is duplicated in three places, with different upper/lower-case handling.

> **✅ Fixed.** One `roleGuard` factory, one set of functional interceptors and one role configuration.

**G4 🟡 Folders, names and models are inconsistent**
- `AWW/` vs `admin/` folder naming, and `competency.service.ts` sitting at the app root.
- Two different classes are both called `UserService`.
- Models are duplicated: Anganwadi ×3, Country/State/District ×2, Role ×2, Student ×2, and `LevelDescription` declared twice in one file.

> **✅ Fixed.** The new code lives in `core/`, `shared/`, `layout/` and `features/`, with one model per entity. The old files are still in the repository until they are deleted (see the README).

**G5 🟡 The "lazy-loaded" management sections aren't lazy**
They use `loadChildren: () => ROUTES` with the routes imported eagerly, even though the old notes
say they're lazy.

> **✅ Fixed.** Every page is lazy-loaded with `loadComponent`.

**G6 🟡 Redundant wrappers and dialogs**
- Wrapper components with unused `showSuccess` / `showError` methods, and cards nested inside cards.
- Three identical delete dialogs sharing one selector, plus a logout dialog and an unused generic confirm dialog.

> **✅ Fixed.** One confirm dialog (`openConfirm`) for every confirmation.

**G7 ⚪ Inconsistent TypeScript style**
- Constructor injection mixed with `inject()`.
- `any` used throughout.
- Deprecated `toPromise()`.
- Subscriptions that are never cleaned up.

> **✅ Fixed.** `inject()` everywhere, no `any` and no `toPromise()` in the new code, and subscriptions end with their component. Stricter compiler checks are on (`strictStandalone`, `typeCheckHostBindings`, extended diagnostics as errors).

---

## H. Code quality, dead code, tooling and tests

**H1 🟠 The test suite doesn't compile**
All 17 spec files are stale or default boilerplate, so 0 tests run. Angular 21 now uses Vitest by
default.

> **✅ Fixed.** 173 unit tests (Vitest) and 60 end-to-end runs (Playwright) on three screen sizes in English and Hindi, with accessibility and sideways-scroll checks. `npm test` also runs the translation-key check.

**H2 🟡 Lots of dead code**
- About 300 lines of commented-out features ("VERSION 2 pending assessments", teaching-strategies dialog, remarks dialog).
- A 405-line stylesheet that's never loaded (`create-edit-student` uses `styles: []`).
- About 80% of the home dial's 900-line stylesheet targets elements that don't exist, and its template contains a `<script>` tag.
- An unused `SkeletonLoaderModule`.
- `ErrorHandlerService` injected but never used in 5 components.

> **✅ Fixed.** The new code has no commented-out features, and the old files are excluded from the build and from lint. The old files are still in the repository until they are deleted (see the README).

**H3 🟡 Leftover notes from earlier AI sessions**
Eight markdown files (`SESSION_COMPLETE.md`, `MEMORY_LEAK_FIXES.md`, …) contain outdated or wrong
claims, and the README just says "npm install swiper".

> **✅ Fixed.** The old notes are gone, the README has been rewritten, and `docs/` holds this audit plus `SECURITY.md` and `DEPLOYMENT.md`.

**H4 🟡 No linting, formatting or CI**
- No ESLint or Prettier config, and no CI.
- Development and production environments point at the same server.
- About 40 environment flags are never read, and `apiUrl` and `baseUrl` duplicate each other.

> **⚠️ Partly fixed.** ESLint and Prettier are set up, and each environment file has 4 settings instead of about 40. There is still no CI, and development and production still use the same API server.

**H5 ⚪ Small leftovers**
- `angular.json` points to a `src/favicon.ico` that doesn't exist.
- The size budget is a very loose 4 MB.
- `main.ts:18` calls `inject()` inside a promise `catch`, which throws and hides any real startup error.
- An unused `title` property.
- The graph skeleton uses `Math.random()` in its template, which causes errors in development.
- A debug `console.log` is left in the custom dropdown.

> **✅ Fixed.** The favicon is served from `public/`, the size budget is 720 kB (warning) / 900 kB (error), `main.ts` reports start-up errors, and the other leftovers are gone.

---

## I. Needs the backend

| # | Ask | Status |
|---|---|---|
| 1 | **HTTPS** for `ready.unilearn.org.in` (C1) | 🔌 Still needed before the app can be served over HTTPS |
| 2 | **Limit `GET /children`** to the caller's centre (or district/project for supervisors) (C2) | 🔌 Still needed; children's data reaches every worker's device |
| 3 | **Bulk assessments**: is `/assessments/anganwadi/{id}/all` implemented? It would replace 17 requests (F1) | Unconfirmed; meanwhile the app sends at most 4 at a time |
| 4 | **Level codes** instead of English labels (E2) | Optional; the app already reads `1`–`4` as well as every old label |
| 5 | **Competency `code` / image URL**, ideally with Hindi names and descriptions (E4) | Optional; the app would use it instead of codes derived from English names |
| 6 | **Location names inline** in `/anganwadi-centers` (F2) | Optional; a cache keeps it to one request per country or state |
| 7 | **Batch submit**: one POST for several children (A7) | Optional; the app sends up to 3 at a time and retries only the failures |
| 8 | **Login errors**: 401 or 422 for a wrong password? (B2) | Handled; both are shown as wrong credentials |

The security review added five more server-side items: role checks on every endpoint, security headers, login
throttling, an httpOnly session cookie and server-side validation. See `docs/SECURITY.md` (S3–S7).

---

## J. Plan (done)

This was the plan written before any code changed. All four steps have since been carried out; the
status lines above say what changed for each finding, and the README describes the result.

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

## Appendix — unused files (≈19 MB, now deleted)

`src/assets/audio/instruction1.mp3` (1.1 MB), `src/assets/images/landing.png` (3.4 MB),
`number.jpg` (3.1 MB), `pattern.jpg` (2.7 MB), `class.jpg` (2.2 MB),
`Creative Expression.jpg` (0.9 MB), `read.jpg`, `sharing.jpg`, `vocab.jpg`, `seriation.jpg`,
`listen.jpg`, `Initiative.jpg`, `Task Persistence.jpg`, `fine.jpg`, `gross.jpg`, `interaction.jpg`,
`exp.jpg`, `EW.jpg`, `Imagination.jpg`, `assessment-illustration.svg`, `child.svg`,
`competency.svg`, `logo.svg`.

The images in `images/competencies/` and `images/details/` **were** used: their paths were built
from competency names at runtime. The competency images are now converted to WebP and named by
competency code; the `details/` infographics are replaced by translated text.
