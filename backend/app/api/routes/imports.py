from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.imports import (
    CommitImportRequest,
    CommitImportResponse,
    CreateImportBatchRequest,
    ImportBatchListResponse,
    ImportBatchResponse,
    PreviewImportRequest,
    PreviewImportResponse,
)
from app.services.import_service import (
    commit_import,
    create_import_batch,
    get_import_batch,
    list_import_batches,
    preview_import,
    upload_import_file,
)

router = APIRouter()
SAMPLE_DATA_DIR = Path(__file__).resolve().parents[4] / "sample-data"


@router.get("", response_model=ImportBatchListResponse)
def list_import_batches_endpoint() -> ImportBatchListResponse:
    return ImportBatchListResponse(items=list_import_batches())


@router.post("", response_model=ImportBatchResponse)
def create_import_batch_endpoint(payload: CreateImportBatchRequest) -> ImportBatchResponse:
    return ImportBatchResponse(data=create_import_batch(payload))


@router.get("/templates/{object_type}/{source_type}")
def download_import_template(object_type: str, source_type: str) -> FileResponse:
    if object_type not in {"manholes", "pipes"}:
        raise HTTPException(status_code=404, detail="模板不存在。")
    if source_type not in {"excel", "geojson"}:
        raise HTTPException(status_code=404, detail="模板不存在。")

    file_name = f"{object_type}-demo.{'xlsx' if source_type == 'excel' else 'geojson'}"
    file_path = SAMPLE_DATA_DIR / ("excel" if source_type == "excel" else "geojson") / file_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="模板不存在。")
    media_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if source_type == "excel"
        else "application/geo+json"
    )
    return FileResponse(path=file_path, filename=file_name, media_type=media_type)


@router.get("/{batch_id}", response_model=ImportBatchResponse)
def get_import_batch_endpoint(batch_id: str) -> ImportBatchResponse:
    return ImportBatchResponse(data=get_import_batch(batch_id))


@router.post("/{batch_id}/file", response_model=ImportBatchResponse)
async def upload_import_file_endpoint(batch_id: str, file: UploadFile = File(...)) -> ImportBatchResponse:
    return ImportBatchResponse(data=await upload_import_file(batch_id, file))


@router.post("/{batch_id}/preview", response_model=PreviewImportResponse)
def preview_import_endpoint(batch_id: str, payload: PreviewImportRequest) -> PreviewImportResponse:
    return PreviewImportResponse(data=preview_import(batch_id, payload.mapping))


@router.post("/{batch_id}/commit", response_model=CommitImportResponse)
def commit_import_endpoint(
    batch_id: str, payload: CommitImportRequest, db: Session = Depends(get_db)
) -> CommitImportResponse:
    return CommitImportResponse(data=commit_import(db, batch_id, payload.mapping))
