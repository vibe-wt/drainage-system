# Drainage System

GIS + analysis integrated platform for drainage network demo and research scenarios.

## Stage 1

Stage 1 focuses on:

- map workbench
- dashboard
- import management
- low COD intrusion analysis

## Repository Layout

```text
drainage-system/
├── frontend/
├── backend/
├── docs/
├── infra/
├── sample-data/
└── scripts/
```

## Tech Stack

- Frontend: React + TypeScript + Vite + OpenLayers
- Backend: FastAPI
- Database: PostgreSQL + PostGIS

## Current Status

Project foundation scaffold initialized. See [docs/implementation/stage-1-plan.md](/Users/wutong/Code/drainage-system/docs/implementation/stage-1-plan.md).

## Auth Login Env

- Backend example env: [backend/.env.example](/Users/wutong/Code/drainage-system-auth-login/backend/.env.example)
- Frontend example env: [frontend/.env.example](/Users/wutong/Code/drainage-system-auth-login/frontend/.env.example)
- Auth implementation note: [docs/auth-login.md](/Users/wutong/Code/drainage-system-auth-login/docs/auth-login.md)
- Auth merge checklist: [docs/auth-merge-checklist.md](/Users/wutong/Code/drainage-system-auth-login/docs/auth-merge-checklist.md)
- Auth PR note: [docs/auth-pr-note.md](/Users/wutong/Code/drainage-system-auth-login/docs/auth-pr-note.md)
- Auth merge rehearsal: [docs/auth-merge-rehearsal.md](/Users/wutong/Code/drainage-system-auth-login/docs/auth-merge-rehearsal.md)

Current auth/login foundation supports configuring API base URL, CORS origins, session cookie policy, and seed admin credentials through environment variables.
