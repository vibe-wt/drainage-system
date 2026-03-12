from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import AnalysisRun, Manhole, Pipe  # noqa: F401
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
    Base.metadata.create_all(bind=engine)
    seed_initial_data()


def seed_initial_data() -> None:
    db = SessionLocal()
    try:
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
