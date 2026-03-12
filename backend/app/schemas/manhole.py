from pydantic import BaseModel

from app.schemas.map_objects import MapFeature


class CreateManholeRequest(BaseModel):
    code: str
    name: str
    risk_level: str = "low"
    manhole_type: str = "污水井"
    catchment_name: str = ""
    depth_m: float = 0.0
    coordinates: list[float]


class UpdateManholeRequest(BaseModel):
    code: str
    name: str
    risk_level: str = "low"
    manhole_type: str = "污水井"
    catchment_name: str = ""
    depth_m: float = 0.0
    coordinates: list[float] | None = None


class ManholeResponse(BaseModel):
    data: MapFeature
