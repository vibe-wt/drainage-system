from fastapi import APIRouter

from app.api.routes import analysis, dashboard, health, imports, manholes, map_objects, pipes, plots

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(map_objects.router, prefix="/map", tags=["map"])
api_router.include_router(manholes.router, prefix="/manholes", tags=["manholes"])
api_router.include_router(pipes.router, prefix="/pipes", tags=["pipes"])
api_router.include_router(plots.router, prefix="/plots", tags=["plots"])
api_router.include_router(imports.router, prefix="/import-batches", tags=["imports"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
