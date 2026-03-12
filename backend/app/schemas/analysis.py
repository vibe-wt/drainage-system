from datetime import datetime

from pydantic import BaseModel, Field
from app.schemas.map_objects import Geometry


class LowCodAnalysisRequest(BaseModel):
    plot_ids: list[str] = Field(default_factory=list)
    cod_threshold: float = Field(default=200)
    expected_cod: float = Field(default=400)


class LowCodAnalysisItem(BaseModel):
    plot_id: str
    plot_code: str
    plot_name: str
    plot_type: str
    geom: Geometry
    baseline_cod: float
    observed_cod: float
    water_usage_m3d: float
    risk_level: str
    label: str


class LowCodAnalysisSummary(BaseModel):
    total: int
    high_risk: int
    medium_risk: int
    low_risk: int
    average_observed_cod: float


class LowCodAnalysisResponse(BaseModel):
    summary: LowCodAnalysisSummary
    items: list[LowCodAnalysisItem]


class LowCodAnalysisRunSummary(BaseModel):
    run_id: str
    analysis_type: str
    status: str
    created_at: datetime
    summary: LowCodAnalysisSummary


class LowCodAnalysisRunListResponse(BaseModel):
    items: list[LowCodAnalysisRunSummary]
