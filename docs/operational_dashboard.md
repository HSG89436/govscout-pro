# Internal Operational Dashboard — Design Proposal
**GovScout.pro — Engineering Architecture Document**
Version: 1.0 | Date: 2026-05-27 | Status: DRAFT — Awaiting QA Director Acceptance
Author: Lead Engineering Director

---

## 1. Objective

Design a lightweight internal dashboard that gives authorized GovScout.pro team members visibility into deployment status, system health, QA progress, and roadmap state — without requiring external SaaS tools, additional subscriptions, or complex infrastructure.

**Constraint:** This dashboard must be buildable as a single HTML page, gated by admin session authentication, with zero new Netlify functions required at MVP.

---

## 2. Scope and Users

### Authorized Users

| Role | Access Level | What They Need |
|------|-------------|----------------|
| Founder / Owner (Steve) | Full admin | All panels |
| Lead Engineering Director | Full admin | All panels |
| QA Director | Read-only | QA scenarios, test status, deployment status |
| Product Governor | Read-only | Roadmap, Marcus status, open issues |
| Marketing Director | Read-only | User counts, conversion metrics (post-launch) |
| Technical Manager | Full read | All panels except user PII |

### Access Gate
All dashboard access requires an active admin-role session token. The existing `admin-dashboard.js` function provides the auth gate. No new authentication infrastructure needed.

---

## 3. Dashboard Panels

### Panel 1: Deployment Status

**Data source:** Static — updated manually on each deploy (or via Netlify deploy webhook in Phase 2)

```
┌─────────────────────────────────────────────┐
│  DEPLOYMENT STATUS                          │
├─────────────────────────────────────────────┤
│  Current Version:    v6.1                   │
│  Deploy ID:          6a16433de765429a...    │
│  Deploy Date:        2026-05-27             │
│  Branch:             main                   │
│  Status:             ● LIVE                 │
│                                             │
│  Last Deploy By:     Engineering Director   │
│  Rollback Target:    Deploy 6a16104c (v6.0) │
│                                             │
│  GitHub HEAD:        ⚠ NOT CONFIRMED        │
│  (Issue #1 open)                            │
└─────────────────────────────────────────────┘
```

### Panel 2: Open Issues (Launch Gates)

**Data source:** Static — manually maintained in the dashboard HTML or pulled from `/reports/engineering_report.md`

```
┌─────────────────────────────────────────────┐
│  OPEN LAUNCH GATES                          │
├───┬─────────────────────────────────────────┤
│ # │ Issue                          │ Owner  │
├───┼────────────────────────────────┼────────┤
│ 1 │ Rotate exposed QA credential   │ Sec/QA │ ← P0 BLOCKS ALL
│ 2 │ Deploy repairs + prod retest   │ RM/QA  │ ← P1
│ 3 │ PayPal lifecycle sandbox test  │ Billing│ ← P1
│ 4 │ Marcus acceptance M-01–M-06    │ Prod/QA│ ← P1
└───┴────────────────────────────────┴────────┘
```

### Panel 3: System Health

**Data source:** `admin-dashboard.js` endpoint (already exists) — queried on page load

```
┌─────────────────────────────────────────────┐
│  SYSTEM HEALTH                              │
├─────────────────────────────────────────────┤
│  Database:         ● Connected              │
│  Active Sessions:  [count]                  │
│  Total Users:      [count]                  │
│  Active Subscribers: [count]                │
│  Pending Verification: [count]              │
│                                             │
│  Groq API:         ○ Status unknown         │
│  (manual check required)                    │
│                                             │
│  Last Alert Run:   [timestamp]              │
│  Alerts Delivered: [count]                  │
└─────────────────────────────────────────────┘
```

### Panel 4: QA Status

**Data source:** Static — manually updated in dashboard HTML or `/tasks/` markdown file

```
┌─────────────────────────────────────────────┐
│  QA STATUS                                  │
├─────────────────────────────────────────────┤
│  Unit Tests:    18/18 ✓ (local)             │
│  Prod Retest:   ⚠ Pending (Issue #2)        │
│                                             │
│  Marcus Acceptance Matrix                   │
│  M-01  Login + subscription gate    ○ Open  │
│  M-02  SAM.gov search               ○ Open  │
│  M-03  Marcus CASE FILE output      ○ Open  │
│  M-04  Document Intel blocking      ○ Open  │
│  M-05  PayPal cancel → revoke       ○ Open  │
│  M-06  Spanish locale               ○ Open  │
│                                             │
│  QA Credential:  ⚠ ROTATE REQUIRED (P0)    │
└─────────────────────────────────────────────┘
```

### Panel 5: Roadmap Visibility

**Data source:** Static — pulled from `/tasks/roadmap.md`

