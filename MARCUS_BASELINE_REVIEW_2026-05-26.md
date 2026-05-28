# GovScout.pro Marcus Baseline Review

Date: 2026-05-26  
Owner: GovScout.pro Marcus AI and Knowledge Team  
Executive objective: Make Marcus strong enough to support Steven Harriman's first legitimate federal prime award pursuit and then prove that value in the market.

## Current Verdict

`HOLD` - Marcus is strategically central and now has an evaluation standard, but the current product has not yet demonstrated market leadership or production readiness.

## What Exists

- Hosted Marcus chat endpoint gated by authenticated active subscription.
- Browser interface with conversation, business profile, SAM.gov discovery, Document Intel, pipeline, alerts, and bid-package workflows.
- GO / TEAM / PASS structure and a missing-solicitation prompt gate in hosted chat instructions.
- Saved chat-message API scoped to the authenticated account.
- Initial backend regression coverage for optional usage-log failure handling.

## Findings And Actions

| ID | Severity | Finding | Action | Status |
| --- | --- | --- | --- | --- |
| MB-001 | P0 | Hosted Marcus prompt instructed the system to conceal AI identity and mimic personal consultant authority | Replaced with accurate AI-powered workflow-adviser identity and no invented human history rule | FIXED LOCAL |
| MB-002 | P1 | Hosted Marcus ignored business-profile context because client `systemPrompt` was not used by the server and no server profile context was loaded | Load bounded authenticated profile context server-side as untrusted customer data | FIXED LOCAL |
| MB-003 | P1 | Hosted endpoint accepted client-provided `system` messages that could override Marcus behavior and trust rules | Restrict model conversation input to bounded `user` and `assistant` messages; add test | FIXED LOCAL |
| MB-004 | P1 | In-app persona and Sources Sought text contained misleading identity and acquisition-influence language | Replaced with accurate identity and permitted market-research guidance | FIXED LOCAL |
| MB-005 | P1 | No scored Marcus behavioral suite exists for accuracy, missing documents, GO/TEAM/PASS reasoning, memory, proposal review, or adversarial pressure | Build first controlled scenario suite under market-leadership standard | OPEN |
| MB-006 | P1 | No dated comparison against current alternative products or workflows exists | Perform current-market comparison after scenario suite is fixed | OPEN |
| MB-007 | P1 | Prompt includes federal/regulatory guidance that requires official-source validation and continuing review | Federal Knowledge Reviewer to validate each marketed rule and replace unsafe absolutes | OPEN |
| MB-008 | P0 | Document Intel previously generated analysis from a PDF placeholder when extraction failed | Block analysis for unreadable or unsupported content and require a searchable file/TXT export | FIXED LOCAL |
| MB-009 | P1 | In-app guidance used unsupported agency, pricing, certification, and competitive-outcome assertions | Replace absolutes with notice-specific, official-source-based research guidance | FIXED LOCAL |

## Evidence Observed

- `netlify/functions/chat.js` is the hosted Marcus model call and previously supplied one fixed server prompt plus recent client messages.
- `fedscout5.html` assembles a richer business-profile persona only for direct bring-your-own-key calls; the hosted function now independently retrieves approved profile fields.
- `tests/chat.test.js` previously covered only a usage logging failure, not behavioral quality or instruction integrity.

## Acceptance Work Now Required

1. Automated local proof completed: hosted Marcus receives authenticated profile context, refuses client system overrides, and Document Intel blocks unreadable-content analysis.
2. Add controlled scenarios for no-document gating, unreadable-document handling, fact/assumption separation, certification caution, adversarial prompts, and concrete GO/TEAM/PASS structure.
3. Validate current federal-rule statements against official SBA/FAR/SAM.gov sources before marketing them.
4. Research and compare current alternatives under identical workflow scenarios.
5. Keep any superiority language out of public marketing until the scored evidence passes Executive Launch Command review.

## Verification Evidence

- `npm.cmd test`: `18` tests passed, `0` failed, including Marcus profile-context, system-override, unreadable-document, and trust-copy safeguards.
- `node --check netlify/functions/chat.js`: passed.
- Local rendered smoke check: `fedscout5.html` displayed the authentication entry state and updated Marcus trust positioning with no console warnings or errors.
- Browser screenshot evidence could not be captured because the screenshot operation timed out; no visual screenshot is claimed.
