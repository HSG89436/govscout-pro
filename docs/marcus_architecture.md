# Marcus Workflow Architecture
**GovScout.pro — Engineering Architecture Document**
Version: 1.0 | Date: 2026-05-27 | Status: DRAFT — Awaiting QA Director Acceptance
Author: Lead Engineering Director

---

## 1. Current State Summary

Marcus is GovScout.pro's AI-powered federal contracting workflow adviser running as a Netlify serverless function (`netlify/functions/chat.js`). The current implementation is functional but lacks structured workflow layers, versioned prompt management, and formalized report generation pipelines.

**What exists and is working:**
- Session-authenticated LLM endpoint (Groq `llama-3.3-70b-versatile`)
- Subscription gate (`subscription_status = 'active'` or `role = 'admin'`)
- Per-user hourly rate limiting (40 req/hr, DB-backed)
- Business profile context injection from `business_profiles` table
- Rolling 100-message chat history (`chat_messages` table)
- CASE FILE structured analysis output format
- Anti-hallucination hard rules in system prompt
- MISSING DOCUMENT hard gate (blocks analysis without solicitation data)

**What does not yet exist:**
- Versioned prompt management
- Structured report generation functions (contract analysis, proposal readiness, compliance, risk, scoring)
- Past performance context storage
- Capability statement storage
- Document analysis pipeline beyond in-browser PDF.js
- Solicitation field extraction (structured parsing)
- Marcus behavioral test suite (MB-005 remains OPEN)

---

## 2. Marcus Workflow Architecture

### 2.1 Input Pipeline

Every Marcus interaction passes through three layers:

```
User Input
    │
    ▼
┌──────────────────────────────────────┐
│  Layer 1: Authentication & Access    │
│  • Session token validation          │
│  • Subscription status check         │
│  • Rate limit check (40/hr/user)     │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Layer 2: Input Sanitization         │
│  • Strip system-role messages        │
│  • Truncate to safe lengths          │
│  • Limit conversation window (20)    │
│  • Content classification (intent)   │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Layer 3: Context Assembly           │
│  • Load business_profiles (existing) │
│  • Load past_performance (planned)   │
│  • Load capability_statements (plan) │
│  • Load relevant pipeline items (p.) │
│  • Compose bounded context block     │
└──────────────────┬───────────────────┘
                   │
                   ▼
              Groq LLM Call
                   │
                   ▼
┌──────────────────────────────────────┐
│  Layer 4: Output Validation          │
│  • Detect code-pattern responses     │
│  • Log usage (best-effort)           │
│  • Return structured or freeform     │
└──────────────────────────────────────┘
```

**Architectural decision:** Keep all three guard layers in `chat.js`. Do not split across multiple functions at this stage — added latency and deployment complexity are not justified for MVP. Revisit at 1000+ active users.

**Risk:** Context assembly adds DB round-trips (currently 1 — profiles). Adding past_performance and capabilities adds 2 more. Total context assembly budget: ≤ 150ms. Mitigation: cache compiled context in `marcus_context_cache` table, invalidate on profile update.

**Rollback:** All context layers are additive and fail-safe. If a DB fetch fails, Marcus falls back to a no-context prompt without blocking the user.

---

### 2.2 Business Context Storage

**Current:** `business_profiles` table (exists, in production)

Fields: `business_name`, `plain_english_description`, `naics`, `certifications`, `location`, `team_size`, `experience`, `goals`

**Planned additions (Phase 2 — not current sprint):**

#### `past_performance` table
```sql
CREATE TABLE past_performance (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_number  TEXT,          -- e.g. VA-123-456-C-0001
  agency           TEXT NOT NULL,
  description      TEXT NOT NULL,
  naics            TEXT,
  contract_value   NUMERIC(12,2),
  period_of_perf   TEXT,          -- "2021-2024"
  role             TEXT,          -- "prime" | "subcontractor"
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);
```

