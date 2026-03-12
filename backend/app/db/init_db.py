from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text

from app.db.session import engine, SessionLocal
from app.models import AuthAuditLog, AnalysisRun, Manhole, Pipe, User, UserSession  # noqa: F401
from app.services.auth_service import ensure_seed_admin
from app.repositories.manhole_repository import count_manholes
from app.repositories.pipe_repository import count_pipes
from app.schemas.manhole import CreateManholeRequest
from app.schemas.pipe import CreatePipeRequest
from app.services.static_map_data import INITIAL_MANHOLES, INITIAL_PIPES
from app.repositories.manhole_repository import create_manhole
from app.repositories.pipe_repository import create_pipe


def init_db() -> None:
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    run_migrations()
    seed_initial_data()


def run_migrations() -> None:
    alembic_config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    command.upgrade(alembic_config, "head")


def seed_initial_data() -> None:
    db = SessionLocal()
    try:
        ensure_seed_admin(db)
        if count_manholes(db) == 0:
            for item in INITIAL_MANHOLES:
                create_manhole(
                    db,
                    CreateManholeRequest(
                        code=item["code"],
                        name=item["name"],
                        risk_level=item["risk_level"],
                        manhole_type=item["properties"]["manhole_type"],
                        catchment_name=item["properties"]["catchment_name"],
                        depth_m=item["properties"]["depth_m"],
                        coordinates=item["geom"]["coordinates"],
                    ),
                )
        if count_pipes(db) == 0:
            for item in INITIAL_PIPES:
                create_pipe(
                    db,
                    CreatePipeRequest(
                        code=item["code"],
                        name=item["name"],
                        risk_level=item["risk_level"],
                        pipe_type=item["properties"]["pipe_type"],
                        diameter_mm=item["properties"]["diameter_mm"],
                        start_manhole_id=item["properties"]["start_manhole_id"],
                        end_manhole_id=item["properties"]["end_manhole_id"],
                        coordinates=item["geom"]["coordinates"],
                    ),
                )
    finally:
        db.close()
