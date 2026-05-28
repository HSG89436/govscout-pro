# GovScout.pro GitHub Issues — Authoritative Record
**GitHub Execution Director | Generated: 2026-05-28**
**Repository: HSG89436/govscout-pro**

All issues below must exist in GitHub. This document is the source record and template.
Copy each issue block directly into GitHub Issues when creating/updating.

---

## ISSUE #1 — P0 SECURITY BLOCKER
**Title:** `[BLOCKER] Rotate exposed QA subscriber credential + sanitize all artifacts`
**Labels:** `p0`, `security`, `launch-blocker`
**Milestone:** MVP Launch
**Branch when worked:** `hotfix/1-rotate-qa-credential`
**State:** OPEN — BLOCKS ALL LAUNCH ACTIVITY

### Problem Summary
A QA test subscriber account was created in migration `0012_qa_test_subscriber` with credentials documented in plain text across multiple repository files. The email `qa-subscriber@govscout.pro` and password `GovScout_QA_2026!` appear in:
- `tasks/QA_SCENARIOS.md` (line 14)
- `reports/engineering_report.md` (line 64)
- `reports/executive_report.md` (references)

These files are committed to a GitHub repository. Any person with repository access can read these credentials and access the live production system at subscription-level privileges.

### Severity
**P0 — Active production security exposure. Blocks ALL launch activity.**

### Expected Behavior
QA test credentials exist only in secure secrets management (Netlify environment variables or equivalent). No credential appears in any committed file in plain text.

### Actual Behavior
Plain-text credentials committed to repository files. Login accessible on production govscout.pro.

### Reproduction Steps
1. Open `tasks/QA_SCENARIOS.md` in GitHub
2. Read line 14
3. Navigate to govscout.pro → Login
4. Use credentials found in step 2
5. Gain subscriber-level access to production system

### Assigned Owner
Security / Engineering Director

### Acceptance Criteria
- [ ] `qa-subscriber@govscout.pro` password rotated via secure mechanism (NOT committed to any file)
- [ ] All repository files searched and sanitized — no plain-text password appears in any `.md`, `.txt`, `.js`, or `.html` file
- [ ] New QA credential stored only as Netlify environment variable
- [ ] `tasks/QA_SCENARIOS.md` updated to reference `$QA_SUBSCRIBER_PASSWORD` (env var reference only)
- [ ] Git history reviewed — if credential appeared in prior commits, note in issue (history rewrite requires Engineering Director authorization)
- [ ] QA Director confirms sanitization complete
- [ ] Issue closed only after QA Director comment: "CREDENTIAL ROTATION VERIFIED"

### Rollback Risk
None — rotating a password is non-destructive. The account itself (`qa-subscriber@govscout.pro`) should be preserved for testing.

---

## ISSUE #2 — P1 RELEASE BLOCKER
**Title:** `[BLOCKER] Deploy accepted repairs + run full production retest gate`
**Labels:** `p1`, `release`, `launch-blocker`
**Milestone:** MVP Launch
**Branch when worked:** `fix/2-production-retest-baseline`
**State:** OPEN — BLOCKS LAUNCH APPROVAL

### Problem Summary
The v6.1 defect repairs (GS-V61-001 through GS-V61-005) were implemented in code and deployed to production (Deploy ID: `6a16433de765429a99ea1d8e`). However, the authoritative GitHub repository has not been confirmed as the baseline for this deployment. GitHub HEAD and the deployed artifact have not been formally reconciled. No production retest has been executed with source-controlled evidence.

### Severity
**P1 — Blocks launch approval. Required before any paid AppSumo or public release.**

### Expected Behavior
GitHub `main` branch HEAD exactly matches the deployed Netlify artifact. A QA Director-signed retest confirms all M-01 through M-06 acceptance scenarios pass in production.

### Actual Behavior
- GitHub repo does not have all current files pushed (pending owner action per `tasks/GIT_PUSH_INSTRUCTIONS.md`)
- QA acceptance matrix (M-01–M-06) has not been executed
- No QA Director sign-off on record

### Assigned Owner
Release Management / QA Director

