# Auth Login PR Note

This note is the short merge-facing summary for the `codex/auth-login` worktree.

## Scope

This branch adds the stage-1 authentication foundation only:

- public login page
- persistent server-side session
- protected frontend routes
- backend auth route group
- user/session/audit data model
- lightweight role guards for `viewer`, `editor`, `admin`
- user access page for current account, sessions, user management, and auth audit

Explicitly not included:

- full RBAC matrix
- tenant isolation
- admin-console business features
- map workbench interaction redesign

## Main User-Facing Changes

- unauthenticated users are redirected to `/login`
- successful login restores access to the original route
- current session is restored on page refresh
- `/access` provides a lightweight user and access management entry
- permission failures now show explicit `403` guidance instead of failing silently

## Backend Integration Changes

- new routes under `/api/v1/auth`
- existing business APIs now require authenticated session by default
- write APIs for import, object editing, and analysis now require `editor` or `admin`
- auth schema is initialized by Alembic baseline migration plus seed admin bootstrap

## Files Reviewers Should Focus On

- [frontend/src/app/router/index.tsx](/Users/wutong/Code/drainage-system-auth-login/frontend/src/app/router/index.tsx)
- [frontend/src/features/auth/auth-context.tsx](/Users/wutong/Code/drainage-system-auth-login/frontend/src/features/auth/auth-context.tsx)
- [frontend/src/pages/login/index.tsx](/Users/wutong/Code/drainage-system-auth-login/frontend/src/pages/login/index.tsx)
- [frontend/src/pages/user-access/index.tsx](/Users/wutong/Code/drainage-system-auth-login/frontend/src/pages/user-access/index.tsx)
- [backend/app/api/routes/auth.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/api/routes/auth.py)
- [backend/app/api/deps.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/api/deps.py)
- [backend/app/services/auth_service.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/services/auth_service.py)
- [backend/alembic/versions/20260312_0001_initial_schema.py](/Users/wutong/Code/drainage-system-auth-login/backend/alembic/versions/20260312_0001_initial_schema.py)

## Validation Done

- frontend build:
  - `cd /Users/wutong/Code/drainage-system-auth-login/frontend`
  - `npm run build`
- backend syntax:
  - `cd /Users/wutong/Code/drainage-system-auth-login/backend`
  - `python3 -m compileall app`
- backend migration:
  - `python3 -m alembic upgrade head`
- auth tests:
  - `cd /Users/wutong/Code/drainage-system-auth-login`
  - `pytest backend/tests/test_auth_routes.py backend/tests/auth/test_auth_service_db.py`

## Merge Risks

- likely conflicts in router, app shell, global styles, and shared API client
- adjacent worktrees must not duplicate auth rules on the client
- production deployment still needs stronger password policy and cookie/CSRF review

## Recommendation

Merge this branch before adding more admin-console user workflows. Treat backend auth guards as the single source of truth, and keep adjacent branches limited to consuming the current auth APIs.
