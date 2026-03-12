from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.routes import analysis, auth, dashboard, health, imports, manholes, map_objects, pipes, plots

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(map_objects.router, prefix="/map", tags=["map"], dependencies=[Depends(get_current_user)])
api_router.include_router(manholes.router, prefix="/manholes", tags=["manholes"], dependencies=[Depends(get_current_user)])
api_router.include_router(pipes.router, prefix="/pipes", tags=["pipes"], dependencies=[Depends(get_current_user)])
api_router.include_router(plots.router, prefix="/plots", tags=["plots"], dependencies=[Depends(get_current_user)])
api_router.include_router(imports.router, prefix="/import-batches", tags=["imports"], dependencies=[Depends(get_current_user)])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"], dependencies=[Depends(get_current_user)])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])
