from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:4173",
            "http://localhost:4174",
            "http://localhost:4175",
            "http://localhost:4176",
            "http://localhost:4177",
            "http://127.0.0.1:4173",
            "http://127.0.0.1:4174",
            "http://127.0.0.1:4175",
            "http://127.0.0.1:4176",
            "http://127.0.0.1:4177",
            "http://0.0.0.0:4173",
            "http://0.0.0.0:4174",
            "http://0.0.0.0:4175",
            "http://0.0.0.0:4176",
            "http://0.0.0.0:4177",
        ],
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1|0\.0\.0\.0):4\d{3}",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
