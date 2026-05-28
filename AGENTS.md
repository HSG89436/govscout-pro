# GovScout.pro Agent Operating Guide

Every AI agent or developer working in this repository must read these files before making changes:

1. `docs/GOVSCOUT_MASTER_PLAN.md`
2. `docs/PRODUCT_REQUIREMENTS.md`
3. `docs/ROADMAP.md`
4. `docs/QA_STANDARDS.md`
5. `docs/CODING_STANDARDS.md`

## Working Rules

- Keep all source code in `src/`.
- Keep Netlify serverless functions in `netlify/functions/`.
- Keep reusable prompts in `prompts/`.
- Keep execution reports in `reports/`.
- Keep task plans and sprint notes in `tasks/`.
- Do not commit secrets, passwords, API keys, or `.env` files.
- Update reports and docs when work changes product behavior, QA status, launch readiness, or deployment setup.

## Communication Rule

Use GitHub as the shared source of truth. Important work should be captured in files, issues, pull requests, or reports so the owner does not need to copy and paste instructions between tools.
