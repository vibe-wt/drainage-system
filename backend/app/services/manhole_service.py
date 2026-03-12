import json

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.manhole import Manhole
from app.repositories.common_queries import geometry_as_geojson
from app.repositories.manhole_repository import (
    create_manhole as create_manhole_entity,
    delete_manhole as delete_manhole_entity,
    get_manhole,
    update_manhole as update_manhole_entity,
)
from app.schemas.manhole import CreateManholeRequest, UpdateManholeRequest


def serialize_manhole(db: Session, entity: Manhole) -> dict:
    geom = geometry_as_geojson(db, Manhole, entity.id)
    return {
        "id": entity.id,
        "code": entity.code,
        "name": entity.name,
        "object_type": "manhole",
        "risk_level": entity.risk_level,
        "status": entity.status,
        "properties": {
            "manhole_type": entity.manhole_type,
            "catchment_name": entity.catchment_name,
            "depth_m": entity.depth_m,
        },
        "geom": json.loads(geom),
    }


def create_manhole(db: Session, payload: CreateManholeRequest) -> dict:
    try:
        entity = create_manhole_entity(db, payload)
    except IntegrityError as exc:
        db.rollback()
        if "manholes_code_key" in str(exc.orig):
            raise HTTPException(status_code=409, detail="检查井编号已存在，请更换编号。") from exc
        raise HTTPException(status_code=400, detail="检查井保存失败。") from exc
    return serialize_manhole(db, entity)


def update_manhole(db: Session, manhole_id: str, payload: UpdateManholeRequest) -> dict:
    try:
        entity = update_manhole_entity(db, manhole_id, payload)
    except IntegrityError as exc:
        db.rollback()
        if "manholes_code_key" in str(exc.orig):
            raise HTTPException(status_code=409, detail="检查井编号已存在，请更换编号。") from exc
        raise HTTPException(status_code=400, detail="检查井更新失败。") from exc
    if entity is None:
        raise HTTPException(status_code=404, detail="manhole not found")
    return serialize_manhole(db, entity)


def delete_manhole(db: Session, manhole_id: str) -> dict[str, bool]:
    deleted = delete_manhole_entity(db, manhole_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="manhole not found")
    return {"success": True}
