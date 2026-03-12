from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.models.manhole import Manhole
from app.schemas.manhole import CreateManholeRequest, UpdateManholeRequest


def count_manholes(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Manhole)) or 0


def create_manhole(db: Session, payload: CreateManholeRequest) -> Manhole:
    lng, lat = payload.coordinates
    entity = Manhole(
        id=f"mh_{count_manholes(db) + 1:03d}",
        code=payload.code,
        name=payload.name,
        risk_level=payload.risk_level,
        status="active",
        manhole_type=payload.manhole_type,
        catchment_name=payload.catchment_name,
        depth_m=payload.depth_m,
        geom=func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326),
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def get_manhole(db: Session, manhole_id: str) -> Manhole | None:
    return db.get(Manhole, manhole_id)


def update_manhole(db: Session, manhole_id: str, payload: UpdateManholeRequest) -> Manhole | None:
    entity = get_manhole(db, manhole_id)
    if entity is None:
        return None

    entity.code = payload.code
    entity.name = payload.name
    entity.risk_level = payload.risk_level
    entity.manhole_type = payload.manhole_type
    entity.catchment_name = payload.catchment_name
    entity.depth_m = payload.depth_m
    if payload.coordinates is not None:
        lng, lat = payload.coordinates
        entity.geom = func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)
    db.commit()
    db.refresh(entity)
    return entity


def delete_manhole(db: Session, manhole_id: str) -> bool:
    entity = get_manhole(db, manhole_id)
    if entity is None:
        return False
    db.delete(entity)
    db.commit()
    return True