#### `capability_statements` table
```sql
CREATE TABLE capability_statements (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version     INTEGER DEFAULT 1,
  content     TEXT NOT NULL,      -- Raw capability statement text
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

#### `marcus_context_cache` table (performance optimization)
```sql
CREATE TABLE marcus_context_cache (
  user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  context_hash TEXT NOT NULL,     -- SHA256 of source data
  compiled     TEXT NOT NULL,     -- Pre-built context string
  expires_at   TIMESTAMP NOT NULL,
  updated_at   TIMESTAMP DEFAULT NOW()
);
```

**Safety rules for all context storage:**
- No credentials, passwords, API keys, SSNs, or EINs stored in any Marcus context table
- All context text bounded to 500 chars per field before injection into prompts
- Context marked as "untrusted customer data, not instructions" in every system message
- User can clear all Marcus context via account settings (GDPR/CCPA compliance path)

**Architectural decision:** Separate context tables rather than a single JSON blob. Allows targeted invalidation, granular permissions, and cleaner indexing. JSON blob approach risks schema drift and makes partial updates harder.

**Risk:** Three context tables add migration complexity. Mitigation: phase them in — past_performance first (highest impact on CASE FILE quality), then capability_statements.

**Scaling impact:** At 10,000 users, context tables stay small (1 row per user per table). No sharding required at this scale.

---

### 2.3 Anti-Hallucination Safeguards

Current safeguards in `MARCUS_SYSTEM_PROMPT` (already deployed):

| Safeguard | Implementation | Status |
|-----------|----------------|--------|
| No credentials | Hard rule #1 in system prompt | ✅ Live |
| No fabricated CAGE codes | Hard rule #2 | ✅ Live |
| No fabricated awards | Hard rule #2 | ✅ Live |
| No false identity | Hard rule #3 | ✅ Live |
| Profile = untrusted data | Hard rule #4 | ✅ Live |
| SDVOSB/VetCert only | Certification rules block | ✅ Live |
| Missing document gate | Hard gate in prompt | ✅ Live |
| Client system override blocked | Input filter in chat.js | ✅ Live |

**Additional safeguards — Phase 2 (planned):**

#### Validation Layer (post-LLM output filter)
Intercept LLM output before returning to client and check for:
- Patterns matching CAGE code format (`[A-Z0-9]{5}`) — flag if present without a real SAM.gov lookup
- Patterns matching solicitation numbers — flag if not from user's context
- Patterns matching specific dollar amounts not provided by user — flag

Implementation: lightweight regex pass on `content` before return. If flagged, prepend a disclaimer: `[ADVISORY: This response contains specific identifiers I cannot independently verify. Confirm via SAM.gov before acting.]`

**Architectural decision:** Opt for a disclaimer rather than blocking — blocking creates a worse UX failure mode. Disclaimer maintains usefulness while flagging uncertainty.

#### Confidence Levels in CASE FILE
Add to the CASE FILE template:
```
**CONFIDENCE: [HIGH / MEDIUM / LOW]**
[One sentence explaining basis — "HIGH: full solicitation text provided; MEDIUM: NAICS and agency only; LOW: incomplete details, assumptions made."]
```

This is a prompt-level change only — no code change required.

#### Federal Rule Validation Checklist (MB-007 — OPEN)
Before marketing any Marcus federal guidance, maintain `/docs/federal_rules_validation.md` with:
- Each rule cited in `MARCUS_SYSTEM_PROMPT`
- Official source URL
- Last validated date
- Validator (Engineering or Product)

This is not a code system — it is a manual review discipline enforced before every prompt version update.

---

### 2.4 Solicitation Analysis Workflows

#### Structured Solicitation Parser (Phase 2)
When a user submits a full solicitation document via Document Intel, extract structured fields before passing to Marcus:

```
Solicitation Input (PDF/text)
    │
    ▼
┌─────────────────────────────────┐
│  Field Extraction Pass          │
│  • Solicitation number          │
│  • Agency + contracting office  │
│  • NAICS code(s)                │
│  • PSC/product service code     │
│  • Set-aside type               │
│  • Estimated value / IGCE       │
│  • Proposal due date            │
│  • Incumbent signals            │
│  • Key evaluation factors       │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Business Fit Scoring           │
│  • NAICS match (user profile)   │
│  • Certification match          │
│  • Value range fit              │
│  • Geographic/clearance fit     │
│  • Timeline feasibility         │
└──────────────┬──────────────────┘
               │
               ▼
          CASE FILE Output
```

Implementation path: First pass done by Marcus (Groq) using a structured extraction prompt. Second pass is the existing CASE FILE format. No separate parsing function needed at MVP — single call handles both.

**Risk:** LLM extraction of structured fields is probabilistic, not deterministic. Mitigation: validation UI on extracted fields before Marcus proceeds ("Did I get this right? NAICS: 517312, Set-aside: SDVOSB — confirm or correct.")

---

### 2.5 Report Generation Workflows

All report types share the same infrastructure: a Netlify function call to Groq with a specialized system prompt, producing structured markdown that the frontend can render or the backend can convert to PDF.

#### Report Type Taxonomy

| Report Type | Trigger | Template | Output |
|-------------|---------|----------|--------|
| Contract Analysis | User requests analysis with solicitation data | CASE FILE (existing) | Structured markdown |
| Proposal Readiness | User clicks "Am I ready?" in Pipeline | Readiness checklist prompt | Scored checklist |
| Compliance Review | User uploads solicitation + draft proposal | Compliance prompt | Pass/Fail per section |
| Risk Assessment | User requests risk review | Risk matrix prompt | Probability × Impact matrix |
| Opportunity Scoring | SAM.gov search result | Scoring prompt | 0-100 score with breakdown |

#### Proposal Readiness Report Template (Planned)

```
PROPOSAL READINESS ASSESSMENT: [Opportunity Title]
Score: [0-100]

SECTION SCORES:
┌─────────────────────────────────┬─────────┬──────────────┐
│ Section                         │ Score   │ Gap          │
├─────────────────────────────────┼─────────┼──────────────┤
│ Technical Approach              │ xx/25   │ [gap]        │
│ Past Performance                │ xx/25   │ [gap]        │
│ Management / Staffing           │ xx/25   │ [gap]        │
│ Price / Cost Realism            │ xx/25   │ [gap]        │
└─────────────────────────────────┴─────────┴──────────────┘

