import { apiDelete, apiPatch, apiPost } from "../../shared/api/client";
import type { MapFeature } from "../../shared/types/map";

interface CreateManholePayload {
  code: string;
  name: string;
  risk_level: string;
  manhole_type: string;
  catchment_name: string;
  depth_m: number;
  coordinates: [number, number];
}

interface CreatePipePayload {
  code: string;
  name: string;
  risk_level: string;
  pipe_type: string;
  diameter_mm: number;
  start_manhole_id: string;
  end_manhole_id: string;
  coordinates: [number, number][];
}

interface CreatePlotPayload {
  code: string;
  name: string;
  risk_level: string;
  plot_type: string;
  water_usage_m3d: number;
  cod_baseline: number;
  coordinates: [number, number][];
}

export async function createManhole(payload: CreateManholePayload): Promise<MapFeature> {
  const response = await apiPost<{ data: MapFeature }>("/manholes", payload);
  return response.data;
}

export async function createPipe(payload: CreatePipePayload): Promise<MapFeature> {
  const response = await apiPost<{ data: MapFeature }>("/pipes", payload);
  return response.data;
}

export async function createPlot(payload: CreatePlotPayload): Promise<MapFeature> {
  const response = await apiPost<{ data: MapFeature }>("/plots", payload);
  return response.data;
}

export async function updatePlot(
  id: string,
  payload: Omit<CreatePlotPayload, "coordinates"> & { coordinates?: [number, number][] },
): Promise<MapFeature> {
  const response = await apiPatch<{ data: MapFeature }>(`/plots/${id}`, payload);
  return response.data;
}

export async function updateManhole(
  id: string,
  payload: Omit<CreateManholePayload, "coordinates"> & { coordinates?: [number, number] },
): Promise<MapFeature> {
  const response = await apiPatch<{ data: MapFeature }>(`/manholes/${id}`, payload);
  return response.data;
}

export async function updatePipe(
  id: string,
  payload: Omit<CreatePipePayload, "coordinates"> & { coordinates?: [number, number][] },
): Promise<MapFeature> {
  const response = await apiPatch<{ data: MapFeature }>(`/pipes/${id}`, payload);
  return response.data;
}

export async function deleteManhole(id: string): Promise<void> {
  await apiDelete(`/manholes/${id}`);
}

export async function deletePipe(id: string): Promise<void> {
  await apiDelete(`/pipes/${id}`);
}

export async function deletePlot(id: string): Promise<void> {
  await apiDelete(`/plots/${id}`);
}
