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

Current auth/login foundation supports configuring API base URL, CORS origins, session cookie policy, and seed admin credentials through environment variables.
