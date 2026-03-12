from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session

from app.schemas.analysis import (
    LowCodAnalysisItem,
    LowCodAnalysisRequest,
    LowCodAnalysisResponse,
    LowCodAnalysisSummary,
)
from app.repositories.analysis_repository import create_analysis_run, get_latest_analysis_run
from app.repositories.analysis_repository import get_analysis_run, list_analysis_runs
from app.services.static_map_data import list_static_objects


def _infer_observed_cod(plot: dict[str, Any], expected_cod: float) -> float:
    baseline = float(plot.get("properties", {}).get("cod_baseline") or expected_cod)
    risk_level = plot.get("risk_level", "low")
    if risk_level == "high":
        return min(baseline, expected_cod * 0.45)
    if risk_level == "medium":
        return min(baseline, expected_cod * 0.68)
    return min(baseline, expected_cod * 1.05)


def run_low_cod_analysis(db: Session, payload: LowCodAnalysisRequest) -> LowCodAnalysisResponse:
    plots = list_static_objects().get("plots", [])
    if payload.plot_ids:
        selected = [plot for plot in plots if plot["id"] in payload.plot_ids]
    else:
        selected = plots

    items: list[LowCodAnalysisItem] = []
    for plot in selected:
        properties = plot.get("properties", {})
        baseline = float(properties.get("cod_baseline") or payload.expected_cod)
        observed = round(_infer_observed_cod(plot, payload.expected_cod), 1)
        if observed < payload.cod_threshold * 0.85:
            risk_level = "high"
            label = "疑似明显外水混入"
        elif observed < payload.cod_threshold:
            risk_level = "medium"
            label = "疑似低浓度外水影响"
        else:
            risk_level = "low"
            label = "浓度基本正常"

        items.append(
            LowCodAnalysisItem(
                plot_id=plot["id"],
                plot_code=plot["code"],
                plot_name=plot["name"],
                plot_type=str(properties.get("plot_type") or ""),
                geom=plot["geom"],
                baseline_cod=baseline,
                observed_cod=observed,
                water_usage_m3d=float(properties.get("water_usage_m3d") or 0),
                risk_level=risk_level,
                label=label,
            )
        )

    total = len(items)
    average_observed_cod = round(sum(item.observed_cod for item in items) / total, 1) if total else 0.0
    summary = LowCodAnalysisSummary(
        total=total,
        high_risk=sum(1 for item in items if item.risk_level == "high"),
        medium_risk=sum(1 for item in items if item.risk_level == "medium"),
        low_risk=sum(1 for item in items if item.risk_level == "low"),
        average_observed_cod=average_observed_cod,
    )
    result = LowCodAnalysisResponse(summary=summary, items=items)
    create_analysis_run(
        db,
        analysis_type="low_cod",
        status="completed",
        summary=result.summary.model_dump(),
        items=[item.model_dump() for item in result.items],
    )
    return result


def get_latest_low_cod_analysis(db: Session) -> LowCodAnalysisResponse | None:
    latest = get_latest_analysis_run(db, "low_cod")
    if latest is None:
        return None
    return LowCodAnalysisResponse(
        summary=LowCodAnalysisSummary(**latest.summary),
        items=[LowCodAnalysisItem(**item) for item in latest.items],
    )


def get_low_cod_analysis_runs(db: Session, limit: int = 20) -> list[dict[str, Any]]:
    runs = list_analysis_runs(db, "low_cod", limit)
    return [
        {
            "run_id": run.id,
            "analysis_type": run.analysis_type,
            "status": run.status,
            "created_at": run.created_at,
            "summary": LowCodAnalysisSummary(**run.summary),
        }
        for run in runs
    ]


def get_low_cod_analysis_by_run_id(db: Session, run_id: str) -> LowCodAnalysisResponse | None:
    entity = get_analysis_run(db, "low_cod", run_id)
    if entity is None:
        return None
    return LowCodAnalysisResponse(
        summary=LowCodAnalysisSummary(**entity.summary),
        items=[LowCodAnalysisItem(**item) for item in entity.items],
    )
