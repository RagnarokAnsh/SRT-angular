# Security audit

Audit of the rebuilt frontend (October 2026), done after the validation review. It covers
what runs in the browser and how the app is built and deployed. The backend couldn't be
reached from the development environment, so server behaviour is listed as things to check,
not as findings.

Severity: 🔴 high · 🟠 medium · 🟡 low.

## Summary

| Area | Status |
| --- | --- |
| Dependencies | `npm audit`: **0 vulnerabilities** (21 when this audit started, including critical and high ones in packages the app shipped). |
| Injected scripts (XSS) | No HTML is built from data; Angular escapes all text. A production Content-Security-Policy allows only the app's own scripts. |
| Sign-in and sessions | Token sent only to the API, expiry and 30-minute idle sign-out enforced, sign-out in one tab signs out all tabs, nothing left behind after sign-out. |
| Redirects | The `returnUrl` after sign-in only accepts paths inside the app. |
| Input | Every field has type, length and character checks (see below). Server-side checks are still required. |
| Transport | 🔴 The API is still plain `http://` (needs the server, see S1). |
| Data exposure | 🔴 `GET /children` returns every centre's students (needs the server, see S2). |

## Fixed in the frontend

1. **Vulnerable and unused packages removed.** `swiper` (critical), `xlsx` (high, unmaintained),
   `echarts` (XSS), PrimeNG, Bootstrap, file-saver and zone.js are gone. Excel export now uses
   `write-excel-file`, loaded only when someone exports. Vitest was upgraded to 4.1.11 and the
   remaining transitive advisories were fixed with `npm audit fix`.
2. **No third-party code at runtime.** Fonts and icons are bundled; the CDN links for
   Bootstrap, Font Awesome and Google Fonts are removed. Nothing is loaded from other sites.
3. **Content-Security-Policy** (production and demo builds, `src/index.prod.html`): scripts,
   styles, fonts and media only from the site itself, API calls only to the backend, no plugins,
   no `<base>` hijacking, forms only post to the site. Critical-CSS inlining is turned off
   because it relies on an inline event handler the policy forbids. Checked in a browser: every
   flow, including the Excel export, works with the policy enforced and no violations.
4. **No unsafe DOM APIs.** The only `bypassSecurityTrustHtml` registers the app's own icon set
   from constants. User data is always rendered as text, including inside translations.
5. **Token handling.**
   - The `Authorization` header is added only to requests for the API's own origin and path,
     and look-alike hosts (`api.test/api.evil.example`) are rejected (tested).
   - Expired tokens are never restored; the session ends when the token expires, after
     30 minutes without activity, or on any 401 from the API.
   - "Keep me signed in" off → the session lives in `sessionStorage` and ends with the browser.
   - Sign-out clears storage, the old duplicate `appState` copy and in-memory caches.
6. **Open redirects closed.** `?returnUrl=` must be an in-app path; `//host`, `/\host`,
   `javascript:`, absolute URLs, control characters and the login page itself are refused (tested).
7. **Errors.** Server messages are shown only for 4xx responses and are truncated; 5xx details
   (e.g. SQL errors) are never shown. Nothing sensitive is written to the console.
8. **Old "security" code removed.** The XOR "encryption", browser-generated "CSRF token",
   unused rate limiter and headers that were never sent (audit C5) are no longer part of the app.
9. **Demo mode can't leak into production.** The in-browser demo backend is only included by the
   `mock`/`demo` builds (file replacement); the production bundle was checked and contains none of it.
10. **Excel export.** Every exported value is written as a text or number cell, never as a
    formula, so names like `=HYPERLINK(...)` can't run anything when the file is opened.
11. **Admins can't lock themselves out**: they can't delete their own account or change their own role.
12. **Addresses with invalid ids** (`/students/abc/edit`) show "not found" without calling the API.

## Validation (after the review)

Client-side checks keep data clean and give clear messages; the server must repeat them.

| Form | Field | Rules |
| --- | --- | --- |
| Sign in | Email | required, `name@domain.tld`, ≤ 254, trimmed |
| | Password | required, ≤ 128 |
| Child | Name | required, 2–100 characters, letters of any script plus space `. ' -` |
| | Date of birth | required, real date, not in the future, age 2–6 for new children (not re-checked for older children whose date didn't change) |
| | Gender | one of Boy / Girl / N/A |
| | Home language | required, ≤ 30, letters of any script and spaces |
| | Symbol | required, ≤ 20, no control characters |
| | Height / weight | required, 30–200 cm / 5–50 kg, up to 2 decimals, no signs or exponents |
| | Centre | workers: their own centre only; others: chosen from the list |
| | — | warns before adding a second child with the same name and date of birth |
| Assessment | Students | at least one, each with a session left (max 4) |
| | Level | required, one of the four levels |
| | Height / weight | (gross/fine motor) required for each child, same ranges as above |
| | Remarks | optional, ≤ 500, no control characters |
| User | Name | required, 2–100, letters of any script plus space `. ' -` |
| | Email | required, valid, ≤ 254, saved in lower case |
| | Password | new users: required, ≥ 8 with a letter and a digit (was ≥ 6, any); edit: empty keeps the old one |
| | Role, gender | required, from the list |
| | Location | exactly the levels the role needs (state official → state, …, worker → sector + centre) |
| Centre | Name | required, 2–100, no control characters |
| | Code | required, ≤ 30, letters, digits and `- _ /`, saved in capitals |
| | Location | country, state, district, project and sector all required |

Server validation errors (HTTP 422) are shown next to the matching fields.

## Needs the server or hosting

**S1 🔴 HTTPS for the API.** `http://ready.unilearn.org.in` sends passwords, tokens and
children's data unencrypted, and browsers block it completely if the app is served over HTTPS.
Enable HTTPS on the API, change `apiUrl` in `src/environments/environment.prod.ts`, and remove
the `http://` entry from `connect-src` in `src/index.prod.html`.

**S2 🔴 Limit `GET /children`.** It returns every centre's children; the app filters in the
browser, but the data still reaches every worker's phone. The server should return only the
children the signed-in user may see.

**S3 🔴 Enforce roles on the server.** The app hides pages by role, but only the server can
stop a worker from calling `/users` or editing another centre's children directly. Every
endpoint should check the role and the user's centre/area.

**S4 🟠 Security headers.** A `<meta>` tag can't set everything. Configure the web server to
send the headers in [DEPLOYMENT.md](DEPLOYMENT.md): `frame-ancestors 'none'` (clickjacking),
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS once HTTPS works.

**S5 🟠 Sign-in throttling.** Limit login attempts per account and IP (Laravel's `throttle`
middleware). The app already shows a clear message for HTTP 429.

**S6 🟡 Token lifetime and storage.** Keep JWT lifetimes short (the app signs users out when
`exp` passes) and consider moving to an HttpOnly, Secure, SameSite cookie, which scripts can't read.

**S7 🟡 Server-side validation.** Repeat the rules above on the server, including uniqueness
of emails and centre codes, and one assessment per child, competency and session.

## How to check

```bash
npm audit                      # dependencies
npm run build                  # production build with the CSP (dist/sri/browser/index.html)
npm run build:demo             # same build with the demo backend, for trying it out
npm test                       # includes token, redirect and validation tests
```
