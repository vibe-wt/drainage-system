from typing import Any, Literal

from pydantic import BaseModel


SourceType = Literal["excel", "geojson"]
ObjectType = Literal["manholes", "pipes"]


class CreateImportBatchRequest(BaseModel):
    batch_name: str
    source_type: SourceType
    object_type: ObjectType


class ImportBatchData(BaseModel):
    id: str
    batch_name: str
    source_type: SourceType
    object_type: ObjectType
    import_status: str
    file_name: str | None = None
    total_count: int = 0
    success_count: int = 0
    failed_count: int = 0
    created_at: str
    preview_rows: list[dict[str, Any]] = []
    columns: list[str] = []
    error_summary: list[str] = []
    imported_objects: list[dict[str, str]] = []


class ImportBatchResponse(BaseModel):
    data: ImportBatchData


class ImportBatchListResponse(BaseModel):
    items: list[ImportBatchData]


class PreviewImportRequest(BaseModel):
    mapping: dict[str, str] = {}


class PreviewImportResponse(BaseModel):
    data: dict[str, Any]


class CommitImportRequest(BaseModel):
    mapping: dict[str, str] = {}


class CommitImportResponse(BaseModel):
    data: dict[str, Any]
