# GovScout.pro MVP Task List

Updated: 2026-05-27  
Executive status: **HOLD**  
Goal: launch only the smallest trustworthy paid MVP for opportunity discovery, alerts, gated access, and Marcus assistance.

## Launch-Critical Work

| ID | Priority | Department | Task | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- |
| MVP-SEC-001 | P0 | Security | Rotate/disable exposed QA credential and sanitize affected artifacts. Track in [GitHub #1](https://github.com/HSG89436/govscout-pro/issues/1). | Old credential rejected; sanitized scan; secure QA test path retained. | OPEN - BLOCKS LAUNCH |
| MVP-REL-001 | P1 | Release Management / QA | Establish the authoritative source/deployment baseline, reconcile the accepted local repair set with the deployed artifact, and retest production. Track in [GitHub #2](https://github.com/HSG89436/govscout-pro/issues/2). | Source baseline, deploy plan/ID, rollback point, live alert/SAM/auth/access results. | OPEN - BLOCKS LAUNCH |
| MVP-BIL-001 | P1 | Billing / QA / Security | Verify existing PayPal entitlement lifecycle and fail-closed webhook behavior. Track in [GitHub #3](https://github.com/HSG89436/govscout-pro/issues/3). | Sanitized CREATED/ACTIVE/CANCELLED/EXPIRED matrix and access results. | OPEN - BLOCKS PAID LAUNCH |
| MVP-QA-001 | P1 | Product / QA | Execute controlled Marcus acceptance and federal-grounding verification. Track in [GitHub #4](https://github.com/HSG89436/govscout-pro/issues/4). | Scenario matrix, source validation, QA verdict. | OPEN - BLOCKS MARCUS CLAIMS |
| MVP-PROD-001 | P1 | Product / Billing / Marketing | Resolve conflicting pricing and payment-provider direction through owner YES/NO decision `GS-DEC-001`. | Recorded owner authorization and accepted MVP commercial scope. | WAITING ON GOVERNANCE |

## Verified Baseline

| Item | Evidence | Status |
| --- | --- | --- |
| Local regression suite | `npm.cmd test` executed 2026-05-27; `18` passed, `0` failed. | ACCEPTED LOCAL ONLY |
| Current launch ledger | `LAUNCH_CONTROL_2026-05-26.md` states production `HOLD`. | CONFIRMED |
| Production customer-critical checks | Closure evidence records failed alert-test and SAM.gov checks requiring retest. | FAILED / OPEN |

## Department Queue

| Department | Immediate MVP Responsibility | Do Not Expand Into |
| --- | --- | --- |
| Engineering | Package only accepted defect repairs requested by Release Management; support root-cause evidence. | New product capabilities or new billing architecture. |
| QA | Retest security, alert, SAM.gov, entitlement, and Marcus launch gates with sanitized evidence. | Broad exploratory backlog until blockers close. |
| Security | Contain exposed QA credential and validate release security gates. | Cosmetic or growth work. |
| Marketing | Hold unsupported launch/superiority and paid acquisition claims. | Campaign expansion before launch approval. |
| Release Management | Prepare controlled deploy/retest/rollback packet after security sequencing. | Unapproved production publish. |

## Deferred From MVP

- Admin analytics dashboard and operational reporting enhancements.
- Weekly alert options and noncritical notification customization.
- New pricing tiers, Stripe migration, or AppSumo packaging until expressly approved.
- Opportunity-to-proposal expansions beyond required correctness and access control.
- Broad SEO, referral, and paid acquisition execution.

## Closure Rule

A launch-critical item moves to `VERIFIED CLOSED` only after the owning department supplies non-sensitive evidence, QA verifies target-environment behavior, and Executive Technical Management records approval in `reports/executive_report.md`. Local code or a written completion report alone does not close a gate.
