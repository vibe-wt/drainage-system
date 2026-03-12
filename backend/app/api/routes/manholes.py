from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_editor_user
from app.schemas.common import MessageResponse
from app.schemas.manhole import CreateManholeRequest, ManholeResponse, UpdateManholeRequest
from app.services.manhole_service import create_manhole, delete_manhole, update_manhole

router = APIRouter()


@router.post("", response_model=ManholeResponse)
def create_manhole_endpoint(
    payload: CreateManholeRequest,
    _: tuple = Depends(require_editor_user),
    db: Session = Depends(get_db),
) -> ManholeResponse:
    return ManholeResponse(data=create_manhole(db, payload))


@router.patch("/{manhole_id}", response_model=ManholeResponse)
def update_manhole_endpoint(
    manhole_id: str,
    payload: UpdateManholeRequest,
    _: tuple = Depends(require_editor_user),
    db: Session = Depends(get_db),
) -> ManholeResponse:
    return ManholeResponse(data=update_manhole(db, manhole_id, payload))


@router.delete("/{manhole_id}", response_model=MessageResponse)
def delete_manhole_endpoint(
    manhole_id: str,
    _: tuple = Depends(require_editor_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    delete_manhole(db, manhole_id)
    return MessageResponse(message="manhole deleted")
