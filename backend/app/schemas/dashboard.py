from app.schemas.map_objects import Geometry
from pydantic import BaseModel


class DashboardOverviewData(BaseModel):
    project_count: int
    manhole_count: int
    pipe_length_m: float
    monitoring_point_count: int
    high_risk_area_count: int
    medium_risk_area_count: int
    low_risk_area_count: int
    active_task_count: int
    analysis_object_count: int
    source_run_id: str | None = None


class DashboardOverviewResponse(BaseModel):
    data: DashboardOverviewData


class DashboardTaskProgressData(BaseModel):
    pending_count: int
    in_progress_count: int
    completed_count: int
    pending_ratio: float
    in_progress_ratio: float
    completed_ratio: float
    source_run_id: str | None = None


class DashboardTaskProgressResponse(BaseModel):
    data: DashboardTaskProgressData


class DashboardProblemDistributionData(BaseModel):
    severe_count: int
    weak_count: int
    normal_count: int
    average_observed_cod: float
    source_run_id: str | None = None


class DashboardProblemDistributionResponse(BaseModel):
    data: DashboardProblemDistributionData


class DashboardRankingItem(BaseModel):
    object_id: str
    object_code: str
    object_name: str
    risk_level: str
    observed_cod: float
    baseline_cod: float
    label: str


class DashboardRankingResponse(BaseModel):
    items: list[DashboardRankingItem]


class DashboardMapOverviewItem(BaseModel):
    object_id: str
    object_code: str
    object_name: str
    risk_level: str
    geom: Geometry


class DashboardMapOverviewResponse(BaseModel):
    items: list[DashboardMapOverviewItem]