### Acceptance Criteria
- [ ] All local files pushed to GitHub via steps in `tasks/GIT_PUSH_INSTRUCTIONS.md`
- [ ] `git log --oneline -5` output posted in this issue confirming push
- [ ] M-01 through M-06 executed against production (private browser, qa-subscriber account AFTER Issue #1 rotation)
- [ ] Screenshots attached for each M-0x scenario as evidence
- [ ] Security regression S-01 through S-05 passed
- [ ] No 5xx errors in Netlify function logs during retest window
- [ ] `engineering_report.md` updated: `Committed to GitHub: ✅ YES — commit hash [hash]`
- [ ] QA Director comment: "M-01 PASS, M-02 PASS, M-03 PASS, M-04 PASS, M-05 PASS, M-06 PASS. ISSUE #2 VERIFIED."

### Dependencies
- Issue #1 must be closed first (need rotated QA credentials to run M-01–M-06)

---

## ISSUE #3 — P1 BILLING BLOCKER
**Title:** `[BLOCKER] Register PayPal webhook + complete entitlement lifecycle sandbox test`
**Labels:** `p1`, `billing`, `launch-blocker`
**Milestone:** MVP Launch
**Branch when worked:** `fix/3-paypal-webhook-registration`
**State:** OPEN — BLOCKS PAID SUBSCRIPTIONS

### Problem Summary
The PayPal webhook handler (`netlify/functions/paypal-webhook.js`) was implemented in v6.1, but the webhook endpoint has not been registered in the PayPal Developer Dashboard. The `PAYPAL_WEBHOOK_ID` environment variable is not set in Netlify. Without this, all subscription lifecycle events (cancellations, expirations, suspensions) fail closed with a 503 error and no DB state update occurs. Paid users who cancel through PayPal would retain access indefinitely.

### Severity
**P1 — Revenue integrity risk. Any paid subscriber can cancel through PayPal and retain unlimited access.**

### Affected Files
- `netlify/functions/paypal-webhook.js` — handler code (complete, unregistered)
- `netlify/functions/verify-subscription.js` — subscription state checks
- `netlify/functions/customer-portal.js` — portal access
- Netlify environment variables — `PAYPAL_WEBHOOK_ID` missing

### Expected Behavior
PayPal fires lifecycle events → GovScout webhook receives them → DB subscription_status updates → access revokes correctly.

### Actual Behavior
`PAYPAL_WEBHOOK_ID` not set → webhook verification fails → all incoming PayPal events rejected → DB never updated → access never revoked on cancellation.

### Steps to Fix
1. Log into PayPal Developer Dashboard at developer.paypal.com
2. Navigate to My Apps & Credentials → your app
3. Register webhook URL: `https://govscout.pro/.netlify/functions/paypal-webhook`
4. Subscribe to events: `BILLING.SUBSCRIPTION.CREATED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.SUSPENDED`, `PAYMENT.SALE.COMPLETED`
5. Copy the generated Webhook ID
6. Set `PAYPAL_WEBHOOK_ID` in Netlify → Site configuration → Environment variables
7. Run sandbox lifecycle matrix (see acceptance criteria)

### Acceptance Criteria
- [ ] Webhook URL registered in PayPal Developer Dashboard (screenshot in this issue)
- [ ] `PAYPAL_WEBHOOK_ID` set in Netlify environment (redacted screenshot confirming variable exists)
- [ ] Sandbox lifecycle matrix executed:
  - [ ] CREATED → `subscription_status = 'pending'`, access blocked
  - [ ] ACTIVATED → `subscription_status = 'active'`, access granted
  - [ ] CANCELLED → `subscription_status = 'cancelled'`, access revoked within 60s
  - [ ] EXPIRED → `subscription_status = 'expired'`, access revoked
- [ ] Paid access confirmed blocked immediately after cancellation event
- [ ] QA Director comment: "PAYPAL LIFECYCLE MATRIX COMPLETE. ISSUE #3 VERIFIED."

---

## ISSUE #4 — P1 PRODUCT/MARKETING BLOCKER
**Title:** `[BLOCKER] Execute Marcus acceptance matrix + federal rules grounding verification`
**Labels:** `p1`, `marcus-ai`, `product`, `launch-blocker`
**Milestone:** MVP Launch
**Branch when worked:** `fix/4-marcus-acceptance`
**State:** OPEN — BLOCKS MARCUS MARKETING CLAIMS

### Problem Summary
GovScout.pro markets Marcus as an expert AI federal contracting consultant. No formal acceptance test has been executed to verify Marcus behaves correctly. Two open Marcus baseline findings remain unresolved: MB-005 (no behavioral test suite) and MB-007 (federal rule accuracy not validated against official sources). Making marketing claims about Marcus expertise before verification creates false advertising and user trust risk.

### Severity
**P1 — Blocks all marketing claims about Marcus capability. AppSumo reviews will expose weakness immediately.**

### Assigned Owner
Product / QA Director

### Dependencies
- Issue #1 must be closed (need rotated QA credentials)

### Acceptance Criteria
- [ ] M-01 through M-06 executed after Issue #1 credential rotation
- [ ] Marcus behavioral scenarios MB-B01 through MB-B09 documented in `tasks/QA_SCENARIOS.md` and at least MB-B01, MB-B02, MB-B03, MB-B06 executed
- [ ] Federal rules spot check:
  - [ ] SDVOSB certification → Marcus references SBA VetCert (vetcert.sba.gov) only, NOT VA/CVE
  - [ ] Size standards → Marcus states size standard and directs to SBA table, does not fabricate
  - [ ] FAR citation → Marcus provides regulation section accurately or acknowledges uncertainty
- [ ] No prompt injection vulnerability (MB-B04 passed)
- [ ] No system prompt leak (MB-B06 passed)
- [ ] Rate limit enforced (MB-B07 — 41st request returns 429)
- [ ] `prompts/PROMPT_CHANGELOG.md` updated with test results
- [ ] QA Director comment: "MARCUS ACCEPTANCE MATRIX COMPLETE. FEDERAL GROUNDING VERIFIED. ISSUE #4 VERIFIED."

---

## ISSUE #5 — P1 DEPLOYMENT
**Title:** `[DEPLOY] Push all repository files to GitHub — establish authoritative baseline`
**Labels:** `p1`, `infrastructure`, `launch-blocker`
**Milestone:** MVP Launch
**Branch:** main (initial push, not a feature branch)
**State:** OPEN — BLOCKS GITHUB AS SOURCE OF TRUTH

### Problem Summary
The local working folder (`C:\Users\sharr\govscout_build`) is the authoritative working copy but has NOT been pushed to GitHub. The `.git` directory has been initialized and remote origin set, but no files exist in the remote repository. GitHub cannot serve as operational source of truth until the push completes. All engineering work done in this session (architecture docs, prompts, QA scenarios, marcus.html) lives only on the local machine.

### Risk
If the local machine is lost or corrupted before the push, all engineering work from this session is unrecoverable.

### Steps to Execute
See `tasks/GIT_PUSH_INSTRUCTIONS.md` for the full 10-step procedure.

**Quick version (run from Windows PowerShell in `C:\Users\sharr\govscout_build`):**
```powershell
cd C:\Users\sharr\govscout_build
git remote -v
git branch -m main
git add -A
git status
git commit -m "v6.1 baseline + architecture + marcus.html + GitHub Execution Director infrastructure"
git push -u origin main
```

### Acceptance Criteria
- [ ] `git push` completes with no errors
- [ ] GitHub repo at `https://github.com/HSG89436/govscout-pro` shows all files
- [ ] Commit hash posted in this issue
- [ ] `reports/engineering_report.md` updated: `Committed to GitHub: ✅ YES`

---

## ISSUE #6 — P1 NEW FEATURE (DEPLOYMENT REQUIRED)
**Title:** `[FEATURE] Deploy marcus.html — AI adviser profile page`
**Labels:** `p1`, `frontend`, `deploy`
**Milestone:** MVP Launch
**Branch when worked:** `feature/6-marcus-profile-page`
**State:** OPEN — FILE EXISTS LOCALLY, NOT YET DEPLOYED

### Problem Summary
`marcus.html` has been created locally with full Marcus AI character profile, avatar, expertise grid, CASE FILE explanation, GO/TEAM/PASS verdicts, and CTA. The file exists at `C:\Users\sharr\govscout_build\marcus.html` but has not been deployed to production. The page is linked from the nav but the production URL `https://govscout.pro/marcus` returns 404.

### Files Changed
- `marcus.html` — NEW file, 380+ lines, complete standalone page

### Acceptance Criteria
- [ ] `marcus.html` committed and pushed to GitHub (resolved by Issue #5)
- [ ] Netlify deploys include `marcus.html`
- [ ] `https://govscout.pro/marcus` loads without 404
- [ ] Nav link from `index.html` to `marcus.html` works
- [ ] Mobile display acceptable (responsive layout)
- [ ] Status dot shows "Online" correctly
- [ ] CTA button links to correct login/signup URL

---

## ISSUE #7 — P2 TECHNICAL DEBT
**Title:** `[TECH-DEBT] Formalize chat_usage_log migration (0013)`
**Labels:** `p2`, `database`, `tech-debt`
**Milestone:** Phase 2

### Problem Summary
`netlify/functions/chat.js` references a `chat_usage_log` table inline (CREATE TABLE IF NOT EXISTS inside the function). No formal migration exists for this table. On cold-start race conditions, two simultaneous requests could attempt to create the table concurrently, causing silent failures in usage logging.

### Fix
Create `migration_0013_chat_usage_log.sql` with the table definition. Remove inline CREATE TABLE from `chat.js`.

### Acceptance Criteria
- [ ] Migration file created with correct schema
- [ ] `chat.js` updated to remove inline CREATE TABLE
- [ ] `npm test` still passes

---

## ISSUE #8 — P2 TECHNICAL DEBT
**Title:** `[TECH-DEBT] Formalize chat_rate_limits migration (0014)`
**Labels:** `p2`, `database`, `tech-debt`
**Milestone:** Phase 2

### Problem Summary
`chat_rate_limits` table is created inline in `checkRateLimit()` function in `chat.js`. Same race condition risk as Issue #7. Cold starts under load could cause rate limiting to fail open temporarily.

### Acceptance Criteria
- [ ] Migration 0014 created for `chat_rate_limits`
- [ ] `chat.js` `checkRateLimit()` updated to remove inline CREATE TABLE
- [ ] `npm test` still passes

---

## ISSUE #9 — P1 APPSUMO LAUNCH PREP
**Title:** `[APPSUMO] Create AppSumo launch package — pricing tiers, onboarding, feature gating`
**Labels:** `p1`, `appsumo`, `business`
**Milestone:** AppSumo Launch
**State:** OPEN — REQUIRED BEFORE APPSUMO SUBMISSION

### Problem Summary
GovScout.pro is preparing for an AppSumo launch. No AppSumo-specific infrastructure exists: no tiered deal codes, no feature gating by tier, no AppSumo-specific onboarding flow, no refund protection workflow. AppSumo requires specific integration and deal terms. Launching without this structure will cause refund requests and negative reviews.

### Required Work
1. Define AppSumo deal tiers (Tier 1 / 2 / 3 codes and what each unlocks)
2. Implement `deal_code` redemption in `api-auth.js` or new `redeem-deal.js` function
3. Create AppSumo onboarding flow (post-redemption welcome → profile setup → first Marcus search)
4. Add feature gating by tier level
5. Create `appsumo-landing.html` customized for AppSumo users
6. Test complete AppSumo user journey end-to-end

### Dependencies
- Issues #1, #2, #3, #4 must be closed first
- Owner YES/NO decision required: `MVP-PROD-001` (pricing/payment direction)

### Acceptance Criteria
- [ ] At least 3 AppSumo tier codes defined and documented
- [ ] Deal code redemption works on production
- [ ] AppSumo user can access at correct tier level
- [ ] Onboarding flow completes without errors
- [ ] Feature gates enforce correct limits per tier
- [ ] End-to-end QA test documented in `tasks/QA_SCENARIOS.md`

---

## ISSUE STATUS TRACKER

| # | Title | Priority | State | Milestone | Owner |
|---|-------|---------|-------|-----------|-------|
| #1 | Rotate exposed QA credential | **P0** | OPEN | MVP | Security |
| #2 | Deploy baseline + production retest | P1 | OPEN | MVP | Release Mgmt |
| #3 | PayPal webhook registration + lifecycle test | P1 | OPEN | MVP | Billing |
| #4 | Marcus acceptance matrix | P1 | OPEN | MVP | Product/QA |
| #5 | Push all files to GitHub | P1 | OPEN | MVP | Engineering |
| #6 | Deploy marcus.html | P1 | OPEN | MVP | Engineering |
| #7 | Migration 0013 chat_usage_log | P2 | OPEN | Phase 2 | Engineering |
| #8 | Migration 0014 chat_rate_limits | P2 | OPEN | Phase 2 | Engineering |
| #9 | AppSumo launch package | P1 | OPEN | AppSumo | Product |

**Launch gates:** #1 (P0) and #2, #3, #4, #5 (P1) must ALL be VERIFIED CLOSED before any launch activity.

---
*Generated by GitHub Execution Director · 2026-05-28 · GovScout.pro*
*All issues must be created in GitHub at: https://github.com/HSG89436/govscout-pro/issues*