```
┌─────────────────────────────────────────────┐
│  ROADMAP (MVP → v7.0)                       │
├─────────────────────────────────────────────┤
│  v6.1 (Current)    ████████████ LIVE        │
│  Launch Gate Close ░░░░░░░░░░░░ BLOCKED     │
│  v6.2 (Phase 2)    ░░░░░░░░░░░░ PLANNED     │
│  └ Past performance tables                  │
│  └ Marcus behavioral test suite             │
│  └ Proposal readiness report                │
│  v7.0 (Phase 3)    ░░░░░░░░░░░░ DEFERRED   │
│  └ Compliance review                        │
│  └ Teaming partner search                   │
│  └ Advanced scoring                         │
└─────────────────────────────────────────────┘
```

---

## 4. Technical Implementation

### Architecture Decision

**Option A: Single admin HTML page (Recommended)**
- One new file: `/admin-internal.html`
- Reads from existing `admin-dashboard.js` function for live DB data
- Static panels for deployment status, QA status, roadmap (manually maintained)
- No new functions, no new dependencies
- Auth: checks session token on page load, redirects to login if not admin

**Option B: Netlify-hosted internal site (Deferred)**
- Separate subdomain (e.g., `internal.govscout.pro`)
- More polish, role-based panels
- Requires additional Netlify configuration, potential cost
- Not justified at MVP

**Recommendation: Option A.** Build Option B post-launch when team size and usage justify the complexity.

### Implementation Scope (Option A)

```
Files to create:
  /admin-internal.html            ← dashboard HTML
  /netlify/functions/admin-ops.js ← thin read-only API for dashboard data

admin-ops.js endpoints:
  GET ?action=health   → DB connection, user counts, session counts
  GET ?action=deploys  → last deploy metadata (from static env var)
  GET ?action=alerts   → recent alert delivery log
```

**Auth gate in admin-ops.js:**
```javascript
// Same requireAdmin pattern as admin-dashboard.js
const user = await validateSession(token, sql);
if (!user || user.role !== 'admin') {
  return { statusCode: 403, ... };
}
```

### Data Refresh

| Panel | Refresh Method | Frequency |
|-------|---------------|-----------|
| Deployment Status | Manual update on deploy | Per deploy |
| Open Issues | Manual update in HTML | As issues close |
| System Health | `admin-ops.js` API call | On page load + 5 min interval |
| QA Status | Manual update in HTML | After each QA run |
| Roadmap | Manual update in HTML | Per sprint |

**Architectural decision:** Avoid real-time polling at MVP. Page-load refresh is sufficient. Real-time websockets add complexity that serves no launch-critical need.

---

## 5. Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Admin page accidentally indexed by search engines | Low | Medium | Add `<meta name="robots" content="noindex">` + auth gate |
| Session token exposed in URL | Low | High | Use `Authorization: Bearer` header, never URL params |
| DB counts expose PII through dashboard | Low | High | Only expose counts, never emails/names in health panel |
| Stale manual data gives false confidence | Medium | Medium | Add "Last updated" timestamp to every manual panel |

---

## 6. Rollback Considerations

This is an additive feature — a new HTML file and one new function. Rollback is:
1. Remove `/admin-internal.html` from deployment
2. Remove `admin-ops.js` from `netlify/functions/`
3. Redeploy

No database changes required. No existing functionality affected.

---

## 7. Implementation Priority

**Phase 1 (Now — document only):** This design document.

**Phase 2 (Next sprint after launch gates close):**
1. Create `admin-ops.js` (2 hours)
2. Create `admin-internal.html` with static panels (4 hours)
3. Wire System Health panel to `admin-ops.js` (2 hours)
4. QA: verify admin-only access, no PII exposure, no search indexing

**Do not build Phase 2 until Issue #1 (exposed QA credential) is closed.** An admin dashboard has no value while a P0 security issue is open.

---

## 8. Operational Reporting Framework

Beyond the dashboard, the team coordination framework is:

### Reporting Cadence

| Report | Owner | Frequency | Location |
|--------|-------|-----------|---------|
| Engineering Report | Lead Engineering Director | Per deploy | `/reports/engineering_report.md` |
| QA Verification | QA Director | Per sprint | GitHub Issue + PDF |
| Executive Product Review | Product Governor | Per milestone | `/reports/executive_report.md` |
| Marketing Status | Marketing Director | Weekly (post-launch) | `/marketing/launch/` |

### Communication Channels

| Channel | Purpose |
|---------|---------|
| GitHub Issues | Formal defect tracking, launch gate management |
| GitHub PRs | Code change review + approval |
| `/reports/engineering_report.md` | Engineering status per deploy |
| Session documents (this and prior) | Architecture decisions, sprint planning |

### Escalation Path

```
Engineering Discovery
    │
    ├── P0 defect → immediate GitHub Issue → Engineering + QA Director notified
    ├── P1 defect → GitHub Issue within 24hrs → QA Director review required
    └── Architecture decision → ADR in /docs/ → Product Governor review
```

**Rule:** Engineering NEVER self-approves production changes. Every production deploy requires either QA Director sign-off (for feature changes) or explicit waiver from Technical Manager for emergency hotfixes with documented rollback plan.

---

*Engineering execution completed for architectural design phase. Ready for QA Director and Product Governor review.*
*Engineering NEVER self-approves. QA Director is final verification authority.*
