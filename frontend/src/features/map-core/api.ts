import { apiGet } from "../../shared/api/client";
import type { MapObjectsResponse, MapStats, SearchResultItem } from "../../shared/types/map";

const CACHE_TTL_MS = 15_000;

let mapObjectsCache: { value: MapObjectsResponse; expiresAt: number } | null = null;
let mapStatsCache: { value: { data: MapStats }; expiresAt: number } | null = null;

export async function fetchMapObjects(): Promise<MapObjectsResponse> {
  if (mapObjectsCache && mapObjectsCache.expiresAt > Date.now()) {
    return mapObjectsCache.value;
  }
  const response = await apiGet<MapObjectsResponse>("/map/objects");
  mapObjectsCache = {
    value: response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return response;
}

export async function fetchMapStats(): Promise<{ data: MapStats }> {
  if (mapStatsCache && mapStatsCache.expiresAt > Date.now()) {
    return mapStatsCache.value;
  }
  const response = await apiGet<{ data: MapStats }>("/map/stats");
  mapStatsCache = {
    value: response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return response;
}

export async function searchMapObjects(keyword: string): Promise<{ items: SearchResultItem[] }> {
  return apiGet<{ items: SearchResultItem[] }>(`/map/search?keyword=${encodeURIComponent(keyword)}`);
}

export function invalidateMapCache(): void {
  mapObjectsCache = null;
  mapStatsCache = null;
}
