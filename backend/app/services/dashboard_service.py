from __future__ import annotations

from app.repositories.manhole_repository import count_manholes
from app.repositories.pipe_repository import count_pipes, sum_pipe_length_m
from app.repositories.analysis_repository import get_analysis_run, get_latest_analysis_run
from app.schemas.dashboard import (
    DashboardMapOverviewItem,
    DashboardOverviewData,
    DashboardProblemDistributionData,
    DashboardRankingItem,
    DashboardTaskProgressData,
)
from sqlalchemy.orm import Session


def _resolve_low_cod_run(db: Session, run_id: str | None):
    if run_id:
        return get_analysis_run(db, "low_cod", run_id)
    return get_latest_analysis_run(db, "low_cod")


def get_dashboard_overview(db: Session, run_id: str | None = None) -> DashboardOverviewData | None:
    run = _resolve_low_cod_run(db, run_id)
    if run is None:
        return None

    summary = run.summary
    return DashboardOverviewData(
        project_count=1,
        manhole_count=count_manholes(db),
        pipe_length_m=sum_pipe_length_m(db),
        monitoring_point_count=0,
        high_risk_area_count=int(summary.get("high_risk", 0)),
        medium_risk_area_count=int(summary.get("medium_risk", 0)),
        low_risk_area_count=int(summary.get("low_risk", 0)),
        active_task_count=int(summary.get("high_risk", 0)) + int(summary.get("medium_risk", 0)),
        analysis_object_count=int(summary.get("total", 0)),
        source_run_id=run.id,
    )


def get_dashboard_task_progress(db: Session, run_id: str | None = None) -> DashboardTaskProgressData | None:
    run = _resolve_low_cod_run(db, run_id)
    if run is None:
        return None

    summary = run.summary
    pending = int(summary.get("high_risk", 0))
    in_progress = int(summary.get("medium_risk", 0))
    completed = int(summary.get("low_risk", 0))
    total = max(pending + in_progress + completed, 1)

    return DashboardTaskProgressData(
        pending_count=pending,
        in_progress_count=in_progress,
        completed_count=completed,
        pending_ratio=round(pending / total, 4),
        in_progress_ratio=round(in_progress / total, 4),
        completed_ratio=round(completed / total, 4),
        source_run_id=run.id,
    )


def get_dashboard_problem_distribution(
    db: Session,
    run_id: str | None = None,
) -> DashboardProblemDistributionData | None:
    run = _resolve_low_cod_run(db, run_id)
    if run is None:
        return None

    items = run.items or []
    severe = sum(1 for item in items if "明显" in str(item.get("label", "")))
    weak = sum(1 for item in items if "低浓度" in str(item.get("label", "")))
    normal = sum(1 for item in items if item.get("risk_level") == "low")
    observed_values = [float(item.get("observed_cod") or 0) for item in items]
    average_observed_cod = round(sum(observed_values) / len(observed_values), 1) if observed_values else 0.0

    return DashboardProblemDistributionData(
        severe_count=severe,
        weak_count=weak,
        normal_count=normal,
        average_observed_cod=average_observed_cod,
        source_run_id=run.id,
    )


def get_dashboard_risk_ranking(db: Session, run_id: str | None = None) -> list[DashboardRankingItem]:
    run = _resolve_low_cod_run(db, run_id)
    if run is None:
        return []

    order = {"high": 3, "medium": 2, "low": 1}
    items = sorted(
        run.items or [],
        key=lambda item: (order.get(str(item.get("risk_level", "low")), 0), float(item.get("baseline_cod") or 0) - float(item.get("observed_cod") or 0)),
        reverse=True,
    )
    return [
        DashboardRankingItem(
            object_id=str(item.get("plot_id") or ""),
            object_code=str(item.get("plot_code") or ""),
            object_name=str(item.get("plot_name") or ""),
            risk_level=str(item.get("risk_level") or "low"),
            observed_cod=float(item.get("observed_cod") or 0),
            baseline_cod=float(item.get("baseline_cod") or 0),
            label=str(item.get("label") or ""),
        )
        for item in items
    ]


def get_dashboard_catchment_ranking(db: Session, run_id: str | None = None) -> list[DashboardRankingItem]:
    return get_dashboard_risk_ranking(db, run_id)


def get_dashboard_map_overview(db: Session, run_id: str | None = None) -> list[DashboardMapOverviewItem]:
    run = _resolve_low_cod_run(db, run_id)
    if run is None:
        return []

    return [
        DashboardMapOverviewItem(
            object_id=str(item.get("plot_id") or ""),
            object_code=str(item.get("plot_code") or ""),
            object_name=str(item.get("plot_name") or ""),
            risk_level=str(item.get("risk_level") or "low"),
            geom=item.get("geom"),
        )
        for item in (run.items or [])
    ]
