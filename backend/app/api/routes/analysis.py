from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_editor_user
from app.schemas.analysis import (
    LowCodAnalysisRequest,
    LowCodAnalysisResponse,
    LowCodAnalysisRunListResponse,
    LowCodAnalysisRunSummary,
)
from app.services.analysis_service import (
    get_latest_low_cod_analysis,
    get_low_cod_analysis_by_run_id,
    get_low_cod_analysis_runs,
    run_low_cod_analysis,
)

router = APIRouter()


@router.post("/low-cod/runs", response_model=LowCodAnalysisResponse)
def run_low_cod_analysis_endpoint(
    payload: LowCodAnalysisRequest,
    _: tuple = Depends(require_editor_user),
    db: Session = Depends(get_db),
) -> LowCodAnalysisResponse:
    return run_low_cod_analysis(db, payload)


@router.get("/low-cod/latest", response_model=LowCodAnalysisResponse)
def get_latest_low_cod_analysis_endpoint(db: Session = Depends(get_db)) -> LowCodAnalysisResponse:
    latest = get_latest_low_cod_analysis(db)
    if latest is None:
        raise HTTPException(status_code=404, detail="暂无分析结果")
    return latest


@router.get("/low-cod/runs", response_model=LowCodAnalysisRunListResponse)
def list_low_cod_analysis_runs_endpoint(
    limit: int = 20,
    db: Session = Depends(get_db),
) -> LowCodAnalysisRunListResponse:
    items = [LowCodAnalysisRunSummary(**item) for item in get_low_cod_analysis_runs(db, limit)]
    return LowCodAnalysisRunListResponse(items=items)


@router.get("/low-cod/runs/{run_id}", response_model=LowCodAnalysisResponse)
def get_low_cod_analysis_run_endpoint(
    run_id: str,
    db: Session = Depends(get_db),
) -> LowCodAnalysisResponse:
    result = get_low_cod_analysis_by_run_id(db, run_id)
    if result is None:
        raise HTTPException(status_code=404, detail="分析记录不存在")
    return result
