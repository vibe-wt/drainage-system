from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.dashboard import DashboardOverviewResponse
from app.schemas.dashboard import (
    DashboardMapOverviewResponse,
    DashboardProblemDistributionResponse,
    DashboardRankingResponse,
    DashboardTaskProgressResponse,
)
from app.services.dashboard_service import (
    get_dashboard_catchment_ranking,
    get_dashboard_map_overview,
    get_dashboard_overview,
    get_dashboard_problem_distribution,
    get_dashboard_risk_ranking,
    get_dashboard_task_progress,
)

router = APIRouter()


@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview_endpoint(
    run_id: str | None = None,
    db: Session = Depends(get_db),
) -> DashboardOverviewResponse:
    data = get_dashboard_overview(db, run_id)
    if data is None:
        raise HTTPException(status_code=404, detail="暂无项目总览数据")
    return DashboardOverviewResponse(data=data)


@router.get("/task-progress", response_model=DashboardTaskProgressResponse)
def get_dashboard_task_progress_endpoint(
    run_id: str | None = None,
    db: Session = Depends(get_db),
) -> DashboardTaskProgressResponse:
    data = get_dashboard_task_progress(db, run_id)
    if data is None:
        raise HTTPException(status_code=404, detail="暂无任务进度数据")
    return DashboardTaskProgressResponse(data=data)


@router.get("/problem-distribution", response_model=DashboardProblemDistributionResponse)
def get_dashboard_problem_distribution_endpoint(
    run_id: str | None = None,
    db: Session = Depends(get_db),
) -> DashboardProblemDistributionResponse:
    data = get_dashboard_problem_distribution(db, run_id)
    if data is None:
        raise HTTPException(status_code=404, detail="暂无问题分布数据")
    return DashboardProblemDistributionResponse(data=data)


@router.get("/risk-ranking", response_model=DashboardRankingResponse)
def get_dashboard_risk_ranking_endpoint(
    run_id: str | None = None,
    db: Session = Depends(get_db),
) -> DashboardRankingResponse:
    return DashboardRankingResponse(items=get_dashboard_risk_ranking(db, run_id))


@router.get("/catchment-ranking", response_model=DashboardRankingResponse)
def get_dashboard_catchment_ranking_endpoint(
    run_id: str | None = None,
    db: Session = Depends(get_db),
) -> DashboardRankingResponse:
    return DashboardRankingResponse(items=get_dashboard_catchment_ranking(db, run_id))


@router.get("/map-overview", response_model=DashboardMapOverviewResponse)
def get_dashboard_map_overview_endpoint(
    run_id: str | None = None,
    db: Session = Depends(get_db),
) -> DashboardMapOverviewResponse:
    return DashboardMapOverviewResponse(items=get_dashboard_map_overview(db, run_id))
