# Code review of the new app

*October 2026 · branch `claude/hopeful-knuth-pon0mb` (merged into `dev`) · Angular 21.2*

This is a second, full review of the rewritten app, done after the redesign. [AUDIT.md](AUDIT.md)
covers the old app and the upgrade; this document covers the new code.

## How it was done

- **Reading.** Five reviewers each read one area line by line: sign-in and sessions, data from
  the API, forms and lists, the assessment flow, and dashboard, languages and accessibility.
  Every finding was then checked against the code before anything was changed. Where the
  answer depended on the old app, a library or the browser, that was checked too: the old
  app's source, Transloco's source, and a test in Chromium.
- **Access by role.** Every demo account was signed in with a script that opened every page
  and counted the students it could see.
- **Phones.** Every page was opened at 320, 360 and 412 px wide, in English and Hindi,
  signed out and as each role. Pages were measured for sideways scrolling.
- **Tests.** Each fix comes with a unit or end-to-end test where one was practical.

**Severity**

| | Meaning |
|---|---|
| 🔴 Critical | Shows, saves or exposes data for the wrong centre or person, or breaks a core flow |
| 🟠 High | Users notice something broken, or data can be duplicated or lost |
| 🟡 Medium | Confusing or fragile behaviour with a workaround |
| ⚪ Low | Polish, rare edge cases |

## At a glance

| Area | Found | 🔴 | 🟠 | 🟡 | ⚪ | Fixed | Backend | By design / no change |
|---|---|---|---|---|---|---|---|---|
| R. Access by role | 4 | 2 | 1 | – | 1 | 4 | – | – |
| M. Phones and the wheel | 5 | – | 4 | 1 | – | 5 | – | – |
| A. Sign-in and sessions | 12 | 1 | 3 | 6 | 2 | 10 | 1 | 1 |
| S. Assessment flow | 15 | 1 | 2 | 7 | 5 | 14 | – | 1 |
| D. Data from the API | 14 | – | 2 | 3 | 5 | 10 | 1 | 3 |
| F. Forms and lists | 16 | 1 | – | 7 | 8 | 15 | 1 | – |
| B. Dashboard, languages, accessibility | 12 | 1 | 1 | 4 | 5 | 12 | – | – |
| N. Found while fixing | 2 | – | – | 1 | 1 | 2 | – | – |
| **Total, each problem once** | **77** | **6** | **13** | **29** | **27** | **70** | **2** | **5** |

