# Stage 1 Implementation Plan

## Goal

Build a high-quality demo-ready GIS + analysis platform with map as the primary entry point.

## Users

- leadership dashboard viewers
- project managers

## Stage 1 Scope

Pages:

- map workbench
- dashboard
- import management
- analysis center

Core capabilities:

- asset visualization for manholes, pipes, outfalls, pump stations, plots, catchments, monitoring points, task areas
- map interactions: click, search, layer toggle, box select, draw, edit, filter, measure, stats
- data import: manual entry, Excel, GeoJSON
- analysis: low COD intrusion risk analysis

Excluded from stage 1:

- full task workflow
- auth and permissions
- multi-tenant support
- native mobile app
- real-time sensor platform
- advanced AI models

## Architecture

- Frontend: React + TypeScript + Vite + OpenLayers + ECharts
- Backend: FastAPI + layered modules
- Database: PostgreSQL + PostGIS

## Frontend Structure

```text
frontend/src/
├── app/
├── pages/
├── features/
├── entities/
├── widgets/
├── shared/
└── styles/
```

## Backend Structure

```text
backend/app/
├── api/
├── core/
├── db/
├── models/
├── schemas/
├── repositories/
├── services/
├── analysis/
├── imports/
└── main.py
```

## Milestones

1. app foundation
2. map core
3. map editing and data import
4. dashboard and low COD analysis
5. demo polish

## Branch Strategy

- `codex/app-foundation`
- `codex/map-core`
- `codex/map-editing`
- `codex/data-import`
- `codex/dashboard`
- `codex/analysis-low-cod`
- `codex/demo-polish`

## Core APIs

- `GET /api/v1/health`
- `GET /api/v1/map/objects`
- `GET /api/v1/map/stats`
- `GET /api/v1/search`
- resource CRUD for stage 1 spatial entities
- import batch APIs
- low COD analysis APIs
- dashboard aggregate APIs
