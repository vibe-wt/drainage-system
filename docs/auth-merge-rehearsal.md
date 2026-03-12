# Auth Merge Rehearsal

This note records the latest merge rehearsal result for `codex/auth-login`.

## Rehearsal Date

- 2026-03-12

## Inputs

- current branch: `codex/auth-login`
- upstream target checked: `origin/main`

## Result

- local `main` commit: `ed38f28`
- remote `origin/main` commit: `ed38f28`
- auth branch merge base with `origin/main`: `ed38f28`

At the time of rehearsal, `origin/main` had not moved beyond the original auth branch split point.

That means:

- there is no newer mainline change to replay against yet
- there are currently no real merge conflicts to resolve
- the auth branch can still be reviewed as a clean branch-over-base delta

## Current Conflict Assessment

Potential conflict files are still the same structural entry points already listed in the merge checklist:

- [frontend/src/app/router/index.tsx](/Users/wutong/Code/drainage-system-auth-login/frontend/src/app/router/index.tsx)
- [frontend/src/app/layouts/app-shell.tsx](/Users/wutong/Code/drainage-system-auth-login/frontend/src/app/layouts/app-shell.tsx)
- [frontend/src/shared/api/client.ts](/Users/wutong/Code/drainage-system-auth-login/frontend/src/shared/api/client.ts)
- [frontend/src/styles/global.css](/Users/wutong/Code/drainage-system-auth-login/frontend/src/styles/global.css)
- [backend/app/api/router.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/api/router.py)
- [backend/app/api/deps.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/api/deps.py)
- [backend/app/main.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/main.py)
- [backend/app/db/init_db.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/db/init_db.py)

These are not current conflicts. They are the places most likely to conflict once `main` moves.

## Suggested Next Rehearsal Trigger

Run the next merge rehearsal when either of these happens:

- `origin/main` advances with frontend shell, router, or API client changes
- adjacent worktrees land changes to backend startup, dependency guards, or shared styles

## Minimal Rehearsal Commands

```bash
cd /Users/wutong/Code/drainage-system-auth-login
git fetch origin main
git merge-base origin/main codex/auth-login
git diff --name-only $(git merge-base origin/main codex/auth-login)..origin/main
git diff --name-only $(git merge-base origin/main codex/auth-login)..codex/auth-login
```
