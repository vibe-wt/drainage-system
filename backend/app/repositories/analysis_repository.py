from __future__ import annotations

from uuid import uuid4

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.analysis_run import AnalysisRun


def create_analysis_run(
    db: Session,
    *,
    analysis_type: str,
    status: str,
    summary: dict,
    items: list[dict],
) -> AnalysisRun:
    entity = AnalysisRun(
        id=f"ar_{uuid4().hex[:12]}",
        analysis_type=analysis_type,
        status=status,
        summary=summary,
        items=items,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def get_latest_analysis_run(db: Session, analysis_type: str) -> AnalysisRun | None:
    stmt = (
        select(AnalysisRun)
        .where(AnalysisRun.analysis_type == analysis_type)
        .order_by(desc(AnalysisRun.created_at))
        .limit(1)
    )
    return db.scalar(stmt)


def list_analysis_runs(db: Session, analysis_type: str, limit: int = 20) -> list[AnalysisRun]:
    stmt = (
        select(AnalysisRun)
        .where(AnalysisRun.analysis_type == analysis_type)
        .order_by(desc(AnalysisRun.created_at))
        .limit(limit)
    )
    return list(db.scalars(stmt))


def get_analysis_run(db: Session, analysis_type: str, run_id: str) -> AnalysisRun | None:
    stmt = select(AnalysisRun).where(
        AnalysisRun.analysis_type == analysis_type,
        AnalysisRun.id == run_id,
    )
    return db.scalar(stmt)
