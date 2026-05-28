# Marcus Prompt Version Changelog

All changes to Marcus system prompts must be logged here before deployment.
Reviewer sign-off required before any prompt version update goes to production.

---

## v1.0 — 2026-05-27

**File:** `marcus_system_v1.0.txt`
**Status:** ACTIVE — deployed in `netlify/functions/chat.js`
**Reviewed by:** Lead Engineering Director
**QA sign-off:** Pending (awaiting MB-005 behavioral suite)

**What this version does:**
- Establishes Marcus as GovScout.pro's AI-powered federal contracting workflow adviser
- Enforces 4 hard core rules (no credentials, no fabricated data, no false identity, profile = untrusted data)
- Enforces SDVOSB/VetCert-only certification guidance (SBA VetCert at vetcert.sba.gov)
- Produces structured CASE FILE output (GO/TEAM/PASS) when solicitation data is provided
- Hard gate: blocks analysis when no solicitation details are provided
- Routes workflow actions to correct app tabs

**Source:** Extracted from `netlify/functions/chat.js` hardcoded constant `MARCUS_SYSTEM_PROMPT`

**Known gaps (Phase 2):**
- No confidence level instruction (HIGH/MEDIUM/LOW) — planned for v1.1
- Federal rules not yet validated against official sources (MB-007 open)
- No behavioral test suite coverage (MB-005 open)

---

## Versioning Rules

1. Increment minor version (v1.0 → v1.1) for wording changes, clarifications, or additions that do not change core behavior
2. Increment major version (v1.x → v2.0) for structural changes to CASE FILE format, new rule categories, or removal of existing rules
3. Never delete a prior version file — archive only
4. Every version update requires: (a) Lead Engineering Director review, (b) QA Director behavioral test run, (c) Product Governor sign-off before production deploy
5. Document the specific change, the reason, and the risk in this changelog
