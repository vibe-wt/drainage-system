import json

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.pipe import Pipe
from app.repositories.common_queries import geometry_as_geojson
from app.repositories.pipe_repository import (
    create_pipe as create_pipe_entity,
    delete_pipe as delete_pipe_entity,
    update_pipe as update_pipe_entity,
)
from app.schemas.pipe import CreatePipeRequest, UpdatePipeRequest


def serialize_pipe(db: Session, entity: Pipe) -> dict:
    geom = geometry_as_geojson(db, Pipe, entity.id)
    return {
        "id": entity.id,
        "code": entity.code,
        "name": entity.name,
        "object_type": "pipe",
        "risk_level": entity.risk_level,
        "status": entity.status,
        "properties": {
            "pipe_type": entity.pipe_type,
            "diameter_mm": entity.diameter_mm,
            "start_manhole_id": entity.start_manhole_id,
            "end_manhole_id": entity.end_manhole_id,
        },
        "geom": json.loads(geom),
    }


def create_pipe(db: Session, payload: CreatePipeRequest) -> dict:
    try:
        entity = create_pipe_entity(db, payload)
    except IntegrityError as exc:
        db.rollback()
        if "pipes_code_key" in str(exc.orig):
            raise HTTPException(status_code=409, detail="管道编号已存在，请更换编号。") from exc
        raise HTTPException(status_code=400, detail="管道保存失败。") from exc
    return serialize_pipe(db, entity)


def update_pipe(db: Session, pipe_id: str, payload: UpdatePipeRequest) -> dict:
    try:
        entity = update_pipe_entity(db, pipe_id, payload)
    except IntegrityError as exc:
        db.rollback()
        if "pipes_code_key" in str(exc.orig):
            raise HTTPException(status_code=409, detail="管道编号已存在，请更换编号。") from exc
        raise HTTPException(status_code=400, detail="管道更新失败。") from exc
    if entity is None:
        raise HTTPException(status_code=404, detail="pipe not found")
    return serialize_pipe(db, entity)


def delete_pipe(db: Session, pipe_id: str) -> dict[str, bool]:
    deleted = delete_pipe_entity(db, pipe_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="pipe not found")
    return {"success": True}