Three problems showed up in two areas (D2 = S4, D5 = F3, B7 = D7). They are listed in both
places but counted once in the total. D3 and D12 were questions to check, not problems, so
they have no severity. "Backend" means only the server can fix it; see
[Needs the backend](#needs-the-backend).

## Who can see what

Checked for every demo account (password `demo1234`) and covered by `e2e/access.spec.ts`.

| Account | Competencies and assessments | Students | Dashboard | Admin pages | Home |
|---|---|---|---|---|---|
| Worker, Shivaji Nagar (`aww@demo.in`) | Own centre | Own centre's 8; another centre's student says "You can't edit this student" | Own centre | No | `/competencies` |
| Worker, Gandhi Colony (`aww2@demo.in`) | Own centre | Own centre's 4 | Own centre | No | `/competencies` |
| Worker with no centre (`aww3@demo.in`) | Can read the competencies; assessing says "Your account isn't linked to a centre" | Same message, nobody listed | Same message | No | `/competencies` |
| Supervisor, Sector 4 (`supervisor@demo.in`) | No | The 8 in their sector; others say "You can't edit this student" | No | No | `/supervisor` |
| CDPO, DPO, State official | No | No | No | No | Their own home page only |
| Admin (`admin@demo.in`) | Any centre (chooses one, can switch) | All 13 | Any centre (chooses one, can switch) | Yes | `/admin` |

Before this review, supervisors saw and could edit every centre's students, and a worker
without a centre saw everyone (R1, R2). The rules now live in one place,
`src/app/core/auth/access.ts`. The API still sends every student to every device; only the
server can stop that (backend item 2).

## Findings

### R. Access by role

| ID | | Problem | Status |
|---|---|---|---|
| R1 | 🔴 | Supervisors saw and could edit the students of every centre, not just their sector. | ✅ Fixed |
| R2 | 🔴 | A worker whose account has no centre saw every centre's students. | ✅ Fixed |
| R3 | 🟠 | After choosing a centre, admins couldn't switch to another one on the dashboard or the assessment page without leaving it. | ✅ Fixed ("Change centre") |
| R4 | ⚪ | The dashboard said "your centre" for an admin's chosen centre when it had no students, and named the Excel file "centre". | ✅ Fixed |

### M. Phones and the readiness wheel

| ID | | Problem | Status |
|---|---|---|---|
| M1 | 🟠 | The admin lists were 348 px wide on a 320 px phone, so the whole page zoomed out. | ✅ Fixed |
| M2 | 🟠 | The signed-out top bar in Hindi was 335 px wide on a 320 px phone. | ✅ Fixed |
| M3 | 🟠 | The end-to-end "no sideways scrolling" check measured the zoomed-out window, so it could never catch M1 or M2. | ✅ Fixed; a 320 px test run was added |
| M4 | 🟡 | Assessment rows were cramped below 420 px; "0 students selected"; the remarks counter wrapped; the dashboard table's first column scrolled away; some toggles were under 44 px. | ✅ Fixed |
| M5 | 🟠 | Wheel labels were tilted and small on phones, and labels on dimmed segments were unreadable. | ✅ Fixed (upright labels, sized to fit) |

### A. Sign-in and sessions

| ID | | Problem | Status |
|---|---|---|---|
| A1 | 🟠 | Each tab had its own idle timer, so an idle tab signed out a tab in use. A new sign-in also kept the old idle time and was signed out within a minute. | ✅ Fixed (activity shared between tabs) |
| A2 | 🟠 | Another tab signing in as someone else wasn't handled. A tab reacting to another tab could also delete that tab's brand-new session. | ✅ Fixed (a tab only ever removes its own session) |
| A3 | 🟠 | A phone whose clock was hours fast couldn't sign in, because every token looked expired. | ✅ Fixed (expiry judged by the server's clock) |
| A4 | 🟡 | A forced sign-out (expired or idle) could be stopped by the "unsaved changes" prompt. | ✅ Fixed |
| A5 | 🔴 | The API is plain HTTP, so passwords and students' data travel unencrypted. | 🔌 Backend (item 1) |
| A6 | 🟡 | A late "401" for a request sent before signing in again ended the new session. | ✅ Fixed |
| A7 | 🟡 | A save that timed out could be sent again and stored twice. | ✅ Assessments: fixed (S4). Students: the duplicate check asks first. Users and centres: the server rejects repeated emails and codes. |
| A8 | 🟡 | Other client errors (400, 405, 413) offered "Try again", and a 404 showed the server's internal message. | ✅ Fixed |
| A9 | ⚪ | Tokens valid for more than about 25 days ended early. | ✅ Fixed |
| A10 | 🟡 | The user from the login answer and the stored user were checked differently (ids as strings, roles as plain names). | ✅ Fixed |
| A11 | 🟡 | After an expired session, whoever signed in next was sent to the previous user's page. | ✅ Fixed |
| A12 | ⚪ | A user with several roles gets the access of the highest one. | ➖ By design |

### S. Assessment flow

| ID | | Problem | Status |
|---|---|---|---|
| S1 | 🟠 | Leaving the page while results were saving wasn't guarded, and the requests were cancelled silently. | ✅ Fixed |
| S2 | 🔴 | While a new centre or competency loaded, the previous one's students were shown and could be chosen and saved under the new one. | ✅ Fixed |
| S3 | 🟡 | A failed refresh after saving replaced the list of failed results with an error page. | ✅ Fixed |
| S4 | 🟠 | Trying again after a timeout could save the same session twice. | ✅ Fixed (reloads, drops what was stored, retries the rest) |
| S5 | 🟡 | Focus was lost when moving between steps or removing a student. | ✅ Fixed |
| S6 | 🟡 | Step 2 could still be changed while saving. | ✅ Fixed |
| S7 | ⚪ | Saving was possible with nobody chosen. | ✅ Fixed |
| S8 | 🟡 | Height and weight fields were missing if the competency loaded after the students. | ✅ Fixed |
| S9 | 🟡 | Changing centre threw away the selection without asking; the centre picker was blank when there were no centres. | ✅ Fixed |
| S10 | ⚪ | Confirmation dialogs didn't focus their main button. | ✅ Fixed |
| S11 | ⚪ | The "leave this page?" warning didn't show in some browsers. | ✅ Fixed |
| S12 | ⚪ | The date shown and saved could be yesterday's if the page stayed open past midnight. | ✅ Fixed |
| S13 | 🟡 | A competency's checklist was only saved once every item was ticked. | ✅ Fixed |
| S14 | 🟡 | Heights and weights typed with Hindi (Devanagari) digits were rejected. | ✅ Fixed |
| S15 | ⚪ | The competency videos have no captions. | ➖ Needs caption files from the content team |

