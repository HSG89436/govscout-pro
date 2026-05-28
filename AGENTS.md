# GovScout.pro Agent Operating Guide
**GitHub Execution Director Standard | Updated: 2026-05-28**

Every AI agent, developer, or contractor working in this repository MUST read this file before making any changes.

---

## Read These First

Before touching any file, review:

1. `reports/engineering_report.md` — current deployment state, open issues, risks
2. `reports/executive_report.md` — launch approval status and governance decisions
3. `tasks/mvp_task_list.md` — what is blocked, what is approved, what is deferred
4. `tasks/QA_SCENARIOS.md` — acceptance test scenarios (M-01 through M-06, security S-01 through S-05)
5. `tasks/GITHUB_ISSUES.md` — all open issues with full acceptance criteria

---

## Repository Structure

| Directory | Purpose |
|-----------|---------|
| `netlify/functions/` | All serverless backend functions (CommonJS exports.handler) |
| `netlify/database/migrations/` | Ordered SQL migrations (0001–current) |
| `docs/` | Architecture documents (design only, not implementation) |
| `prompts/` | Marcus AI system prompts — versioned, never deleted |
| `reports/` | Engineering and executive reports — updated every deploy |
| `tasks/` | Sprint plans, QA scenarios, GitHub issue records |
| `tests/` | Automated test files (`npm test` must pass before any PR) |
| `src/` | Reserved for future build pipeline (webpack/vite) |
| `marketing/` | Deferred until launch gates closed |
| `.github/` | Issue templates and PR template — use them, every time |
| `blog/` | SEO blog article HTML pages |

---

## Working Rules

1. **No secrets in any file.** No passwords, API keys, tokens, or credentials committed to any `.md`, `.js`, `.html`, or `.txt` file — ever. Use Netlify environment variables only.
2. **Every issue gets a GitHub Issue.** No invisible fixes. Use `.github/ISSUE_TEMPLATE/` templates.
3. **Every fix gets a branch.** Format: `fix/[issue-number]-description` or `hotfix/[issue-number]-description`.
4. **Every branch gets a PR.** Use `.github/PULL_REQUEST_TEMPLATE.md`. Fill it out completely.
5. **No PR merges without QA verification.** Engineering never self-approves.
6. **Update reports on every deploy.** `reports/engineering_report.md` must reflect current deploy ID and status.
7. **`npm test` must pass.** All 18+ tests green before any commit to main.
8. **Marcus changes require prompt versioning.** Update `/prompts/PROMPT_CHANGELOG.md` for every prompt change.

---

## Current Launch Status

**STATUS: HOLD** — See `reports/executive_report.md`

Open launch blockers:
- **Issue #1 (P0):** QA credential rotation — BLOCKS ALL ACTIVITY
- **Issue #2 (P1):** Production retest baseline
- **Issue #3 (P1):** PayPal webhook registration
- **Issue #4 (P1):** Marcus acceptance matrix

Do not begin any paid launch, AppSumo submission, or marketing campaign until all P0/P1 issues are marked VERIFIED CLOSED in GitHub.

---

## Key Technical Facts

- **Auth pattern:** `validateSession()` → JOIN user_sessions + users, check `expires_at > NOW()`
- **Subscription gate:** `user.role === 'admin' || user.subscription_status === 'active'`
- **Marcus LLM:** Groq API, `llama-3.3-70b-versatile`, 40 req/hr/user limit
- **SDVOSB authority:** SBA VetCert at vetcert.sba.gov ONLY — never VA/CVE (invalid since Jan 1, 2023)
- **Marcus rule:** Never fabricate CAGE codes, past performance, or award amounts
- **DB:** `@netlify/database` with `getDatabase({ connectionString: process.env.APP_DB_URL })`
- **Deployment:** Netlify, branch main auto-deploys
- **Live URL:** https://govscout.pro
- **Current deploy:** v6.1 | Deploy ID: `6a16433de765429a99ea1d8e`

---

## GitHub Communication Rule

GitHub is the ONLY shared source of truth.

- Ask questions → GitHub Issue comment
- Report a fix → GitHub PR
- Record a decision → GitHub Issue + engineering_report.md update
- Confirm QA pass → GitHub Issue comment with evidence
- Approve release → GitHub Issue marked VERIFIED CLOSED + executive_report.md updated

If it is not in GitHub, it did not happen.
