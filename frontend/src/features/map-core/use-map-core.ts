import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchMapObjects, fetchMapStats, invalidateMapCache, searchMapObjects } from "./api";
import {
  createManhole,
  createPlot,
  createPipe,
  deletePlot,
  deleteManhole,
  deletePipe,
  updateManhole,
  updatePlot,
  updatePipe,
} from "../map-editing/api";
import { layerRegistry, type LayerKey } from "./layer-config";
import type { MapFeature, MapStats, SearchResultItem, ViewportBounds } from "../../shared/types/map";
import type { EditMode, ManholeDraft, PipeDraft, PlotDraft } from "../map-editing/types";

const SNAP_DISTANCE_DEGREES = 0.00018;
type ToolMode = "browse" | "box-select" | "measure";
const layerPresets: Record<"all" | "assets" | "analysis" | "monitoring", LayerKey[]> = {
  all: layerRegistry.map((layer) => layer.key),
  assets: ["manholes", "pipes", "outfalls", "pump_stations", "plots", "catchments"],
  analysis: ["catchments", "plots", "monitoring_points", "task_areas"],
  monitoring: ["monitoring_points", "manholes", "pipes", "catchments"],
};

function getPointCoordinates(feature: MapFeature): [number, number] | null {
  if (feature.geom.type !== "Point" || !Array.isArray(feature.geom.coordinates)) {
    return null;
  }
  const [lng, lat] = feature.geom.coordinates as number[];
  return typeof lng === "number" && typeof lat === "number" ? [lng, lat] : null;
}

function getLineCoordinates(feature: MapFeature): [number, number][] {
  if (feature.geom.type !== "LineString" || !Array.isArray(feature.geom.coordinates)) {
    return [];
  }
  return (feature.geom.coordinates as number[][])
    .filter((coordinate) => coordinate.length >= 2)
    .map((coordinate) => [coordinate[0], coordinate[1]] as [number, number]);
}

function createDefaultLayerState(): Record<LayerKey, boolean> {
  return layerRegistry.reduce(
    (acc, layer) => {
      acc[layer.key] = true;
      return acc;
    },
    {} as Record<LayerKey, boolean>,
  );
}

function getPolygonCoordinates(feature: MapFeature): [number, number][][] {
  if (feature.geom.type !== "Polygon" || !Array.isArray(feature.geom.coordinates)) {
    return [];
  }
  return (feature.geom.coordinates as number[][][]).map((ring) =>
    ring
      .filter((coordinate) => coordinate.length >= 2)
      .map((coordinate) => [coordinate[0], coordinate[1]] as [number, number]),
  );
}

