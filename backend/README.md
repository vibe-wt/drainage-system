# Backend

FastAPI application for the drainage system.

## Database

Start PostgreSQL + PostGIS locally:

```bash
docker compose -f /Users/wutong/Code/drainage-system/infra/docker-compose.yml up -d
```

Then copy `.env.example` to `.env` if needed.

## Run

```bash
uvicorn app.main:app --reload
```
