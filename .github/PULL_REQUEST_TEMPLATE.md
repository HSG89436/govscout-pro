# Pull Request

## Linked Issue
Closes #<!-- issue number -->

## Branch
`fix/[issue-number]-description` OR `feature/[issue-number]-description` OR `hotfix/[issue-number]-description`

## Root Cause
<!-- What was wrong and why -->

## Files Changed
| File | Change Type | Description |
|------|------------|-------------|
| `netlify/functions/xxx.js` | Modified | |
| `xxx.html` | Modified | |

## Logic Changed
<!-- Describe the specific logic change — what did the code do before, what does it do now -->

**Before:**
```js
// old behavior
```

**After:**
```js
// new behavior
```

## Screenshots (if UI changed)
<!-- Before / After screenshots -->

## Testing Performed
- [ ] `npm test` passes locally (18/18 or more)
- [ ] Tested against production URL
- [ ] Tested against `netlify dev` locally
- [ ] Specific test scenario: <!-- describe -->

## Marcus AI Impact
- [ ] No Marcus changes
- [ ] Prompt changed → attach before/after + test conversation
- [ ] Context/retrieval changed → attach test results
- [ ] Federal rules affected → validation evidence attached

## Payment/Subscription Impact
- [ ] No payment changes
- [ ] Stripe/PayPal event tested
- [ ] Subscription state matrix tested
- [ ] Free vs paid access verified

## Risks
<!-- What could break if this goes wrong -->

## Rollback Plan
<!-- How to revert if this causes a production incident -->

## QA Checklist
- [ ] Security regression S-01 through S-05 passed
- [ ] All affected M-0x scenarios from `tasks/QA_SCENARIOS.md` passed
- [ ] No new 5xx errors in Netlify function logs
- [ ] `engineering_report.md` updated

## Required Approvals
- [ ] QA Director verified
- [ ] Lead Engineering Director approved
- [ ] Security approval (if auth/credentials affected)
- [ ] Product approval (if Marcus behavior changed)
