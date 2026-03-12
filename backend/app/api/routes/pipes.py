from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_editor_user
from app.schemas.common import MessageResponse
from app.schemas.pipe import CreatePipeRequest, PipeResponse, UpdatePipeRequest
from app.services.pipe_service import create_pipe, delete_pipe, update_pipe

router = APIRouter()


@router.post("", response_model=PipeResponse)
def create_pipe_endpoint(
    payload: CreatePipeRequest,
    _: tuple = Depends(require_editor_user),
    db: Session = Depends(get_db),
) -> PipeResponse:
    return PipeResponse(data=create_pipe(db, payload))


@router.patch("/{pipe_id}", response_model=PipeResponse)
def update_pipe_endpoint(
    pipe_id: str,
    payload: UpdatePipeRequest,
    _: tuple = Depends(require_editor_user),
    db: Session = Depends(get_db),
) -> PipeResponse:
    return PipeResponse(data=update_pipe(db, pipe_id, payload))


@router.delete("/{pipe_id}", response_model=MessageResponse)
def delete_pipe_endpoint(
    pipe_id: str,
    _: tuple = Depends(require_editor_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    delete_pipe(db, pipe_id)
    return MessageResponse(message="pipe deleted")
