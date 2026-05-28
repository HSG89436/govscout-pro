# Git Push Instructions — Restore GitHub Operational Baseline
**Priority:** P1 — Required before any further production deploys
**Date created:** 2026-05-28
**Relates to:** Executive Report Issue #1 and Issue #2

---

## Background

The local working folder (`C:\Users\sharr\govscout_build`) is the authoritative working
copy for GovScout.pro but was not connected to GitHub. As of 2026-05-28:

- `.git` directory has been initialized
- Remote `origin` is set to `https://github.com/HSG89436/govscout-pro.git`
- All architecture documents and repo structure have been created locally
- **Files are NOT yet pushed to GitHub**

---

## Step 1 — Open PowerShell in the working folder

```powershell
cd C:\Users\sharr\govscout_build
```

---

## Step 2 — Verify git is initialized and remote is set

```powershell
git remote -v
```

Expected output:
```
origin  https://github.com/HSG89436/govscout-pro.git (fetch)
origin  https://github.com/HSG89436/govscout-pro.git (push)
```

If the remote is missing, run:
```powershell
git remote add origin https://github.com/HSG89436/govscout-pro.git
```

---

## Step 3 — Set the branch to main

```powershell
git branch -m main
```

---

## Step 4 — Check what GitHub already has

```powershell
git fetch origin 2>&1
```

If the remote repo is EMPTY (new repo): skip to Step 5.

If the remote has existing content, you need to decide: merge or overwrite.
**Contact Engineering Director before proceeding if the remote has commits.**

---

## Step 5 — Stage all files

```powershell
git add -A
git status
```

Review what will be committed. Should include:
- `/docs/` (3 architecture documents)
- `/prompts/` (Marcus prompt v1.0, CASE FILE template, changelog)
- `/reports/` (engineering_report.md, executive_report.md)
- `/tasks/` (QA_SCENARIOS.md, GIT_PUSH_INSTRUCTIONS.md, mvp_task_list.md)
- `/src/.gitkeep`
- `/marketing/README.md`
- All `netlify/functions/*.js`
- All HTML pages, `netlify.toml`, `package.json`, etc.

**DO NOT stage:**
- `*.zip` files (Netlify build artifacts — add to .gitignore if not already)
- `.netlify/db/` directory (local database files — already in .gitignore)
- `auth_result.txt`, `test_result.txt`, `netlify_deploy_out.txt` (local artifacts)

---

## Step 6 — Update .gitignore before committing

Add these lines to `.gitignore` if not already present:

```
# Netlify function build artifacts
netlify/functions/*.zip
netlify/functions/zi*

# Local test/deploy artifacts
auth_result.txt
test_result.txt
netlify_deploy_out.txt
test_out.html

# Local utility scripts (not source code)
*.ps1
add_auth.py
backup_copy.py
read_html.py
rebuild_*.py
rewrite_auth.py
test_edit.py
run_deploy.*
netlify_deploy.js
poll_deploy.ps1
```

After editing .gitignore:
```powershell
git add .gitignore
```

---

## Step 7 — Commit

```powershell
git commit -m "v6.1 baseline: architecture docs, prompts, QA scenarios, repo structure

- Add /docs/marcus_architecture.md
- Add /docs/repository_structure.md
- Add /docs/operational_dashboard.md
- Add /prompts/marcus_system_v1.0.txt (extracted from chat.js)
- Add /prompts/report_case_file_v1.0.txt
- Add /prompts/PROMPT_CHANGELOG.md
- Add /reports/engineering_report.md
- Add /reports/executive_report.md
- Add /tasks/QA_SCENARIOS.md
- Add /src/.gitkeep
- Add /marketing/README.md
- Establish GitHub as operational source-of-truth per engineering directive 2026-05-28

Closes: repository structure correction directive
Relates to: Executive Report Issues #1, #2"
```

---

## Step 8 — Push to GitHub

If the remote repo is empty (first push):
```powershell
git push -u origin main
```

If the remote has existing content and you want to overwrite it (confirm with Engineering Director first):
```powershell
git push -u origin main --force
```

---

## Step 9 — Tag as v6.1-stable (AFTER Issue #1 credential rotation)

⚠ Do NOT tag until QA credential is rotated.

After Issue #1 is closed:
```powershell
git tag -a v6.1-stable -m "v6.1 production baseline — all launch gate defects fixed in code"
git push origin v6.1-stable
```

---

## Step 10 — Update engineering_report.md

After successful push, update `reports/engineering_report.md` GitHub Repository Status
section to reflect:
- `Committed to GitHub: ✅ YES — commit hash [hash]`
- `Authoritative Baseline Confirmed: ⚠ Pending v6.1-stable tag`

Commit and push the updated report.

---

## Notes

- GitHub will ask for credentials on `git push`. Use your GitHub username and a Personal Access Token (not your password). Generate a token at: https://github.com/settings/tokens
- If you get a "refusing to merge unrelated histories" error, run: `git pull origin main --allow-unrelated-histories` then resolve any conflicts before pushing.
