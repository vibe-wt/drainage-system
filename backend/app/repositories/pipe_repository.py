from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.pipe import Pipe
from app.schemas.pipe import CreatePipeRequest, UpdatePipeRequest


def count_pipes(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Pipe)) or 0


def sum_pipe_length_m(db: Session) -> float:
    stmt = select(func.sum(func.ST_Length(func.ST_Transform(Pipe.geom, 3857))))
    value = db.scalar(stmt)
    return round(float(value or 0), 1)


def _to_linestring_wkt(coordinates: list[list[float]]) -> str:
    joined = ", ".join(f"{lng} {lat}" for lng, lat in coordinates)
    return f"LINESTRING({joined})"


def create_pipe(db: Session, payload: CreatePipeRequest) -> Pipe:
    entity = Pipe(
        id=f"pipe_{count_pipes(db) + 1:03d}",
        code=payload.code,
        name=payload.name,
        risk_level=payload.risk_level,
        status="active",
        pipe_type=payload.pipe_type,
        diameter_mm=payload.diameter_mm,
        start_manhole_id=payload.start_manhole_id,
        end_manhole_id=payload.end_manhole_id,
        geom=func.ST_GeomFromText(_to_linestring_wkt(payload.coordinates), 4326),
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def get_pipe(db: Session, pipe_id: str) -> Pipe | None:
    return db.get(Pipe, pipe_id)


def update_pipe(db: Session, pipe_id: str, payload: UpdatePipeRequest) -> Pipe | None:
    entity = get_pipe(db, pipe_id)
    if entity is None:
        return None

    entity.code = payload.code
    entity.name = payload.name
    entity.risk_level = payload.risk_level
    entity.pipe_type = payload.pipe_type
    entity.diameter_mm = payload.diameter_mm
    entity.start_manhole_id = payload.start_manhole_id
    entity.end_manhole_id = payload.end_manhole_id
    if payload.coordinates is not None:
        entity.geom = func.ST_GeomFromText(_to_linestring_wkt(payload.coordinates), 4326)
    db.commit()
    db.refresh(entity)
    return entity


def delete_pipe(db: Session, pipe_id: str) -> bool:
    entity = get_pipe(db, pipe_id)
    if entity is None:
        return False
    db.delete(entity)
    db.commit()
    return True
