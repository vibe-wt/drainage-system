from pydantic import BaseModel

from app.schemas.map_objects import MapFeature


class CreatePipeRequest(BaseModel):
    code: str
    name: str
    risk_level: str = "low"
    pipe_type: str = "污水"
    diameter_mm: int = 400
    start_manhole_id: str = ""
    end_manhole_id: str = ""
    coordinates: list[list[float]]


class UpdatePipeRequest(BaseModel):
    code: str
    name: str
    risk_level: str = "low"
    pipe_type: str = "污水"
    diameter_mm: int = 400
    start_manhole_id: str = ""
    end_manhole_id: str = ""
    coordinates: list[list[float]] | None = None


class PipeResponse(BaseModel):
    data: MapFeature
