# Auth Merge Checklist

This checklist is for merging the `codex/auth-login` worktree back into main or for aligning adjacent worktrees with the auth foundation.

## Merge Target

Base branch at time of implementation:

- `main`
- commit: `ed38f28`

Auth branch commits:

- `f730bbf` Add auth login foundation
- `96ecd06` Add auth session handling and user APIs
- `4c92bc3` Add user access page
- `fffda26` Add user management actions
- `28d3a77` Add session management view
- `ca7aaed` Add role-based write guards
- `e134f42` Add auth audit log foundation
- `297e521` Externalize auth environment config
- `183bdc9` Add auth route tests
- `3de2f58` Document auth login foundation

## What Will Change On Merge

### Frontend

- `/login` route becomes public entry
- application routes move behind `ProtectedRoute`
- global auth provider wraps router
- top navigation gains current user session info and logout
- new `/access` page appears for user/session/audit management
- all API requests include credentials

### Backend

- `/api/v1/auth/*` route group is added
- most existing business routes require authenticated session
- write endpoints for import/object editing/analysis require `editor` or `admin`
- auth schema is managed by Alembic baseline migration

## Pre-Merge Checks

- confirm main has not significantly changed `frontend/src/app/router/index.tsx`
- confirm main has not significantly changed `frontend/src/app/layouts/app-shell.tsx`
- confirm main has not changed API client conventions in `frontend/src/shared/api/client.ts`
- confirm main has not introduced Alembic or a different migration path
- confirm main backend still uses the same `api_router` composition pattern

## Files Likely To Conflict

### High chance

- [frontend/src/app/router/index.tsx](/Users/wutong/Code/drainage-system-auth-login/frontend/src/app/router/index.tsx)
- [frontend/src/app/layouts/app-shell.tsx](/Users/wutong/Code/drainage-system-auth-login/frontend/src/app/layouts/app-shell.tsx)
- [frontend/src/shared/api/client.ts](/Users/wutong/Code/drainage-system-auth-login/frontend/src/shared/api/client.ts)
- [frontend/src/styles/global.css](/Users/wutong/Code/drainage-system-auth-login/frontend/src/styles/global.css)
- [backend/app/api/router.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/api/router.py)
- [backend/app/api/deps.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/api/deps.py)
- [backend/app/main.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/main.py)
- [backend/app/db/init_db.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/db/init_db.py)

### Lower chance but auth-critical

- [backend/app/core/config.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/core/config.py)
- [backend/app/models/__init__.py](/Users/wutong/Code/drainage-system-auth-login/backend/app/models/__init__.py)
- [README.md](/Users/wutong/Code/drainage-system-auth-login/README.md)
- [backend/README.md](/Users/wutong/Code/drainage-system-auth-login/backend/README.md)

## Main Merge Steps

1. Rebase or merge `main` into `codex/auth-login`.
2. Resolve conflicts in router, layout, API client, and global styles first.
3. Verify auth routes are still mounted under `/api/v1/auth`.
4. Verify business routes still depend on authenticated session.
5. Verify write endpoints still use `require_editor_user` where intended.
6. Carry over environment templates:
   - [backend/.env.example](/Users/wutong/Code/drainage-system-auth-login/backend/.env.example)
   - [frontend/.env.example](/Users/wutong/Code/drainage-system-auth-login/frontend/.env.example)
7. Start backend and confirm seed admin account is created in local DB.
8. Start frontend and verify `/login`, `/`, `/access`.
9. Run auth test suite.
10. Run frontend build.

## Validation Commands

### Frontend

```bash
cd /Users/wutong/Code/drainage-system-auth-login/frontend
npm run build
```

### Backend

```bash
cd /Users/wutong/Code/drainage-system-auth-login/backend
python3 -m compileall app
```

### Auth tests

```bash
cd /Users/wutong/Code/drainage-system-auth-login
pytest backend/tests/test_auth_routes.py backend/tests/auth/test_auth_service_db.py
```

## Integration Notes For `admin-console`

- do not copy auth logic into admin-console
- consume existing auth APIs from this branch:
  - `/api/v1/auth/me`
  - `/api/v1/auth/users`
  - `/api/v1/auth/users/{user_id}/status`
  - `/api/v1/auth/users/{user_id}/password`
  - `/api/v1/auth/audit-logs`
- admin-console should rely on backend role checks instead of re-implementing permission truth on the client
- if admin-console adds richer user CRUD later, extend current auth routes or add a dedicated admin facade backed by the same auth service layer

## Integration Notes For `map-polish`

- do not change auth rules in map-polish
- keep map workbench pages behind `ProtectedRoute`
- map-polish can safely improve visual/interaction details as long as it does not remove:
  - auth provider wrapper
  - credentialed fetch calls
  - redirect-on-401 behavior
- any new map editing or import action should remain behind `editor/admin` server-side checks

## Known Technical Debt

- logout audit currently records anonymous actor unless mapped from session before revoke
- password policy is minimal and should be strengthened before production use
- auth tests cover route and DB-backed service flows, but production deployment checks are still missing

## Recommendation

Merge auth foundation before adding more admin-console user workflows. If admin-console lands first with separate auth assumptions, conflict resolution cost will go up and permission truth may diverge.
