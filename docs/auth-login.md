# Auth Login Foundation

This document summarizes the auth/login work completed in the `codex/auth-login` worktree.

## Goal

Provide the stage-1 drainage system with a lightweight but extensible authentication foundation for multi-user usage.

Current focus:

- login page
- persistent login session
- protected routes
- user and session data model
- lightweight role guards
- user/session management basics
- auth audit trail

Out of scope for this phase:

- full RBAC matrix and permission editor
- multi-tenant isolation
- admin-console business features
- map workbench interaction redesign

## Implemented Scope

### Frontend

- login page at `/login`
- protected application routes
- auth provider with session restore
- global 401 handling and redirect to login
- user and access page at `/access`
- current account update
- user creation, status toggle, password reset
- current session list and session revoke
- auth audit list for admins

### Backend

- `User` model
- `UserSession` model
- `AuthAuditLog` model
- password hashing and session token hashing
- auth routes under `/api/v1/auth`
- seed admin bootstrap on init
- role guards:
  - `viewer`: read only
  - `editor`: import, edit, analysis run
  - `admin`: editor abilities plus user management and audit access

## Main Routes

### Session and identity

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `POST /api/v1/auth/logout`

### Session management

- `GET /api/v1/auth/me/sessions`
- `DELETE /api/v1/auth/me/sessions/{session_id}`

### User management

- `GET /api/v1/auth/users`
- `POST /api/v1/auth/users`
- `PATCH /api/v1/auth/users/{user_id}/status`
- `PATCH /api/v1/auth/users/{user_id}/password`

### Audit

- `GET /api/v1/auth/audit-logs`

## Role Rules

### `viewer`

- can view map, dashboard, import records, analysis results, user/access page
- cannot create import batches
- cannot edit map objects
- cannot run analysis
- cannot manage users

### `editor`

- inherits viewer read access
- can upload/import data
- can create/update/delete plots, pipes, and manholes
- can run low COD analysis
- cannot manage users

### `admin`

- inherits editor abilities
- can create users
- can enable/disable users
- can reset user passwords
- can read auth audit logs

## Frontend Entry Points

- app root: `http://localhost:4177/`
- login page: `http://localhost:4177/login`
- user/access page: `http://localhost:4177/access`

## Environment Variables

### Backend

See [backend/.env.example](/Users/wutong/Code/drainage-system-auth-login/backend/.env.example).

Key variables:

- `DATABASE_URL`
- `CORS_ORIGINS`
- `CORS_ORIGIN_REGEX`
- `SESSION_COOKIE_NAME`
- `SESSION_TTL_HOURS`
- `SESSION_SECURE_COOKIES`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

### Frontend

See [frontend/.env.example](/Users/wutong/Code/drainage-system-auth-login/frontend/.env.example).

Key variable:

- `VITE_API_BASE_URL`

## Validation

### Frontend

```bash
cd /Users/wutong/Code/drainage-system-auth-login/frontend
npm run build
```

### Backend syntax check

```bash
cd /Users/wutong/Code/drainage-system-auth-login/backend
python3 -m compileall app
```

### Auth tests

```bash
cd /Users/wutong/Code/drainage-system-auth-login
pytest backend/tests/test_auth_routes.py
```

## Commit Trail

- `f730bbf` Add auth login foundation
- `96ecd06` Add auth session handling and user APIs
- `4c92bc3` Add user access page
- `fffda26` Add user management actions
- `28d3a77` Add session management view
- `ca7aaed` Add role-based write guards
- `e134f42` Add auth audit log foundation
- `297e521` Externalize auth environment config
- `183bdc9` Add auth route tests

## Next Recommended Steps

- add auth integration notes for merge back to main
- add backend auth service/repository unit tests
- add migration tooling instead of relying only on `create_all`
- decide whether admin-console should consume `/auth/users` directly or through a dedicated admin facade
