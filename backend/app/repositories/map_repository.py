from __future__ import annotations

import json
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.manhole import Manhole
from app.models.pipe import Pipe


def _parse_geojson(value: str) -> dict[str, Any]:
    return json.loads(value)


def list_manholes(db: Session) -> list[dict[str, Any]]:
    stmt = select(
        Manhole.id,
        Manhole.code,
        Manhole.name,
        Manhole.risk_level,
        Manhole.status,
        Manhole.manhole_type,
        Manhole.catchment_name,
        Manhole.depth_m,
        func.ST_AsGeoJSON(Manhole.geom).label("geom"),
    )
    rows = db.execute(stmt).all()
    return [
        {
            "id": row.id,
            "code": row.code,
            "name": row.name,
            "object_type": "manhole",
            "risk_level": row.risk_level,
            "status": row.status,
            "properties": {
                "manhole_type": row.manhole_type,
                "catchment_name": row.catchment_name,
                "depth_m": row.depth_m,
            },
            "geom": _parse_geojson(row.geom),
        }
        for row in rows
    ]


def list_pipes(db: Session) -> list[dict[str, Any]]:
    stmt = select(
        Pipe.id,
        Pipe.code,
        Pipe.name,
        Pipe.risk_level,
        Pipe.status,
        Pipe.pipe_type,
        Pipe.diameter_mm,
        Pipe.start_manhole_id,
        Pipe.end_manhole_id,
        func.ST_AsGeoJSON(Pipe.geom).label("geom"),
    )
    rows = db.execute(stmt).all()
    return [
        {
            "id": row.id,
            "code": row.code,
            "name": row.name,
            "object_type": "pipe",
            "risk_level": row.risk_level,
            "status": row.status,
            "properties": {
                "pipe_type": row.pipe_type,
                "diameter_mm": row.diameter_mm,
                "start_manhole_id": row.start_manhole_id,
                "end_manhole_id": row.end_manhole_id,
            },
            "geom": _parse_geojson(row.geom),
        }
        for row in rows
    ]
