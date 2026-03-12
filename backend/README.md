# Backend

FastAPI application for the drainage system.

## Database

Start PostgreSQL + PostGIS locally:

```bash
docker compose -f /Users/wutong/Code/drainage-system/infra/docker-compose.yml up -d
```

Then copy `.env.example` to `.env` if needed.

Key auth-related env vars:

```bash
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5433/drainage_system
CORS_ORIGINS=http://localhost:4173,http://localhost:4177
SESSION_COOKIE_NAME=drainage_session
SESSION_TTL_HOURS=12
SESSION_SECURE_COOKIES=false
SEED_ADMIN_EMAIL=admin@drainage.local
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_ADMIN_NAME=System Admin
```

## Run

```bash
uvicorn app.main:app --reload
```
