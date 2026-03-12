from pydantic import BaseModel, Field

from app.schemas.map_objects import MapFeature


class CreatePlotRequest(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    risk_level: str = Field(default="low")
    plot_type: str = Field(default="小区")
    water_usage_m3d: float = Field(default=0)
    cod_baseline: float = Field(default=400)
    coordinates: list[tuple[float, float]] = Field(min_length=3)


class PlotResponse(BaseModel):
    data: MapFeature


class UpdatePlotRequest(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    risk_level: str = Field(default="low")
    plot_type: str = Field(default="小区")
    water_usage_m3d: float = Field(default=0)
    cod_baseline: float = Field(default=400)
    coordinates: list[tuple[float, float]] | None = None
