from typing import Any, Literal

from pydantic import BaseModel


GeometryType = Literal["Point", "LineString", "Polygon"]


class Geometry(BaseModel):
    type: GeometryType
    coordinates: Any


class MapFeature(BaseModel):
    id: str
    code: str
    name: str
    object_type: str
    risk_level: str
    status: str
    properties: dict[str, Any]
    geom: Geometry


class MapObjectsResponse(BaseModel):
    data: dict[str, list[MapFeature]]
    meta: dict[str, Any]


class MapStatsData(BaseModel):
    manhole_count: int
    pipe_count: int
    pipe_length_m: float
    monitoring_point_count: int


class MapStatsResponse(BaseModel):
    data: MapStatsData


class SearchResultItem(BaseModel):
    object_type: str
    object_id: str
    title: str
    subtitle: str
    risk_level: str
    geom: Geometry


class SearchResponse(BaseModel):
    items: list[SearchResultItem]
