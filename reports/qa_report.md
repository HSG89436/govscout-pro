# GovScout.pro Production QA Inspection Report

**Inspection date:** 2026-05-27 (America/Los_Angeles)  
**Inspector:** QA Inspector / Codex  
**Target:** [https://govscout.pro](https://govscout.pro)  
**Current Netlify deploy:** `6a16433de765429a99ea1d8e` (`fedscout`)  
**Issue tracker:** [HSG89436/govscout-pro](https://github.com/HSG89436/govscout-pro)

## Verdict: FAIL - DO NOT LAUNCH

The deployed product is not launchable. Paid subscribers cannot complete the visible
sign-in flow, the authentication API discloses whether an email is registered, and
same-deploy authenticated evidence records failures in two advertised paid workflows.

## Findings

| ID | Severity | Finding | Evidence | GitHub Issue |
| --- | --- | --- | --- | --- |
| GS-QA-001 | Critical / P0 | Production sign-in is blocked by JavaScript runtime failure. | On `/app`, submit an email after selecting `SIGN IN`; the modal remains at `Checking your account...` and the console logs `ReferenceError: t is not defined` from `handleEmailSubmit` (`/app:573:45`). | [#5](https://github.com/HSG89436/govscout-pro/issues/5) |
| GS-QA-002 | Critical / P0 | Login endpoint leaks account existence through response punctuation. | Known `qa-subscriber@govscout.pro` plus invalid password returns `{"error":"Invalid email or password."}`; nonexistent email plus the same invalid password returns `{"error":"Invalid email or password"}`. Both are HTTP `401`, but bodies differ. | [#6](https://github.com/HSG89436/govscout-pro/issues/6) |
| GS-QA-003 | High / P1 | App lacks baseline browser security policies and is frameable. | GET responses for `/` and `/app` include HSTS but omit CSP, anti-framing policy, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`; `/app` has no policy meta fallback. | [#7](https://github.com/HSG89436/govscout-pro/issues/7) |
| GS-QA-004 | Medium / P2 | Spanish landing state contains untranslated primary conversion copy. | Rendered page reports `lang="es"` and shows Spanish hero copy while displaying `Get Started - $9/mo`, `See Pricing`, and English feature/release text on the same first screen. | [#8](https://github.com/HSG89436/govscout-pro/issues/8) |
| GS-QA-005 | Medium / P2 | Auth/subscription gate is not a semantic modal and exposes background controls to assistive technology. | While the full-screen gate is visible, the accessibility DOM includes background app buttons and the Marcus input; shipped `#auth-gate` lacks `role="dialog"` / `aria-modal` and does not inert or hide the app underneath. | [#9](https://github.com/HSG89436/govscout-pro/issues/9) |
| GS-QA-006 | High / P1 | Authenticated SAM.gov search failed with `502` on the current deploy. | Same-deploy authenticated QA evidence dated 2026-05-26 records `GET /api/samgov?naics=541690&days=120&limit=3` returning `502` with `SAM.gov HTTP 404`. Fresh authenticated retest is blocked by GS-QA-001. | [#10](https://github.com/HSG89436/govscout-pro/issues/10) |
| GS-QA-007 | High / P1 | Alert test-email path failed with `502` and returned an internal stack trace on the current deploy. | Same-deploy authenticated QA evidence dated 2026-05-26 records `TypeError: sql(...).catch is not a function` and function trace leakage from `alert-subscribe.js`. Fresh authenticated retest is blocked by GS-QA-001. | [#11](https://github.com/HSG89436/govscout-pro/issues/11) |

## Launch Blockers

1. Fix and production-verify the sign-in flow in issue #5.
2. Close the authentication enumeration regression in issue #6 before any customer traffic.
3. Retest paid authenticated workflows after sign-in is repaired, with explicit green evidence for issues #10 and #11.
4. Ship anti-framing and baseline browser security policies from issue #7 before launch.

## Tests Executed

| Area | Check | Result |
| --- | --- | --- |
| Deployment | Identified production Netlify target and active deploy ID. | Pass |
| Landing UI | Loaded production landing page and inspected rendered desktop/mobile first screen. | Fail: GS-QA-004 |
| Application gate | Loaded `/app`; inspected sign-in and subscription overlay. | Fail: GS-QA-001, GS-QA-005 |
| Console errors | Collected browser errors while submitting sign-in email. | Fail: `ReferenceError: t is not defined` |
| Auth security | Compared invalid-password responses for known versus nonexistent emails. | Fail: GS-QA-002 |
| Unauthenticated API enforcement | Probed `/api/me`, `/api/profile`, `/api/samgov`, `/api/chat`, `/.netlify/functions/chat`, and alert test-email without a token. | Pass: returned `401` where authentication is required |
| Security headers | Inspected headers and HTML policy fallback on `/` and `/app`. | Fail: GS-QA-003 |
| Links | Requested public same-origin navigation/content URLs from landing, blog, and resources pages, including PDF ebook links. | Pass: sampled targets returned `200` |
| Mobile responsiveness | Rendered landing page and `/app` gate at phone width (`390 x 844`) and checked horizontal document overflow. | Pass for overflow; UI defects remain above |
| Authenticated paid APIs | Reviewed recorded authenticated evidence for the same still-current deploy. | Fail: GS-QA-006, GS-QA-007; fresh run blocked by GS-QA-001 |

## Tested Public URLs Returning HTTP 200

The sampled link pass covered `/`, `/app`, `/blog`, `/resources`, `/privacy`,
`/terms`, `/roadmap`, linked blog articles, certification pages (`/sdvosb`,
`/8a-certification`, `/hubzone`, `/wosb`), and both linked ebook PDFs.

## Limitations

- An end-to-end authenticated UI session could not be freshly completed because the
  production sign-in control crashes before password entry.
- Findings GS-QA-006 and GS-QA-007 rely on authenticated production evidence captured
  on 2026-05-26 against deploy `6a16433de765429a99ea1d8e`; Netlify identifies that
  exact deploy as current during this inspection.

## Required Retest Gate

No approval should be issued until all Critical and High findings are fixed in
production and a fresh authenticated smoke pass demonstrates: successful sign-in,
non-enumerating auth failure responses, successful contract retrieval, successful
test-alert execution without trace disclosure, and active browser security headers.