### D. Data from the API

| ID | | Problem | Status |
|---|---|---|---|
| D1 | ⚪ | A date of birth sent as a timestamp with a time zone could show a day early. | ✅ Fixed (rounded to the nearest day) |
| D2 | – | Same as S4. | ✅ Fixed |
| D3 | – | Is a session with an observation but no date "done"? | ➖ No change: matches the old app |
| D4 | 🟠 | Ids sent as strings (some PHP set-ups do this) stopped results matching their students, so a session could be recorded twice. | ✅ Fixed (read as numbers everywhere) |
| D5 | – | Same as F3. | 🔌 Backend |
| D6 | 🟡 | The Excel summary left out "other" results, so rows didn't add up. Control characters in a name could make the file unreadable. | ✅ Fixed |
| D7 | ⚪ | Excel file names mangled Hindi centre names. | ✅ Fixed |
| D8 | 🟡 | An unexpected 200 answer showed as an empty list, and `status: false` counted as a successful save. | ✅ Fixed (shows an error instead) |
| D9 | 🟡 | Blank numbers were read as 0, and the old app's "0 cm / 0 kg" showed as real measurements. | ✅ Fixed |
| D10 | ⚪ | A text field of the wrong type could break a whole list. | ✅ Fixed |
| D11 | ⚪ | A stored level such as "constructor" read internal object properties. | ✅ Fixed |
| D12 | – | Is the stored age format ("5y 2m") the old app's? | ➖ No change: it is |
| D13 | ⚪ | The demo backend accepts some things the real API may not. | ➖ Known limit: test against the real API on a staging server before release |
| D14 | 🟠 | A save answered with an empty body was reported as failed, although it had been stored; pressing Save again made a duplicate. | ✅ Fixed |

### F. Forms and lists

