from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_editor_user
from app.schemas.common import MessageResponse
from app.schemas.plot import CreatePlotRequest, PlotResponse, UpdatePlotRequest
from app.services.plot_service import create_plot, delete_plot, update_plot

router = APIRouter()


@router.post("", response_model=PlotResponse)
def create_plot_endpoint(
    payload: CreatePlotRequest,
    _: tuple = Depends(require_editor_user),
) -> PlotResponse:
    try:
        return PlotResponse(data=create_plot(payload))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{plot_id}", response_model=PlotResponse)
def update_plot_endpoint(
    plot_id: str,
    payload: UpdatePlotRequest,
    _: tuple = Depends(require_editor_user),
) -> PlotResponse:
    try:
        return PlotResponse(data=update_plot(plot_id, payload))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{plot_id}", response_model=MessageResponse)
def delete_plot_endpoint(
    plot_id: str,
    _: tuple = Depends(require_editor_user),
) -> MessageResponse:
    try:
        delete_plot(plot_id)
        return MessageResponse(message="plot deleted")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
