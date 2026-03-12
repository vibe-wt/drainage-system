from app.schemas.plot import CreatePlotRequest, UpdatePlotRequest
from app.services.static_map_data import create_plot_object, delete_plot_object, update_plot_object


def create_plot(payload: CreatePlotRequest) -> dict:
    try:
        return create_plot_object(
            code=payload.code,
            name=payload.name,
            risk_level=payload.risk_level,
            plot_type=payload.plot_type,
            water_usage_m3d=payload.water_usage_m3d,
            cod_baseline=payload.cod_baseline,
            coordinates=[[lng, lat] for lng, lat in payload.coordinates],
        )
    except ValueError as exc:
        raise ValueError(str(exc)) from exc


def update_plot(plot_id: str, payload: UpdatePlotRequest) -> dict:
    try:
        return update_plot_object(
            plot_id,
            code=payload.code,
            name=payload.name,
            risk_level=payload.risk_level,
            plot_type=payload.plot_type,
            water_usage_m3d=payload.water_usage_m3d,
            cod_baseline=payload.cod_baseline,
            coordinates=[[lng, lat] for lng, lat in payload.coordinates] if payload.coordinates else None,
        )
    except ValueError as exc:
        raise ValueError(str(exc)) from exc


def delete_plot(plot_id: str) -> None:
    try:
        delete_plot_object(plot_id)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
