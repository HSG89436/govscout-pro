# GovScout.pro Repository Structure
**GovScout.pro — Engineering Architecture Document**
Version: 1.0 | Date: 2026-05-27 | Status: DRAFT — Awaiting QA Director Acceptance
Author: Lead Engineering Director

---

## 1. Current vs. Recommended Structure

### Current State (Actual)

```
govscout_build/                    ← repo root (local working copy)
├── index.html                     ← public landing page
├── fedscout5.html                 ← authenticated app (main)
├── admin.html                     ← admin dashboard (thin)
├── verify-email.html              ← email verification landing
├── blog/                          ← individual blog article pages
├── [SEO landing pages]            ← 8a, sdvosb, wosb, set-asides, etc.
├── netlify/
│   ├── functions/                 ← all serverless functions (.js)
│   └── database/
│       └── migrations/            ← SQL migration files (0001–0012)
├── tests/                         ← unit/integration tests
├── reports/                       ← engineering/executive reports
├── tasks/                         ← sprint task lists
├── netlify.toml                   ← Netlify config
├── package.json
└── [utility scripts]              ← .py, .ps1, .bat, .js deploy helpers
```

**Problems with current structure:**
- No `/docs/` directory — architecture decisions undocumented
- No `/prompts/` directory — Marcus prompts hardcoded in functions
- No `/marketing/` directory — marketing assets scattered in root
- Utility/build scripts (`*.py`, `*.ps1`, `*.bat`) clutter the root
- No clear separation between source code, operational documents, and build artifacts
- GitHub repository (`HSG89436/govscout-pro`) status unconfirmed as authoritative baseline (Executive Report Issue #1)

---

## 2. Recommended Repository Structure

```
govscout-pro/                      ← authoritative GitHub repository root
│
├── ── PUBLIC FRONTEND ──
├── index.html                     ← public landing page (v6.1+)
├── fedscout5.html                 ← authenticated app
├── admin.html                     ← admin UI (session-gated)
├── verify-email.html              ← email verification
├── [SEO pages]/                   ← 8a, sdvosb, wosb, set-asides, etc.
├── blog/                          ← blog article pages
├── og-image.png                   ← social preview image
├── robots.txt
├── sitemap.xml
│
├── ── SERVERLESS FUNCTIONS ──
├── netlify/
│   ├── functions/                 ← all .js serverless functions
│   │   ├── chat.js                ← Marcus LLM endpoint
│   │   ├── api-auth.js            ← auth / session management
│   │   ├── api-chat.js            ← chat history persistence
│   │   ├── api-documents.js       ← document management
│   │   ├── api-me.js              ← current user info
│   │   ├── api-pipeline.js        ← pipeline CRUD
│   │   ├── api-profile.js         ← business profile CRUD
│   │   ├── api-samgov.js          ← SAM.gov proxy
│   │   ├── api-searches.js        ← saved searches
│   │   ├── api-tasks.js           ← pipeline task CRUD
│   │   ├── admin-dashboard.js     ← internal admin API
│   │   ├── alert-push.js          ← push alerts
│   │   ├── alert-subscribe.js     ← alert subscription
│   │   ├── alert-unsubscribe.js   ← alert unsubscription
│   │   ├── run-alerts.js          ← alert scheduled runner
│   │   ├── create-checkout.js     ← PayPal checkout initiation
│   │   ├── customer-portal.js     ← subscription management
│   │   ├── verify-subscription.js ← subscription status check
│   │   └── paypal-webhook.js      ← PayPal lifecycle webhook
│   └── database/
│       └── migrations/            ← sequential SQL migrations (0001–N)
│           ├── 0001_govscout_schema/
│           ├── ...
│           └── 0012_qa_test_subscriber/
│
├── ── MARCUS INTELLIGENCE ──
├── prompts/                       ← versioned Marcus prompt templates
│   ├── marcus_system_v1.0.txt     ← current deployed Marcus system prompt
│   ├── report_case_file_v1.0.txt  ← CASE FILE format template
│   ├── report_readiness_v1.0.txt  ← proposal readiness template (Phase 2)
│   ├── report_compliance_v1.0.txt ← compliance review template (Phase 2)
│   ├── report_risk_v1.0.txt       ← risk assessment template (Phase 2)
│   ├── report_scoring_v1.0.txt    ← opportunity scoring template (Phase 2)
│   └── PROMPT_CHANGELOG.md        ← version history, reviewer, rationale
│
├── ── DOCUMENTATION ──
├── docs/
│   ├── marcus_architecture.md     ← Marcus workflow architecture (this directive)
│   ├── repository_structure.md    ← this document
│   ├── operational_dashboard.md   ← internal dashboard proposal
│   ├── federal_rules_validation.md← Federal rule accuracy checklist (MB-007)
│   ├── api_reference.md           ← function endpoints reference
│   ├── database_schema.md         ← table definitions + migration log
│   └── security_model.md          ← auth, session, credential handling rules
│
├── ── QUALITY ASSURANCE ──
├── tests/
│   ├── security-boundaries.test.js ← auth, bypass, injection tests
│   ├── marcus-frontend-safety.test.js ← Marcus UI safety tests
│   ├── marcus-behavioral.test.js   ← Marcus GO/TEAM/PASS, anti-hallucination (Phase 2)
│   ├── chat.test.js                ← chat API tests
│   ├── api-samgov.test.js          ← SAM.gov proxy tests
│   ├── alert-push.test.js          ← alert system tests
│   ├── alert-subscribe.test.js     ← subscription tests
│   ├── run-alerts.test.js          ← alert runner tests
│   └── QA_SCENARIOS.md             ← M-01 through M-XX QA acceptance scenarios
│
├── ── OPERATIONAL REPORTING ──
├── reports/
│   ├── engineering_report.md      ← current engineering status (updated each deploy)
│   ├── executive_report.md        ← executive product review (governance)
│   └── [dated PDFs]/              ← board reports, QA reports, closure reports
│
├── ── SPRINT MANAGEMENT ──
├── tasks/
│   ├── mvp_task_list.md           ← MVP sprint backlog
│   ├── roadmap.md                 ← long-range feature roadmap
│   └── sprint_[N]_plan.md         ← current sprint plan
│
├── ── MARKETING ──
├── marketing/
│   ├── copy/                      ← approved marketing copy by channel
│   ├── social/                    ← social media assets
│   └── launch/                    ← launch campaign materials
│
├── ── CONFIG ──
├── netlify.toml                   ← Netlify build + redirect config
├── package.json                   ← dependencies
├── .gitignore
└── .netlifyignore
```

**Note:** Utility scripts (`*.py`, `*.ps1`, `*.bat`) should be moved to a `/scripts/` directory or excluded via `.gitignore`. They are build/deploy helpers, not source — they do not belong in the repository root.

---

## 3. Directory Rationale

### `/prompts/` — Why It Matters Now
Marcus's system prompt is the most operationally critical text in the product. Every change to it affects user safety, legal compliance (SDVOSB certification rules), and product quality. Without version control, a bad prompt change cannot be quickly identified or rolled back.

**Risk if skipped:** A prompt regression that causes Marcus to give bad certification advice (e.g., directing users to VA/CVE instead of SBA VetCert) has no rollback path and is invisible in code diffs.

**Cost/complexity:** Zero — copy the hardcoded string to a `.txt` file. No code change required in Phase 1.

### `/docs/` — Why It Matters Now
Three developers contributing to an undocumented codebase is a liability. Architecture decisions made verbally or in session summaries are lost. The current executive report references open questions about authoritative source baseline (Issue #1) that proper documentation would resolve.

**Risk if skipped:** The next engineer (or future session) repeats mistakes already resolved, or makes incompatible changes to the DB schema.

### `/tests/` — Why It Needs QA_SCENARIOS.md
The 18 passing tests cover infrastructure but not Marcus behavioral quality. The acceptance matrix (M-01 through M-06) referenced in every QA report exists only in PDF documents, not in a source-controlled file. This means QA scenarios are not reproducible without reading old PDFs.

### `/marketing/` — Why It Stays Deferred
Marketing content does not unblock launch. The executive report explicitly defers "broad marketing campaigns" until security and billing issues are resolved. Create the directory stub now, populate it post-launch.

---

## 4. File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Netlify functions | `kebab-case.js` | `api-auth.js` |
| Migration directories | `NNNN_description/` | `0013_past_performance/` |
| Prompt files | `{type}_v{major}.{minor}.txt` | `marcus_system_v1.1.txt` |
| Report files | `{topic}_report.md` | `engineering_report.md` |
| Dated PDFs | `GovScout_Pro_{Topic}_{YYYY-MM-DD}.pdf` | `GovScout_Pro_v6.1_Board_Closure_Report.pdf` |
| Test files | `{target}.test.js` | `marcus-behavioral.test.js` |
| Doc files | `{topic}.md` | `federal_rules_validation.md` |

---

## 5. GitHub Synchronization Policy

Per Executive Report Issue #1, the GitHub repository (`HSG89436/govscout-pro`) must be confirmed as the authoritative source baseline before any paid launch.

**Required actions (Engineering):**
1. Verify all production-deployed functions exist in GitHub HEAD
2. Verify all migrations (0001–0012) exist in GitHub
3. Confirm `netlify.toml`, `package.json`, and all HTML files match deployed artifacts
4. Tag the verified state as `v6.1-stable` before any further changes

**Branch policy (recommended):**
- `main` — production-deployed, protected, requires PR + review
- `develop` — integration branch for sprint work
- `feature/*` — individual feature branches
- Never push directly to `main` for any change affecting `netlify/functions/`

**Rollback policy:** Before every production deploy, the current `main` HEAD must be tagged with the Netlify deploy ID. This allows instant `git revert` + Netlify redeploy to any prior state within 60 seconds.

---

## 6. Implementation Priority

| Action | Priority | Effort | Blocks |
|--------|---------|--------|--------|
| Confirm GitHub source baseline (Issue #1) | P0 | Low | All launch activity |
| Create `/prompts/` + extract current Marcus prompt | P0 | Low | Prompt version control |
| Create `/docs/` + move architecture docs | P0 | Low | Team onboarding |
| Create `tests/QA_SCENARIOS.md` | P1 | Medium | MB-005, Issue #4 |
| Create `/scripts/` + move utility scripts | P2 | Low | Repo cleanliness |
| Create `/marketing/` stub | P3 | Trivial | Post-launch only |

---

*Engineering execution completed for architectural design phase. Ready for QA Director and Product Governor review.*
*Engineering NEVER self-approves. QA Director is final verification authority.*