| ID | | Problem | Status |
|---|---|---|---|
| F1 | 🔴 | Changing a worker's district, project or sector kept the old centre (no longer shown, but still saved), so a worker could be linked to a centre outside their sector. | ✅ Fixed |
| F2 | 🟡 | Going straight from one user's form to another's kept the first user's details. | ✅ Fixed |
| F3 | 🟡 | When a user's role changes, location fields that no longer apply are not sent, so the server keeps the old ones. The old app did the same. | 🔌 Backend (item 4) |
| F4 | 🟡 | Leaving a form while it was saving lost the changes without a warning. | ✅ Fixed |
| F5 | 🟡 | A long name widened the students page on phones. | ✅ Fixed |
| F6 | 🟡 | Server messages for fields not on screen (such as a worker's own centre) were lost, and a message from the previous try blocked the next one. | ✅ Fixed |
| F7 | ⚪ | After a server error, focus went nowhere. | ✅ Fixed |
| F8 | ⚪ | An error about the age wasn't shown on the date of birth, and the server's English summary appeared next to the field messages. | ✅ Fixed |
| F9 | ⚪ | The centre filter stayed on a centre that was no longer in the list. | ✅ Fixed |
| F10 | 🟡 | Deleting two rows at once confused the buttons; a row someone else had already deleted showed an error and stayed. | ✅ Fixed |
| F11 | 🟡 | Older records saying "boy" or "Male" lost their gender when edited. | ✅ Fixed. Values the new rules reject (e.g. three decimals) must be corrected when the record is edited; the field says what is wrong. |
| F12 | ⚪ | A location list that failed to load kept its error after loading; a slow retry could replace a newer list. | ✅ Fixed |
| F13 | ⚪ | Editing a colleague's student recorded it as the editor's. | ✅ Fixed |
| F14 | ⚪ | Hindi names typed with different keyboards didn't match; search failed with double spaces; the duplicate check didn't run when editing. | ✅ Fixed |
| F15 | ⚪ | Names with zero-width joiners (used by Hindi and Marathi keyboards) were rejected. | ✅ Fixed |
| F16 | ⚪ | Centre place names were missing when no centre had a state. | ✅ Fixed |

### B. Dashboard, languages and accessibility

| ID | | Problem | Status |
|---|---|---|---|
| B1 | 🔴 | While a new centre loaded, the dashboard showed, and could export, the previous centre's figures under the new centre's name. | ✅ Fixed |
| B2 | 🟡 | Results stored with a value that isn't a level were counted as "not assessed" in the table and list, but as assessed elsewhere. | ✅ Fixed (own legend entry, column and group) |
| B3 | 🟡 | After a language failed to download, "Try again" could never work: Chromium keeps the failed download for the rest of the page's life (checked with a test). | ✅ Fixed (says so, with a Reload button) |
| B4 | 🟡 | If Hindi failed to load at start, the page was labelled Hindi but showed English. | ✅ Fixed (switches to English) |
| B5 | 🟠 | `npm run build:mock` wrote the demo app, with its fake backend, into the production folder `dist/sri`. | ✅ Fixed (`dist/mock`) |
| B6 | ⚪ | Choosing a language while another was loading could end in the first one. | ✅ Fixed |
| B7 | – | Same as D7. | ✅ Fixed |
| B8 | ⚪ | The order of the browser's languages was ignored (English-first browsers got Hindi). | ✅ Fixed |
| B9 | ⚪ | "1 boys · 1 girls". | ✅ Fixed |
| B10 | 🟡 | Screen readers: links to panels that didn't exist yet, buttons announced as "pressed" while their label already changed, and caps lock not announced. | ✅ Fixed. The chart's hover tooltips stay hover-only; the same numbers are in the table view. |
| B11 | ⚪ | The wheel flashed the phone layout on desktops. | ✅ Fixed |
| B12 | ⚪ | Previous / Next on the home page moved focus away from the button. | ✅ Fixed |

### N. Found while fixing

| ID | | Problem | Status |
|---|---|---|---|
| N1 | 🟡 | After a failed sign-in, the cleared password showed "This field is required." under "The email or password is incorrect.". | ✅ Fixed |
| N2 | ⚪ | The README said the Excel export had unit tests; it had none. | ✅ Tests added |

## Needs the backend

1. **HTTPS for the API** (A5, and S1 in [SECURITY.md](SECURITY.md)).
2. **Send each user only the students they may see.** `GET /children` returns every centre's
   students. The app hides them, but they still reach every phone.
3. **Check roles on every endpoint** ([SECURITY.md](SECURITY.md), S3).
4. **Clear location fields that no longer apply when a user's role changes** (F3). The app
   sends the same fields as the old app. If the server accepts `null`, the app can send it
   instead; this needs confirming first, because a validation rule could reject it.
5. **Dates of birth saved a day early by the old app** ([AUDIT.md](AUDIT.md), A1). New
   records are right, but old ones can only be found and corrected in the database.
6. **One result per student, competency and session.** The app no longer sends a session
   twice, but only the server can guarantee it.

## Tests

| | Count | New in this review |
|---|---|---|
| Unit tests (Vitest) | 262 in 34 files | Sessions and tabs, clock skew, API parsing, the Excel export, the language service, form error handling, deletes, location fields |
| End-to-end (Playwright) | 171 runs: 53 tests each on a 360 px phone, a Pixel 7 and a desktop, plus 12 layout checks at 320 px | Access by role, 320 px layout, several tabs, moving a worker to another sector, failed saves and retrying |

Run them with `npm test` and `npm run e2e` (see the README).

## Still to do

- **Have a Hindi speaker check the new text.** "Students" is विद्यार्थी. This review added
  messages for a failed language download, an already-deleted record, a duplicate found
  while editing, and server-rejected details.
- **The backend items above.**