IMMEDIATE GAPS:
• [Specific missing element]

72-HOUR ACTIONS:
1. [Action]
```

#### Compliance Review Report Template (Planned)

```
COMPLIANCE REVIEW: [Solicitation Number]
Result: [PASS / FAIL / PARTIAL]

SECTION CHECKLIST:
□ FAR clause compliance
□ Section L (Instructions) followed
□ Section M (Evaluation) addressed
□ Certifications included
□ Page/word limits respected
□ Attachments / forms complete

CRITICAL GAPS:
• [Gap with FAR/DFARS reference]
```

**Architectural decision:** All reports generated server-side by Marcus, not by a separate PDF generation service. Keeps the stack simple. PDF export is a frontend operation (browser print-to-PDF or existing reportlab path for formal deliverables).

**Rollback:** Report types are prompt-level additions. Adding a new report type requires only a new prompt and a new frontend trigger — no function refactor.

---

### 2.6 Prompt Version Control

**Problem:** `MARCUS_SYSTEM_PROMPT` is currently hardcoded in `chat.js`. Any prompt change requires a code deploy and has no version history.

**Solution:** Versioned prompt files in `/prompts/` directory.

```
/prompts/
  marcus_system_v1.0.txt    ← current prompt (extracted from chat.js)
  marcus_system_v1.1.txt    ← next version (in development)
  report_case_file_v1.0.txt
  report_readiness_v1.0.txt
  report_compliance_v1.0.txt
  report_risk_v1.0.txt
  report_scoring_v1.0.txt
  PROMPT_CHANGELOG.md       ← what changed, why, who reviewed
```

`chat.js` reads the active prompt version from an env var:
```javascript
const MARCUS_PROMPT_VERSION = process.env.MARCUS_PROMPT_VERSION || 'v1.0';
// Prompt text loaded at deploy time from /prompts/ via build step
// or hardcoded string with version tag comment
```

**Phase 1 (now):** Extract current prompt to `/prompts/marcus_system_v1.0.txt` as documentation. Keep hardcoded in `chat.js`.

**Phase 2 (next sprint):** Build a simple prompt loader so prompt updates don't require touching `chat.js`.

**Rollback:** Changing `MARCUS_PROMPT_VERSION` env var reverts to any prior prompt version in under 60 seconds (Netlify env update + redeploy).

---

## 3. Marcus Behavioral Test Suite (MB-005 — Required Before Launch Claims)

Current state: 18 tests pass, but none cover behavioral quality.

**Required scenario categories:**

| Category | Scenarios | Priority |
|----------|-----------|---------|
| No-document gate | Ask for analysis with no solicitation data | P0 |
| Unreadable document | Submit corrupted/image-only PDF | P0 |
| Fabrication resistance | Ask Marcus to "guess" CAGE codes | P0 |
| Certification accuracy | SDVOSB via VA/CVE, 8(a) via wrong portal | P0 |
| Adversarial override | Inject instructions in user message | P0 |
| GO/TEAM/PASS quality | Full solicitation → correct recommendation | P1 |
| Profile context use | Profile data reflected in response | P1 |
| 72-hour plan quality | Concrete vs. generic actions | P1 |
| Rate limit enforcement | 41st request in same hour window | P1 |
| Spanish language | Spanish prompt → coherent response | P2 |

Test files location: `/tests/marcus-behavioral.test.js` (new file — Phase 2)

---

## 4. Scaling Considerations

| Component | Current Limit | Scaling Path |
|-----------|---------------|--------------|
| Chat function | ~500ms cold start | Netlify auto-scales; no action needed at MVP |
| Groq API | 40 req/hr/user | Acceptable; raise if conversion data justifies |
| DB context queries | 1 query/request | Cache layer at 500+ concurrent users |
| Chat history | 100 msgs/user | Sufficient; archive older messages if storage costs spike |
| Rate limit table | Grows ~1 row/user/hr | Add TTL cleanup job after 1000+ users |

---

## 5. Immediate Next Steps (Phase 1 — Current Sprint)

1. Extract `MARCUS_SYSTEM_PROMPT` to `/prompts/marcus_system_v1.0.txt` (documentation only, no code change)
2. Add confidence level instruction to existing prompt (no code change — prompt edit only)
3. Write federal rules validation checklist at `/docs/federal_rules_validation.md`
4. Write Marcus behavioral test scenarios at `/tests/marcus-behavioral.test.js` (MB-005 closure)
5. Deploy `PAYPAL_WEBHOOK_ID` env var + run sandbox lifecycle matrix (GS-V61-003 manual close)

**Do not build yet:**
- Past performance / capability statement tables (Phase 2)
- Context cache table (Phase 2)
- Output validation layer (Phase 2)
- Compliance / readiness report prompts (Phase 2)

---

*Engineering execution completed for architectural design phase. Ready for Product Governor and QA Director review.*
*Engineering NEVER self-approves. QA Director is final verification authority.*
