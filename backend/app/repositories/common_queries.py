from __future__ import annotations

import json
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session


def parse_geojson(value: str) -> dict[str, Any]:
    return json.loads(value)


def geometry_as_geojson(db: Session, model, row_id: str):
    return db.scalar(select(func.ST_AsGeoJSON(model.geom)).where(model.id == row_id))
