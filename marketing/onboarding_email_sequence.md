# Onboarding Email Sequence

**Audience:** New GovScout SaaS users and AppSumo purchasers after activation succeeds  
**Goal:** Reach first useful opportunity review while reinforcing careful, trustworthy use of AI  
**Sender suggestion:** `GovScout Team <support@govscout.pro>` after deliverability and inbox are confirmed

## Email 1 - Welcome and First Step

**Timing:** Immediately after successful account activation  
**Subject:** Welcome to GovScout - start with your business profile  
**Preheader:** Your first useful search starts with a few details about your business.

Hi {{first_name}},

Welcome to GovScout.pro. You are here to make federal opportunity research more manageable, not to spend another afternoon sorting through notices with no plan.

Your first step is simple: add what your business does, the work you want to pursue, and any certifications that are relevant to your research.

**Button:** Complete your business profile

Once your profile is ready, you can research opportunities and decide which notices deserve a closer review.

GovScout helps with research and AI-assisted drafts. Always confirm official opportunity details and submission instructions on SAM.gov.

- The GovScout Team

## Email 2 - Run a Focused Opportunity Search

**Timing:** Day 1, or after profile completion  
**Subject:** Your next step: research a real opportunity  
**Preheader:** Start narrow, then inspect what fits your business.

Hi {{first_name}},

The fastest way to see whether GovScout fits your workflow is to research an opportunity relevant to the work you actually perform.

Try this today:

1. Open your GovScout workspace.
2. Start a search related to one capability or target agency.
3. Choose one promising notice to inspect.
4. Verify the source notice and any amendments on SAM.gov.

**Button:** Research opportunities

Do not chase every result. A focused review can save more time than a long list of possible bids.

- The GovScout Team

## Email 3 - Understand the Documents

**Timing:** Day 3, after first search or opportunity view  
**Subject:** Turn dense solicitation documents into reviewable next steps  
**Preheader:** Let Marcus AI help you identify requirements and questions.

Hi {{first_name}},

Once you find an opportunity worth evaluating, the real work begins: understanding what the agency requests and what your team must verify.

Use Marcus AI to help summarize solicitation materials, highlight requirement questions, and begin a review checklist.

**Button:** Review an opportunity

Keep your judgment in the loop. AI output is a working aid, not an official interpretation or a final submission. Check the notice, attachments, and amendments before you act.

- The GovScout Team

## Email 4 - Move from Review to Draft

**Timing:** Day 5, after document review  
**Subject:** Ready to prepare a working draft?  
**Preheader:** Begin with structure, then review every claim.

Hi {{first_name}},

If an opportunity remains a good fit after review, you can begin organizing your response materials in GovScout.

Start with a working draft, then verify:

- The submission instructions and deadline
- Required representations, forms, and attachments
- Your capability, experience, and pricing claims
- Any updates or amendments on SAM.gov

**Button:** Prepare your next step

GovScout is built to help you prepare with more clarity. Your team remains responsible for the final response and submission.

- The GovScout Team

## Email 5 - Activation Help

**Timing:** Day 7 if no core workflow completed  
**Subject:** Need a hand getting started with GovScout?  
**Preheader:** Reply with the step that is holding you up.

Hi {{first_name}},

If you have not completed your first opportunity review yet, tell us where things slowed down:

- Setting up your business profile
- Researching opportunities
- Understanding a notice or document
- Deciding what to do next

Reply to this email with the step you are working on and we will point you toward the clearest next action.

**Button:** Return to GovScout

- The GovScout Team

## Email 6 - AppSumo Welcome Variation

**Trigger:** AppSumo redemption and activation completed  
**Subject:** Your GovScout AppSumo access is active  
**Preheader:** Here is how to start your federal opportunity research workflow.

Hi {{first_name}},

Thanks for supporting GovScout through AppSumo. Your access is active under the terms of your redeemed deal tier.

Get started in three steps:

1. Complete your business profile.
2. Research an opportunity relevant to your capabilities.
3. Use Marcus AI to help review the documents and prepare next steps.

**Button:** Start using GovScout

Questions about your tier, activation, or product access? Reply to this email with your AppSumo redemption email so we can help.

Reminder: GovScout supports opportunity research and draft preparation. It does not guarantee eligibility, compliance, or contract awards.

- The GovScout Team

## Automation Notes

| Trigger | Email | Suppression Rule |
| --- | --- | --- |
| Account activation complete | Email 1 | Do not send until access is confirmed |
| Profile complete or 24 hours elapsed | Email 2 | Suppress if user unsubscribed |
| Opportunity viewed/searched or Day 3 | Email 3 | Suppress educational prompt if feature unavailable |
| Document workflow completed or Day 5 | Email 4 | Send only when draft feature is available |
| No meaningful activation by Day 7 | Email 5 | Stop if user requests support directly |
| AppSumo redemption complete | Email 6 in place of standard welcome variant | Do not promise tier terms absent in entitlement record |

Every sequence requires unsubscribe handling, sender authentication, and tested deep links before activation.