function getFeatureBounds(feature: MapFeature): [number, number, number, number] | null {
  const points: [number, number][] = [];
  const point = getPointCoordinates(feature);
  if (point) points.push(point);
  points.push(...getLineCoordinates(feature));
  getPolygonCoordinates(feature).forEach((ring) => points.push(...ring));
  if (points.length === 0) return null;
  const lngs = points.map((item) => item[0]);
  const lats = points.map((item) => item[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

function intersectsBounds(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return !(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]);
}

function haversineDistanceMeters(a: [number, number], b: [number, number]): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusM = 6371000;
  const deltaLat = toRadians(b[1] - a[1]);
  const deltaLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects = yi > point[1] !== yj > point[1]
      && point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function useMapCore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rawFeaturesByLayer, setRawFeaturesByLayer] = useState<Record<string, MapFeature[]>>({});
  const [stats, setStats] = useState<MapStats | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);
  const [activeLayers, setActiveLayers] = useState<Record<LayerKey, boolean>>(createDefaultLayerState);
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [editMode, setEditMode] = useState<EditMode>("idle");
  const [manholeDraft, setManholeDraft] = useState<ManholeDraft>({ coordinates: null });
  const [pipeDraft, setPipeDraft] = useState<PipeDraft>({ coordinates: [], snappedManholeIds: [], isComplete: false });
  const [plotDraft, setPlotDraft] = useState<PlotDraft>({ coordinates: [] });
  const [toolMode, setToolMode] = useState<ToolMode>("browse");
  const [boxSelectionStart, setBoxSelectionStart] = useState<[number, number] | null>(null);
  const [boxSelectionPreview, setBoxSelectionPreview] = useState<[number, number] | null>(null);
  const [boxSelectionIds, setBoxSelectionIds] = useState<string[]>([]);
  const [measureDraft, setMeasureDraft] = useState<[number, number][]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [selectedPulseId, setSelectedPulseId] = useState<string | null>(null);
  const [importPulseIds, setImportPulseIds] = useState<string[]>([]);
  const [showImportedOnly, setShowImportedOnly] = useState(false);
  const [analysisFocusIds, setAnalysisFocusIds] = useState<string[]>([]);
  const [analysisRiskById, setAnalysisRiskById] = useState<Record<string, "low" | "medium" | "high">>({});
  const [showAnalysisOnly, setShowAnalysisOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const deferredSearchKeyword = useDeferredValue(searchKeyword);
  const allRawFeatures = useMemo(() => Object.values(rawFeaturesByLayer).flat(), [rawFeaturesByLayer]);
  const rawFeatureIndex = useMemo(
    () =>
      allRawFeatures.reduce<Record<string, MapFeature>>((acc, feature) => {
        acc[feature.id] = feature;
        return acc;
      }, {}),
    [allRawFeatures],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [objectsResponse, statsResponse] = await Promise.all([fetchMapObjects(), fetchMapStats()]);
        if (cancelled) return;
        setRawFeaturesByLayer(objectsResponse.data);
        setStats(statsResponse.data);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "加载失败");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    function runSearch() {
      if (!deferredSearchKeyword.trim()) {
        setSearchResults([]);
        return;
      }

      timer = window.setTimeout(async () => {
        try {
          const response = await searchMapObjects(deferredSearchKeyword);
          if (!cancelled) setSearchResults(response.items);
        } catch {
          if (!cancelled) setSearchResults([]);
        }
      }, 180);
    }

    runSearch();
    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [deferredSearchKeyword]);

  useEffect(() => {
    if (!selectedFeature?.id) {
      setSelectedPulseId(null);
      return;
    }
    setSelectedPulseId(selectedFeature.id);
    const timer = window.setTimeout(() => {
      setSelectedPulseId((current) => (current === selectedFeature.id ? null : current));
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [selectedFeature?.id]);

  useEffect(() => {
    const imported = searchParams.get("imported");
    if (!imported) {
      return;
    }
    const ids = imported
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (ids.length === 0 || Object.keys(rawFeaturesByLayer).length === 0) {
      return;
    }
    const matched = ids.filter((id) => rawFeatureIndex[id]);
    if (matched.length === 0) {
      return;
    }
    setImportPulseIds(matched);
    setShowImportedOnly(true);
    setSelectedFeature(rawFeatureIndex[matched[0]] ?? null);
    setEditSuccess(`已导入 ${matched.length} 个对象，已在地图中高亮显示。`);
    const timer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("imported");
      setSearchParams(nextParams, { replace: true });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [rawFeatureIndex, rawFeaturesByLayer, searchParams, setSearchParams]);

  useEffect(() => {
    const featureId = searchParams.get("feature");
    if (!featureId || Object.keys(rawFeaturesByLayer).length === 0) {
      return;
    }
    const match = rawFeatureIndex[featureId];
    if (!match) return;
    setSelectedFeature(match);
    const timer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("feature");
      setSearchParams(nextParams, { replace: true });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [rawFeatureIndex, rawFeaturesByLayer, searchParams, setSearchParams]);

  useEffect(() => {
    const analysis = searchParams.get("analysis");
    if (!analysis || Object.keys(rawFeaturesByLayer).length === 0) {
      return;
    }
    const entries = analysis
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [id, level] = item.split(":");
        return {
          id: id.trim(),
          level: (level?.trim() || "") as "low" | "medium" | "high" | "",
        };
      })
      .filter((item) => item.id);
    if (entries.length === 0) {
      return;
    }
    const matched = entries.filter((entry) => rawFeatureIndex[entry.id]);
    const riskMap = Object.fromEntries(
      matched
        .filter((entry) => entry.level === "low" || entry.level === "medium" || entry.level === "high")
        .map((entry) => [entry.id, entry.level]),
    ) as Record<string, "low" | "medium" | "high">;
    if (matched.length === 0) {
      return;
    }
    setAnalysisFocusIds(matched.map((item) => item.id));
    setAnalysisRiskById(riskMap);
    setShowAnalysisOnly(true);
    setSelectedFeature((matched[0] && rawFeatureIndex[matched[0].id]) ?? null);
    setEditSuccess(`已回图 ${matched.length} 个分析对象，可在地图中继续核查。`);
    const timer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("analysis");
      setSearchParams(nextParams, { replace: true });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [rawFeatureIndex, rawFeaturesByLayer, searchParams, setSearchParams]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && (editMode === "create-plot" || editMode === "reshape-plot")) {
        cancelEditing();
        setEditSuccess(editMode === "create-plot" ? "已取消地块绘制。" : "已取消地块重绘。");
        return;
      }
      if (event.key === "Backspace" && (editMode === "create-plot" || editMode === "reshape-plot")) {
        if (plotDraft.coordinates.length > 0) {
          event.preventDefault();
          setPlotDraft((current) => ({ coordinates: current.coordinates.slice(0, -1) }));
          setEditSuccess(`已撤销一个地块点，剩余 ${Math.max(plotDraft.coordinates.length - 1, 0)} 个节点。`);
        }
        return;
      }
      if (event.key !== "Escape") return;
      if (editMode !== "idle") return;
      if (toolMode === "box-select") {
        stopToolMode();
        setEditSuccess("已取消框选。");
      }
      if (toolMode === "measure") {
        stopToolMode();
        setEditSuccess("已取消测距。");
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editMode, plotDraft.coordinates.length, toolMode]);

  const filteredState = useMemo(() => {
    const importedSet = new Set(importPulseIds);
    const analysisSet = new Set(analysisFocusIds);
    const nextVisibleFeaturesByLayer = Object.fromEntries(
      Object.entries(rawFeaturesByLayer).map(([layerKey, items]) => [
        layerKey,
        items.filter((item) => {
          if (riskFilter !== "all" && item.risk_level !== riskFilter) {
            return false;
          }
          if (showImportedOnly && importedSet.size > 0 && !importedSet.has(item.id)) {
            return false;
          }
          if (showAnalysisOnly && analysisSet.size > 0 && !analysisSet.has(item.id)) {
            return false;
          }
          return true;
        }),
      ]),
    ) as Record<string, MapFeature[]>;

    const nextCounts = layerRegistry.map((layer) => ({
      ...layer,
      count: nextVisibleFeaturesByLayer[layer.key]?.length ?? 0,
    }));

    const nextActiveVisibleFeatures = layerRegistry
      .filter((layer) => activeLayers[layer.key])
      .flatMap((layer) => nextVisibleFeaturesByLayer[layer.key] ?? []);

    const nextRiskSummary = nextCounts.reduce(
      (acc, layer) => {
        const items = nextVisibleFeaturesByLayer[layer.key] ?? [];
        for (const item of items) {
          acc.total += 1;
          if (item.risk_level === "high") acc.high += 1;
          else if (item.risk_level === "medium") acc.medium += 1;
          else acc.low += 1;
        }
        return acc;
      },
      { total: 0, high: 0, medium: 0, low: 0 },
    );

    const nextVisibleFeatureIndex = Object.values(nextVisibleFeaturesByLayer)
      .flat()
      .reduce<Record<string, MapFeature>>((acc, feature) => {
        acc[feature.id] = feature;
        return acc;
      }, {});

    return {
      visibleFeaturesByLayer: nextVisibleFeaturesByLayer,
      counts: nextCounts,
      activeVisibleFeatures: nextActiveVisibleFeatures,
      riskSummary: nextRiskSummary,
      visibleFeatureIndex: nextVisibleFeatureIndex,
    };
  }, [analysisFocusIds, importPulseIds, rawFeaturesByLayer, riskFilter, showAnalysisOnly, showImportedOnly]);

  const { visibleFeaturesByLayer, counts, activeVisibleFeatures, riskSummary, visibleFeatureIndex } = filteredState;
  const activeVisibleFeatureBounds = useMemo(
    () =>
      activeVisibleFeatures.map((feature) => ({
        feature,
        bounds: getFeatureBounds(feature),
      })),
    [activeVisibleFeatures],
  );

  const viewportStats = useMemo(() => {
    const sourceFeatures = viewportBounds
      ? activeVisibleFeatureBounds
          .filter((item) => item.bounds && intersectsBounds(viewportBounds, item.bounds))
          .map((item) => item.feature)
      : activeVisibleFeatures;

    let manholeCount = 0;
    let pipeCount = 0;
    let monitoringPointCount = 0;
    let pipeLengthM = 0;
    for (const feature of sourceFeatures) {
      if (feature.object_type === "manhole") {
        manholeCount += 1;
      } else if (feature.object_type === "pipe") {
        pipeCount += 1;
        const coordinates = getLineCoordinates(feature);
        pipeLengthM += coordinates.slice(1).reduce((sum, coordinate, index) => {
          return sum + haversineDistanceMeters(coordinates[index], coordinate);
        }, 0);
      } else if (feature.object_type === "monitoring_point") {
        monitoringPointCount += 1;
      }
    }

    return {
      manhole_count: manholeCount,
      pipe_count: pipeCount,
      pipe_length_m: Number(pipeLengthM.toFixed(1)),
      monitoring_point_count: monitoringPointCount,
      total: sourceFeatures.length,
    };
  }, [activeVisibleFeatureBounds, activeVisibleFeatures, viewportBounds]);

  const activeLayerCount = useMemo(
    () => Object.values(activeLayers).filter(Boolean).length,
    [activeLayers],
  );

  const measureLengthMeters = useMemo(() => {
    if (measureDraft.length < 2) return 0;
    return measureDraft.slice(1).reduce((sum, coordinate, index) => {
      return sum + haversineDistanceMeters(measureDraft[index], coordinate);
    }, 0);
  }, [measureDraft]);

  function toggleLayer(layerKey: LayerKey) {
    setActiveLayers((current) => ({ ...current, [layerKey]: !current[layerKey] }));
  }

  function clearImportedFocus() {
    setImportPulseIds([]);
    setShowImportedOnly(false);
  }

  function clearAnalysisFocus() {
    setAnalysisFocusIds([]);
    setAnalysisRiskById({});
    setShowAnalysisOnly(false);
  }

  function stopToolMode() {
    setToolMode("browse");
    setBoxSelectionStart(null);
    setBoxSelectionPreview(null);
    setMeasureDraft([]);
    setBoxSelectionIds([]);
  }

  function applyLayerPreset(preset: keyof typeof layerPresets) {
    const enabled = new Set(layerPresets[preset]);
    setActiveLayers(
      layerRegistry.reduce(
        (acc, layer) => {
          acc[layer.key] = enabled.has(layer.key);
          return acc;
        },
        {} as Record<LayerKey, boolean>,
      ),
    );
  }

  function resetWorkbenchView() {
    setSearchKeyword("");
    setSearchResults([]);
    setRiskFilter("all");
    setShowImportedOnly(false);
    setImportPulseIds([]);
    setShowAnalysisOnly(false);
    setAnalysisFocusIds([]);
    setAnalysisRiskById({});
    setSelectedFeature(null);
    stopToolMode();
    setEditError(null);
    setEditSuccess(null);
    setActiveLayers(createDefaultLayerState());
  }

  async function refreshMapData(nextSelectedId?: string | null) {
    invalidateMapCache();
    const [objectsResponse, statsResponse] = await Promise.all([fetchMapObjects(), fetchMapStats()]);
    setRawFeaturesByLayer(objectsResponse.data);
    setStats(statsResponse.data);
    if (nextSelectedId) {
      const nextSelected = Object.values(objectsResponse.data)
        .flat()
        .reduce<MapFeature | null>((acc, feature) => (feature.id === nextSelectedId ? feature : acc), null);
      setSelectedFeature(nextSelected);
    }
  }

  const manholeFeatures = useMemo(
    () => (rawFeaturesByLayer.manholes ?? []).filter((feature) => feature.object_type === "manhole"),
    [rawFeaturesByLayer],
  );

  const relatedFeatureIds = useMemo(() => {
    if (!selectedFeature) return [];

    if (selectedFeature.object_type === "plot") {
      const polygon = getPolygonCoordinates(selectedFeature)[0] ?? [];
      if (polygon.length < 3) return [];
      return manholeFeatures
        .filter((feature) => {
          const point = getPointCoordinates(feature);
          return point ? pointInPolygon(point, polygon) : false;
        })
        .map((feature) => feature.id);
    }

    if (selectedFeature.object_type === "manhole") {
      const point = getPointCoordinates(selectedFeature);
      if (!point) return [];
      return (rawFeaturesByLayer.plots ?? [])
        .filter((feature) => {
          const polygon = getPolygonCoordinates(feature)[0] ?? [];
          return polygon.length >= 3 ? pointInPolygon(point, polygon) : false;
        })
        .map((feature) => feature.id);
    }

    return [];
  }, [manholeFeatures, rawFeaturesByLayer.plots, selectedFeature]);

  const relatedFeatures = useMemo(
    () => relatedFeatureIds.map((id) => rawFeatureIndex[id]).filter(Boolean),
    [rawFeatureIndex, relatedFeatureIds],
  );

  const pulseIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedPulseId) ids.add(selectedPulseId);
    importPulseIds.forEach((id) => ids.add(id));
    analysisFocusIds.forEach((id) => ids.add(id));
    boxSelectionIds.forEach((id) => ids.add(id));
    relatedFeatureIds.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [analysisFocusIds, boxSelectionIds, importPulseIds, relatedFeatureIds, selectedPulseId]);

  function findNearestManhole(
    coordinates: [number, number],
  ): { feature: MapFeature; coordinates: [number, number]; distance: number } | null {
    let nearest: { feature: MapFeature; coordinates: [number, number]; distance: number } | null = null;
    manholeFeatures.forEach((feature) => {
      const point = getPointCoordinates(feature);
      if (!point) return;
      const distance = Math.hypot(point[0] - coordinates[0], point[1] - coordinates[1]);
      if (distance > SNAP_DISTANCE_DEGREES) return;
      if (!nearest || distance < nearest.distance) {
        nearest = { feature, coordinates: point, distance };
      }
    });
    return nearest;
  }

  function startCreateManhole() {
    setSelectedFeature(null);
    setEditError(null);
    setEditSuccess(null);
    stopToolMode();
    setEditMode("create-manhole");
    setManholeDraft({ coordinates: null });
    setPipeDraft({ coordinates: [], snappedManholeIds: [], isComplete: false });
    setPlotDraft({ coordinates: [] });
  }

  function startCreatePipe() {
    setSelectedFeature(null);
    setEditError(null);
    setEditSuccess(null);
    stopToolMode();
    setEditMode("create-pipe");
    setPipeDraft({ coordinates: [], snappedManholeIds: [], isComplete: false });
    setManholeDraft({ coordinates: null });
    setPlotDraft({ coordinates: [] });
  }

  function startCreatePlot() {
    setSelectedFeature(null);
    setEditError(null);
    setEditSuccess("地块模式：单击添加节点，双击结束，ESC取消，Backspace撤销。");
    stopToolMode();
    setEditMode("create-plot");
    setPlotDraft({ coordinates: [] });
    setManholeDraft({ coordinates: null });
    setPipeDraft({ coordinates: [], snappedManholeIds: [], isComplete: false });
  }

  function startMoveSelectedManhole() {
    if (!selectedFeature || selectedFeature.object_type !== "manhole") return;
    const coordinates = getPointCoordinates(selectedFeature);
    setEditError(null);
    setEditSuccess(null);
    stopToolMode();
    setEditMode("move-manhole");
    setManholeDraft({ coordinates });
  }

  function startReshapeSelectedPipe() {
    if (!selectedFeature || selectedFeature.object_type !== "pipe") return;
    const coordinates = getLineCoordinates(selectedFeature);
    setEditError(null);
    setEditSuccess(null);
    stopToolMode();
    setEditMode("reshape-pipe");
    setPipeDraft({
      coordinates,
      snappedManholeIds: [
        String(selectedFeature.properties.start_manhole_id ?? "") || null,
        ...Array.from({ length: Math.max(coordinates.length - 2, 0) }, () => null),
        String(selectedFeature.properties.end_manhole_id ?? "") || null,
      ].slice(0, coordinates.length),
      isComplete: true,
    });
  }

  function startReshapeSelectedPlot() {
    if (!selectedFeature || selectedFeature.object_type !== "plot") return;
    const coordinates = getPolygonCoordinates(selectedFeature)[0] ?? [];
    setEditError(null);
    setEditSuccess("地块重绘中：单击添加节点，双击结束，ESC取消，Backspace撤销。");
    stopToolMode();
    setEditMode("reshape-plot");
    setPlotDraft({
      coordinates: coordinates.slice(0, -1),
    });
  }

  function cancelEditing() {
    setEditError(null);
    setEditSuccess(null);
    setEditMode("idle");
    setManholeDraft({ coordinates: null });
    setPipeDraft({ coordinates: [], snappedManholeIds: [], isComplete: false });
    setPlotDraft({ coordinates: [] });
  }

  function startBoxSelect() {
    if (editMode !== "idle") return;
    setSelectedFeature(null);
    setEditError(null);
    setEditSuccess("框选已开启，请依次点击两个角点。");
    setToolMode("box-select");
    setBoxSelectionStart(null);
    setBoxSelectionPreview(null);
    setBoxSelectionIds([]);
    setMeasureDraft([]);
  }

  function startMeasure() {
    if (editMode !== "idle") return;
    setSelectedFeature(null);
    setEditError(null);
    setEditSuccess("测距已开启，连续点击地图添加测点。");
    setToolMode("measure");
    setBoxSelectionStart(null);
    setBoxSelectionPreview(null);
    setBoxSelectionIds([]);
    setMeasureDraft([]);
  }

  function updateBoxSelectionPreview(coordinates: [number, number]) {
    if (toolMode !== "box-select" || !boxSelectionStart) return;
    setBoxSelectionPreview(coordinates);
  }

  function clearMeasure() {
    setMeasureDraft([]);
  }

  function finishMeasure() {
    setToolMode("browse");
    setEditSuccess(measureLengthMeters > 0 ? `测距完成，总长度 ${measureLengthMeters.toFixed(1)} m。` : "测距已结束。");
  }

  function handleMapCoordinateClick(coordinates: [number, number]) {
    setEditError(null);
    if (toolMode !== "measure") {
      setEditSuccess(null);
    }
    if (editMode === "create-manhole") {
      setManholeDraft({ coordinates });
      return;
    }
    if (editMode === "move-manhole") {
      setManholeDraft({ coordinates });
      return;
    }
    if (editMode === "create-pipe" || editMode === "reshape-pipe") {
      if (pipeDraft.isComplete) {
        return;
      }
      const snapped = findNearestManhole(coordinates);
      setPipeDraft((current) => ({
        coordinates: [...current.coordinates, snapped?.coordinates ?? coordinates],
        snappedManholeIds: [...current.snappedManholeIds, snapped?.feature.id ?? null],
        isComplete: false,
      }));
      return;
    }
    if (editMode === "create-plot" || editMode === "reshape-plot") {
      setPlotDraft((current) => ({
        coordinates: [...current.coordinates, coordinates],
      }));
      setEditSuccess(`${editMode === "create-plot" ? "地块绘制中" : "地块重绘中"}：${plotDraft.coordinates.length + 1} 个节点，双击完成。`);
      return;
    }
    if (editMode !== "idle") {
      return;
    }
    if (toolMode === "box-select") {
      if (!boxSelectionStart) {
        setBoxSelectionStart(coordinates);
        setBoxSelectionPreview(coordinates);
        setEditSuccess("已记录第一个角点，请点击对角完成框选。");
        return;
      }
      const bounds: [number, number, number, number] = [
        Math.min(boxSelectionStart[0], coordinates[0]),
        Math.min(boxSelectionStart[1], coordinates[1]),
        Math.max(boxSelectionStart[0], coordinates[0]),
        Math.max(boxSelectionStart[1], coordinates[1]),
      ];
      const matched = activeVisibleFeatureBounds
        .filter((item) => item.bounds && intersectsBounds(bounds, item.bounds))
        .map((item) => item.feature);
      setBoxSelectionIds(matched.map((feature) => feature.id));
      setSelectedFeature(matched[0] ?? null);
      setBoxSelectionStart(null);
      setBoxSelectionPreview(null);
      setToolMode("browse");
      setEditSuccess(matched.length > 0 ? `框选完成，命中 ${matched.length} 个对象。` : "框选完成，未命中对象。");
      return;
    }
    if (toolMode === "measure") {
      setMeasureDraft((current) => [...current, coordinates]);
    }
  }

  function undoPipePoint() {
    setPipeDraft((current) => ({
      coordinates: current.coordinates.slice(0, -1),
      snappedManholeIds: current.snappedManholeIds.slice(0, -1),
      isComplete: false,
    }));
  }

  function undoPlotPoint() {
    setPlotDraft((current) => ({
      coordinates: current.coordinates.slice(0, -1),
    }));
  }

  function clearPlotDraft() {
    setPlotDraft({ coordinates: [] });
  }

  async function submitPlot(payload: {
    code: string;
    name: string;
    risk_level: string;
    plot_type: string;
    water_usage_m3d: number;
    cod_baseline: number;
  }) {
    if (plotDraft.coordinates.length < 3) {
      setEditError("至少需要 3 个节点才能形成地块。");
      return;
    }
    if (!payload.code.trim() || !payload.name.trim()) {
      setEditError("地块编号和名称不能为空。");
      return;
    }
    setEditError(null);
    setEditSuccess(null);
    setIsSaving(true);
    try {
      const created = await createPlot({
        ...payload,
        coordinates: plotDraft.coordinates,
      });
      await refreshMapData(created.id);
      cancelEditing();
      setEditSuccess(`地块 ${created.code} 已创建。`);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "地块保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  function finishPlotDrawing() {
    if (editMode !== "create-plot" && editMode !== "reshape-plot") return;
    if (plotDraft.coordinates.length < 3) {
      setEditError("至少需要 3 个节点才能形成地块。");
      return;
    }
    setEditSuccess(editMode === "create-plot" ? "地块节点已完成，请在右侧填写属性后保存。" : "地块边界已完成，请在右侧保存更新。");
  }

  async function submitPlotReshape() {
    if (!selectedFeature || selectedFeature.object_type !== "plot") return;
    if (plotDraft.coordinates.length < 3) {
      setEditError("至少需要 3 个节点才能形成地块。");
      return;
    }
    setEditError(null);
    setEditSuccess(null);
    setIsSaving(true);
    try {
      const reshaped = await updatePlot(selectedFeature.id, {
        code: selectedFeature.code,
        name: selectedFeature.name,
        risk_level: selectedFeature.risk_level,
        plot_type: String(selectedFeature.properties.plot_type ?? "小区"),
        water_usage_m3d: Number(selectedFeature.properties.water_usage_m3d ?? 0),
        cod_baseline: Number(selectedFeature.properties.cod_baseline ?? 400),
        coordinates: plotDraft.coordinates,
      });
      await refreshMapData(reshaped.id);
      setEditMode("idle");
      setPlotDraft({ coordinates: [] });
      setEditSuccess(`地块 ${reshaped.code} 边界已更新。`);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "地块边界更新失败");
    } finally {
      setIsSaving(false);
    }
  }

  function clearPipeDraft() {
    setPipeDraft({ coordinates: [], snappedManholeIds: [], isComplete: false });
  }

  function completePipeDraft() {
    setPipeDraft((current) => ({ ...current, isComplete: true }));
  }

  function resumePipeDraft() {
    setPipeDraft((current) => ({ ...current, isComplete: false }));
  }

  async function submitManhole(payload: {
    code: string;
    name: string;
    risk_level: string;
    manhole_type: string;
    catchment_name: string;
    depth_m: number;
  }) {
    if (!manholeDraft.coordinates) {
      setEditError("请先在地图上点击一个检查井位置。");
      return;
    }
    if (!payload.code.trim() || !payload.name.trim()) {
      setEditError("检查井编号和名称不能为空。");
      return;
    }
    setEditError(null);
    setEditSuccess(null);
    setIsSaving(true);
    try {
      const created = await createManhole({
        ...payload,
        coordinates: manholeDraft.coordinates,
      });
      await refreshMapData(created.id);
      cancelEditing();
      setEditSuccess(`检查井 ${created.code} 已创建。`);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "检查井保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitPipe(payload: {
    code: string;
    name: string;
    risk_level: string;
    pipe_type: string;
    diameter_mm: number;
    start_manhole_id: string;
    end_manhole_id: string;
  }) {
    if (pipeDraft.coordinates.length < 2) {
      setEditError("请至少在地图上点击 2 个节点。");
      return;
    }
    if (!payload.code.trim() || !payload.name.trim()) {
      setEditError("管道编号和名称不能为空。");
      return;
    }
    setEditError(null);
    setEditSuccess(null);
    setIsSaving(true);
    try {
      const created = await createPipe({
        ...payload,
        coordinates: pipeDraft.coordinates,
      });
      await refreshMapData(created.id);
      cancelEditing();
      setEditSuccess(`管道 ${created.code} 已创建。`);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "管道保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitPipeReshape() {
    if (!selectedFeature || selectedFeature.object_type !== "pipe") return;
    if (pipeDraft.coordinates.length < 2) {
      setEditError("请至少保留 2 个节点。");
      return;
    }
    setEditError(null);
    setEditSuccess(null);
    setIsSaving(true);
    try {
      const reshaped = await updatePipe(selectedFeature.id, {
        code: selectedFeature.code,
        name: selectedFeature.name,
        risk_level: selectedFeature.risk_level,
        pipe_type: String(selectedFeature.properties.pipe_type ?? "污水"),
        diameter_mm: Number(selectedFeature.properties.diameter_mm ?? 400),
        start_manhole_id: pipeDraft.snappedManholeIds[0] ?? String(selectedFeature.properties.start_manhole_id ?? ""),
        end_manhole_id:
          pipeDraft.snappedManholeIds[pipeDraft.snappedManholeIds.length - 1] ??
          String(selectedFeature.properties.end_manhole_id ?? ""),
        coordinates: pipeDraft.coordinates,
      });
      await refreshMapData(reshaped.id);
      setEditMode("idle");
      setPipeDraft({ coordinates: [], snappedManholeIds: [], isComplete: false });
      setEditSuccess(`管道 ${reshaped.code} 走向已更新。`);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "管道走向更新失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSelectedFeature(payload: Record<string, FormDataEntryValue>) {
    if (!selectedFeature) return;
    setEditError(null);
    setEditSuccess(null);
    setIsSaving(true);
    try {
      if (selectedFeature.object_type === "manhole") {
        await updateManhole(selectedFeature.id, {
          code: String(payload.code ?? ""),
          name: String(payload.name ?? ""),
          risk_level: String(payload.risk_level ?? "low"),
          manhole_type: String(payload.manhole_type ?? "污水井"),
          catchment_name: String(payload.catchment_name ?? ""),
          depth_m: Number(payload.depth_m ?? 0),
        });
      }

      if (selectedFeature.object_type === "pipe") {
        await updatePipe(selectedFeature.id, {
          code: String(payload.code ?? ""),
          name: String(payload.name ?? ""),
          risk_level: String(payload.risk_level ?? "low"),
          pipe_type: String(payload.pipe_type ?? "污水"),
          diameter_mm: Number(payload.diameter_mm ?? 400),
          start_manhole_id: String(payload.start_manhole_id ?? ""),
          end_manhole_id: String(payload.end_manhole_id ?? ""),
        });
      }

      if (selectedFeature.object_type === "plot") {
        await updatePlot(selectedFeature.id, {
          code: String(payload.code ?? ""),
          name: String(payload.name ?? ""),
          risk_level: String(payload.risk_level ?? "low"),
          plot_type: String(payload.plot_type ?? "小区"),
          water_usage_m3d: Number(payload.water_usage_m3d ?? 0),
          cod_baseline: Number(payload.cod_baseline ?? 400),
        });
      }

      await refreshMapData(selectedFeature.id);
      setEditSuccess(`${selectedFeature.object_type === "manhole" ? "检查井" : selectedFeature.object_type === "pipe" ? "管道" : "地块"} ${String(payload.code ?? selectedFeature.code)} 已更新。`);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitManholeMove() {
    if (!selectedFeature || selectedFeature.object_type !== "manhole") return;
    if (!manholeDraft.coordinates) {
      setEditError("请先在地图上点击新的检查井位置。");
      return;
    }
    setEditError(null);
    setEditSuccess(null);
    setIsSaving(true);
    try {
      const moved = await updateManhole(selectedFeature.id, {
        code: selectedFeature.code,
        name: selectedFeature.name,
        risk_level: selectedFeature.risk_level,
        manhole_type: String(selectedFeature.properties.manhole_type ?? "污水井"),
        catchment_name: String(selectedFeature.properties.catchment_name ?? ""),
        depth_m: Number(selectedFeature.properties.depth_m ?? 0),
        coordinates: manholeDraft.coordinates,
      });
      await refreshMapData(moved.id);
      setEditMode("idle");
      setEditSuccess(`检查井 ${moved.code} 位置已更新。`);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "检查井位置更新失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSelectedFeature() {
    if (!selectedFeature) return;
    const deletingFeature = selectedFeature;
    setEditError(null);
    setEditSuccess(null);
    setIsSaving(true);
    try {
      if (deletingFeature.object_type === "manhole") {
        await deleteManhole(deletingFeature.id);
      }

      if (deletingFeature.object_type === "pipe") {
        await deletePipe(deletingFeature.id);
      }

      if (deletingFeature.object_type === "plot") {
        await deletePlot(deletingFeature.id);
      }

      await refreshMapData(null);
      setSelectedFeature(null);
      setEditSuccess(`${deletingFeature.object_type === "manhole" ? "检查井" : deletingFeature.object_type === "pipe" ? "管道" : "地块"} ${deletingFeature.code} 已删除。`);
    } catch (deleteError) {
      setEditError(deleteError instanceof Error ? deleteError.message : "删除失败");
    } finally {
      setIsSaving(false);
    }
  }

  const pipeEndpointSuggestions = useMemo(() => {
    const startId = pipeDraft.snappedManholeIds[0] ?? "";
    const endId = pipeDraft.snappedManholeIds[pipeDraft.snappedManholeIds.length - 1] ?? "";
    const startFeature = startId ? manholeFeatures.find((feature) => feature.id === startId) : null;
    const endFeature = endId ? manholeFeatures.find((feature) => feature.id === endId) : null;
    return {
      startId,
      endId,
      startLabel: startFeature ? `${startFeature.code} · ${startFeature.name}` : "",
      endLabel: endFeature ? `${endFeature.code} · ${endFeature.name}` : "",
    };
  }, [manholeFeatures, pipeDraft.snappedManholeIds]);

  return {
    activeLayers,
    activeLayerCount,
    applyLayerPreset,
    analysisFocusIds,
    analysisRiskById,
    boxSelectionIds,
    boxSelectionPreview,
    boxSelectionStart,
    cancelEditing,
    clearAnalysisFocus,
    clearImportedFocus,
    clearMeasure,
    counts,
    completePipeDraft,
    editMode,
    editError,
    editSuccess,
    error,
    featuresByLayer: visibleFeaturesByLayer,
    featureIndex: visibleFeatureIndex,
    finishMeasure,
    finishPlotDrawing,
    handleMapCoordinateClick,
    isLoading,
    isSaving,
    manholeDraft,
    measureDraft,
    measureLengthMeters,
    pipeDraft,
    pipeEndpointSuggestions,
    plotDraft,
    pulseIds,
    removeSelectedFeature,
    relatedFeatures,
    resetWorkbenchView,
    riskSummary,
    riskFilter,
    resumePipeDraft,
    showAnalysisOnly,
    showImportedOnly,
    saveSelectedFeature,
    searchKeyword,
    searchResults,
    selectedFeature,
    clearPipeDraft,
    clearPlotDraft,
    startBoxSelect,
    startReshapeSelectedPlot,
    startReshapeSelectedPipe,
    startMeasure,
    startMoveSelectedManhole,
    setRiskFilter,
    setSearchKeyword,
    setSelectedFeature,
    setShowAnalysisOnly,
    stopToolMode,
    startCreateManhole,
    startCreatePlot,
    startCreatePipe,
    stats,
    viewportStats,
    submitManhole,
    submitManholeMove,
    submitPlot,
    submitPlotReshape,
    submitPipe,
    submitPipeReshape,
    setShowImportedOnly,
    toggleLayer,
    toolMode,
    updateBoxSelectionPreview,
    setViewportBounds,
    undoPlotPoint,
    undoPipePoint,
  };
}
