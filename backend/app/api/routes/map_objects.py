from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.map_objects import MapObjectsResponse, MapStatsResponse, SearchResponse
from app.services.map_service import list_map_objects, map_stats, object_counts, search_objects

router = APIRouter()


@router.get("/objects", response_model=MapObjectsResponse)
def get_map_objects(db: Session = Depends(get_db)) -> MapObjectsResponse:
    return MapObjectsResponse(
        data=list_map_objects(db),
        meta={"counts": object_counts(db)},
    )


@router.get("/stats", response_model=MapStatsResponse)
def get_map_stats(db: Session = Depends(get_db)) -> MapStatsResponse:
    return MapStatsResponse(data=map_stats(db))


@router.get("/search", response_model=SearchResponse)
def search_map_objects(keyword: str = Query(default=""), db: Session = Depends(get_db)) -> SearchResponse:
    return SearchResponse(items=search_objects(db, keyword))
