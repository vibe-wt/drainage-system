from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.repositories.map_repository import list_manholes, list_pipes
from app.services.static_map_data import line_length_meters, list_static_objects, search_static_objects


def list_map_objects(db: Session) -> dict[str, list[dict[str, Any]]]:
    data = list_static_objects().copy()
    data["manholes"] = list_manholes(db)
    data["pipes"] = list_pipes(db)
    return data


def object_counts(db: Session) -> dict[str, int]:
    return {key: len(value) for key, value in list_map_objects(db).items()}


def map_stats(db: Session) -> dict[str, float | int]:
    objects = list_map_objects(db)
    pipe_length = sum(line_length_meters(pipe["geom"]["coordinates"]) for pipe in objects["pipes"])
    return {
        "manhole_count": len(objects["manholes"]),
        "pipe_count": len(objects["pipes"]),
        "pipe_length_m": round(pipe_length, 1),
        "monitoring_point_count": len(objects["monitoring_points"]),
    }


def search_objects(db: Session, keyword: str) -> list[dict[str, Any]]:
    normalized = keyword.strip().lower()
    if not normalized:
        return []

    results = search_static_objects(keyword)
    for collection in [list_manholes(db), list_pipes(db)]:
        for item in collection:
            text = " ".join([item.get("code", ""), item.get("name", ""), item.get("object_type", "")]).lower()
            if normalized not in text:
                continue
            results.append(
                {
                    "object_type": item["object_type"],
                    "object_id": item["id"],
                    "title": item["name"],
                    "subtitle": item["code"],
                    "risk_level": item["risk_level"],
                    "geom": item["geom"],
                }
            )
    return results
