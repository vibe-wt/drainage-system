import { useEffect, useMemo, useRef } from "react";
import GeoJSON from "ol/format/GeoJSON";
import Feature from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import { buffer as bufferExtent, createEmpty, extend as extendExtent } from "ol/extent";
import Point from "ol/geom/Point";
import CircleGeometry from "ol/geom/Circle";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import type { Geometry as OlGeometry } from "ol/geom";
import { defaults as defaultControls } from "ol/control/defaults";
import { toLonLat, fromLonLat } from "ol/proj";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";

import "ol/ol.css";
import { buildFeatureStyle } from "../../features/map-core/style";
import type { MapFeature, RiskLevel, ViewportBounds } from "../../shared/types/map";
import type { EditMode, ManholeDraft, PipeDraft, PlotDraft } from "../../features/map-editing/types";
import { convertGeometryCoords, gcj02ToWgs84, wgs84ToGcj02 } from "../../shared/lib/coord";

const drawPriority: Record<string, number> = {
  catchment: 10,
  plot: 20,
  task_area: 30,
  pipe: 40,
  manhole: 50,
  outfall: 55,
  pump_station: 60,
  monitoring_point: 70,
};

const VIEW_STATE_STORAGE_KEY = "drainage-system:map-view";
const DEFAULT_CENTER: [number, number] = [120.15507, 30.27408];
const DEFAULT_ZOOM = 12;

interface MapCanvasProps {
  featuresByLayer: Record<string, MapFeature[]>;
  activeLayers: Record<string, boolean>;
  basemapMode: "vector" | "satellite" | "imagery";
  analysisRiskById: Record<string, RiskLevel>;
  selectedId: string | null;
  pulseIds: string[];
  editMode: EditMode;
  toolMode: "browse" | "box-select" | "measure";
  manholeDraft: ManholeDraft;
  pipeDraft: PipeDraft;
  plotDraft: PlotDraft;
  boxSelectionPreview: [number, number] | null;
  boxSelectionStart: [number, number] | null;
  measureDraft: [number, number][];
  onMapCoordinateClick: (coordinates: [number, number]) => void;
  onMapPointerMove: (coordinates: [number, number]) => void;
  onMapDoubleClick: () => void;
  locateRequestKey: number;
  onLocateResult: (message: string, isError?: boolean) => void;
  fitAllRequestKey: number;
  clearViewMemoryRequestKey: number;
  onViewMemoryResult: (message: string) => void;
  onViewportChange: (bounds: ViewportBounds) => void;
  onSelect: (feature: MapFeature | null) => void;
}

export function MapCanvas({
  featuresByLayer,
  activeLayers,
  basemapMode,
  analysisRiskById,
  selectedId,
  pulseIds,
  editMode,
  toolMode,
  manholeDraft,
  pipeDraft,
  plotDraft,
  boxSelectionPreview,
  boxSelectionStart,
  measureDraft,
  onMapCoordinateClick,
  onMapPointerMove,
  onMapDoubleClick,
  locateRequestKey,
  onLocateResult,
  fitAllRequestKey,
  clearViewMemoryRequestKey,
  onViewMemoryResult,
  onViewportChange,
  onSelect,
}: MapCanvasProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const basemapLayersRef = useRef<Record<"vector" | "vectorLabel" | "satellite" | "satelliteLabel", TileLayer<XYZ>> | null>(null);
  const displayLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const locationLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const draftLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const editModeRef = useRef<EditMode>(editMode);
  const toolModeRef = useRef<"browse" | "box-select" | "measure">(toolMode);
  const onMapCoordinateClickRef = useRef(onMapCoordinateClick);
  const onMapPointerMoveRef = useRef(onMapPointerMove);
  const onMapDoubleClickRef = useRef(onMapDoubleClick);
  const onLocateResultRef = useRef(onLocateResult);
  const onViewMemoryResultRef = useRef(onViewMemoryResult);
  const onViewportChangeRef = useRef(onViewportChange);
  const onSelectRef = useRef(onSelect);
  const viewportEmitTimerRef = useRef<number | null>(null);
  const lastViewportEmitRef = useRef(0);
  const hasAppliedInitialFitRef = useRef(false);
  const format = useMemo(() => new GeoJSON(), []);

  function toDisplayCoordinate(coordinate: [number, number]) {
    return wgs84ToGcj02(coordinate[0], coordinate[1]);
  }

  function toBusinessCoordinate(coordinate: [number, number]) {
    return gcj02ToWgs84(coordinate[0], coordinate[1]);
  }

  function clearViewportEmitTimer() {
    if (viewportEmitTimerRef.current !== null) {
      window.clearTimeout(viewportEmitTimerRef.current);
      viewportEmitTimerRef.current = null;
    }
  }

  function applyBasemapMode(mode: "vector" | "satellite" | "imagery") {
    const layers = basemapLayersRef.current;
    if (!layers) return;
    layers.vector.setVisible(mode === "vector");
    layers.vectorLabel.setVisible(mode === "vector");
    layers.satellite.setVisible(mode === "satellite" || mode === "imagery");
    layers.satelliteLabel.setVisible(mode === "satellite");
  }

  function emitViewportBounds(map: Map) {
    const size = map.getSize();
    const view = map.getView();
    if (!size || !view) return;
    const extent = view.calculateExtent(size);
    const [minLng, minLat] = toLonLat([extent[0], extent[1]]);
    const [maxLng, maxLat] = toLonLat([extent[2], extent[3]]);
    const [businessMinLng, businessMinLat] = toBusinessCoordinate([minLng, minLat]);
    const [businessMaxLng, businessMaxLat] = toBusinessCoordinate([maxLng, maxLat]);
    onViewportChangeRef.current([
      Number(businessMinLng.toFixed(6)),
      Number(businessMinLat.toFixed(6)),
      Number(businessMaxLng.toFixed(6)),
      Number(businessMaxLat.toFixed(6)),
    ]);
  }

  function scheduleViewportBoundsEmit(map: Map) {
    const now = Date.now();
    const elapsed = now - lastViewportEmitRef.current;
    const delay = elapsed >= 120 ? 0 : 120 - elapsed;

    clearViewportEmitTimer();
    viewportEmitTimerRef.current = window.setTimeout(() => {
      lastViewportEmitRef.current = Date.now();
      emitViewportBounds(map);
      viewportEmitTimerRef.current = null;
    }, delay);
  }

  function saveViewState(map: Map) {
    const view = map.getView();
    const center = view.getCenter();
    if (!center) return;
    const [lng, lat] = toLonLat(center);
    const [businessLng, businessLat] = toBusinessCoordinate([lng, lat]);
    window.localStorage.setItem(
      VIEW_STATE_STORAGE_KEY,
      JSON.stringify({
        center: [Number(businessLng.toFixed(6)), Number(businessLat.toFixed(6))],
        zoom: Number((view.getZoom() ?? DEFAULT_ZOOM).toFixed(2)),
      }),
    );
  }

  function loadInitialViewState() {
    try {
      const raw = window.localStorage.getItem(VIEW_STATE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { center?: [number, number]; zoom?: number };
      if (!parsed.center || typeof parsed.zoom !== "number") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);

  useEffect(() => {
    toolModeRef.current = toolMode;
  }, [toolMode]);

  useEffect(() => {
    const target = mapRef.current?.getTargetElement();
    if (!target) return;
    target.style.cursor = editMode !== "idle" || toolMode === "box-select" || toolMode === "measure" ? "crosshair" : "";
    return () => {
      target.style.cursor = "";
    };
  }, [editMode, toolMode]);

  useEffect(() => {
    onMapCoordinateClickRef.current = onMapCoordinateClick;
  }, [onMapCoordinateClick]);

  useEffect(() => {
    onMapPointerMoveRef.current = onMapPointerMove;
  }, [onMapPointerMove]);

  useEffect(() => {
    onMapDoubleClickRef.current = onMapDoubleClick;
  }, [onMapDoubleClick]);

  useEffect(() => {
    onLocateResultRef.current = onLocateResult;
  }, [onLocateResult]);

  useEffect(() => {
    onViewMemoryResultRef.current = onViewMemoryResult;
  }, [onViewMemoryResult]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    applyBasemapMode(basemapMode);
  }, [basemapMode]);

  useEffect(() => {
    if (!locateRequestKey) return;
    const map = mapRef.current;
    if (!map) return;
    if (!navigator.geolocation) {
      onLocateResultRef.current("当前浏览器不支持定位。", true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const businessCoordinates: [number, number] = [position.coords.longitude, position.coords.latitude];
        const displayCoordinates = toDisplayCoordinate(businessCoordinates);
        const locationLayer = locationLayerRef.current;
        const locationSource = locationLayer?.getSource();
        locationSource?.clear();

        if (locationSource) {
          const accuracyFeature = new Feature({
            geometry: new CircleGeometry(fromLonLat(displayCoordinates), Math.max(position.coords.accuracy || 0, 12)),
          });
          accuracyFeature.setStyle(
            new Style({
              fill: new Fill({ color: "rgba(10, 132, 255, 0.12)" }),
              stroke: new Stroke({ color: "rgba(10, 132, 255, 0.28)", width: 1.5 }),
            }),
          );

          const markerFeature = new Feature({
            geometry: new Point(fromLonLat(displayCoordinates)),
          });
          markerFeature.setStyle(
            new Style({
              image: new CircleStyle({
                radius: 8,
                fill: new Fill({ color: "#0a84ff" }),
                stroke: new Stroke({ color: "rgba(255, 255, 255, 0.96)", width: 3 }),
              }),
            }),
          );

          locationSource.addFeatures([accuracyFeature, markerFeature]);
        }

        map.getView().animate({
          center: fromLonLat(displayCoordinates),
          zoom: Math.max(map.getView().getZoom() ?? 12, 16),
          duration: 450,
        });
        onLocateResultRef.current(
          `已定位到当前位置：${businessCoordinates[0].toFixed(5)}, ${businessCoordinates[1].toFixed(5)}，精度约 ${Math.round(position.coords.accuracy)} 米`,
        );
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "定位权限被拒绝。"
            : error.code === error.POSITION_UNAVAILABLE
              ? "当前位置不可用。"
              : error.code === error.TIMEOUT
                ? "定位超时，请重试。"
                : "定位失败。";
        onLocateResultRef.current(message, true);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60_000,
      },
    );
  }, [locateRequestKey]);

  useEffect(() => {
    if (!fitAllRequestKey) return;
    const map = mapRef.current;
    if (!map) return;
    const extents = (displayLayerRef.current?.getSource()?.getFeatures() ?? [])
      .map((feature) => feature.getGeometry()?.getExtent())
      .filter(Boolean) as ReturnType<OlGeometry["getExtent"]>[];
    if (extents.length === 0) return;

    const mergedExtent = createEmpty();
    extents.forEach((extent) => extendExtent(mergedExtent, extent));
    hasAppliedInitialFitRef.current = true;
    map.getView().fit(bufferExtent(mergedExtent, 120), {
      duration: 350,
      maxZoom: 15,
      padding: [70, 70, 70, 70],
    });
    window.setTimeout(() => saveViewState(map), 380);
  }, [fitAllRequestKey]);

  useEffect(() => {
    if (!clearViewMemoryRequestKey) return;
    window.localStorage.removeItem(VIEW_STATE_STORAGE_KEY);
    onViewMemoryResultRef.current("已清除当前位置记忆，下次刷新将不再回到当前视角。");
  }, [clearViewMemoryRequestKey]);

  useEffect(() => {
    if (!mapElementRef.current) return;

    const vectorLayer = new TileLayer({
      source: new XYZ({
        url: "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scl=1&style=7&x={x}&y={y}&z={z}",
        crossOrigin: "anonymous",
        maxZoom: 19,
      }),
    });
    vectorLayer.setZIndex(0);

    const vectorLabelLayer = new TileLayer({
      source: new XYZ({
        url: "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scl=2&style=8&x={x}&y={y}&z={z}",
        crossOrigin: "anonymous",
        maxZoom: 19,
      }),
    });
    vectorLabelLayer.setZIndex(1);

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: "https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
        crossOrigin: "anonymous",
        maxZoom: 19,
      }),
    });
    satelliteLayer.setZIndex(0);

    const satelliteLabelLayer = new TileLayer({
      source: new XYZ({
        url: "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scl=2&style=8&x={x}&y={y}&z={z}",
        crossOrigin: "anonymous",
        maxZoom: 19,
      }),
    });
    satelliteLabelLayer.setZIndex(1);

    const persistedView = loadInitialViewState();
    const initialCenter = toDisplayCoordinate(persistedView?.center ?? DEFAULT_CENTER);
    const initialZoom = persistedView?.zoom ?? DEFAULT_ZOOM;
    hasAppliedInitialFitRef.current = Boolean(persistedView);

    const map = new Map({
      target: mapElementRef.current,
      controls: defaultControls(),
      layers: [vectorLayer, vectorLabelLayer, satelliteLayer, satelliteLabelLayer],
      view: new View({
        center: fromLonLat(initialCenter),
        zoom: initialZoom,
      }),
    });
    mapRef.current = map;
    basemapLayersRef.current = {
      vector: vectorLayer,
      vectorLabel: vectorLabelLayer,
      satellite: satelliteLayer,
      satelliteLabel: satelliteLabelLayer,
    };
    applyBasemapMode(basemapMode);
    const displayLayer = new VectorLayer({
      source: new VectorSource(),
      renderOrder: (left, right) => {
        const leftPayload = left.get("payload") as MapFeature | undefined;
        const rightPayload = right.get("payload") as MapFeature | undefined;
        const leftPriority = leftPayload ? drawPriority[leftPayload.object_type] ?? 100 : 100;
        const rightPriority = rightPayload ? drawPriority[rightPayload.object_type] ?? 100 : 100;
        return leftPriority - rightPriority;
      },
    });
    displayLayer.setZIndex(120);
    displayLayerRef.current = displayLayer;
    map.addLayer(displayLayer);

    const locationLayer = new VectorLayer({
      source: new VectorSource(),
    });
    locationLayer.setZIndex(160);
    locationLayerRef.current = locationLayer;
    map.addLayer(locationLayer);

    const draftLayer = new VectorLayer({
      source: new VectorSource(),
    });
    draftLayer.setZIndex(200);
    draftLayerRef.current = draftLayer;
    map.addLayer(draftLayer);

    map.on("singleclick", (event) => {
      if (editModeRef.current !== "idle" || toolModeRef.current !== "browse") {
        const [lng, lat] = toLonLat(event.coordinate);
        const [businessLng, businessLat] = toBusinessCoordinate([lng, lat]);
        onMapCoordinateClickRef.current([Number(businessLng.toFixed(6)), Number(businessLat.toFixed(6))]);
        return;
      }

      let selected: MapFeature | null = null;
      map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => {
        const payload = feature.get("payload") as MapFeature | undefined;
        if (payload) {
          selected = payload;
          return true;
        }
        return false;
        },
        {
          hitTolerance: 6,
          layerFilter: (layer) => layer === displayLayerRef.current,
        },
      );
      onSelectRef.current(selected);
    });

    map.on("pointermove", (event) => {
      if (toolModeRef.current !== "box-select") return;
      const [lng, lat] = toLonLat(event.coordinate);
      const [businessLng, businessLat] = toBusinessCoordinate([lng, lat]);
      onMapPointerMoveRef.current([Number(businessLng.toFixed(6)), Number(businessLat.toFixed(6))]);
    });

    map.on("dblclick", (event) => {
      if (editModeRef.current !== "create-plot" && editModeRef.current !== "reshape-plot") return;
      event.preventDefault();
      onMapDoubleClickRef.current();
    });

    map.getViewport().addEventListener("contextmenu", (event) => {
      if (editModeRef.current !== "create-plot" && editModeRef.current !== "reshape-plot") return;
      event.preventDefault();
      onMapDoubleClickRef.current();
    });

    map.on("moveend", () => {
      saveViewState(map);
      scheduleViewportBoundsEmit(map);
    });

    map.on("change:size", () => {
      scheduleViewportBoundsEmit(map);
    });

    window.setTimeout(() => {
      scheduleViewportBoundsEmit(map);
    }, 0);

    return () => {
      clearViewportEmitTimer();
      map.setTarget(undefined);
      basemapLayersRef.current = null;
      mapRef.current = null;
      displayLayerRef.current = null;
      locationLayerRef.current = null;
      draftLayerRef.current = null;
    };
  }, [format]);

  useEffect(() => {
    const layer = displayLayerRef.current;
    if (!layer) return;
    const source = layer.getSource();
    if (!source) return;
    source.clear();

    const features = Object.entries(featuresByLayer)
      .filter(([layerKey]) => Boolean(activeLayers[layerKey]))
      .flatMap(([, items]) =>
        items.map((item) => {
          const displayGeometry = convertGeometryCoords(item.geom, wgs84ToGcj02);
          const feature = format.readFeature(
            {
              type: "Feature",
              geometry: displayGeometry,
              properties: {
                id: item.id,
              },
            },
            {
              featureProjection: "EPSG:3857",
              dataProjection: "EPSG:4326",
            },
          ) as Feature<OlGeometry>;
          feature.setId(item.id);
          feature.set("payload", item);
          feature.setStyle(
            buildFeatureStyle(
              item.object_type,
              analysisRiskById[item.id] ?? item.risk_level,
              item.id === selectedId,
              pulseIds.includes(item.id),
            ),
          );
          return feature;
        }),
      );

    source.addFeatures(features);
  }, [activeLayers, analysisRiskById, featuresByLayer, format, pulseIds, selectedId]);

  useEffect(() => {
    const draftLayer = draftLayerRef.current;
    if (!draftLayer) return;

    const source = draftLayer.getSource();
    if (!source) return;
    source.clear();

    if (editMode === "create-manhole" && manholeDraft.coordinates) {
      const displayCoordinate = toDisplayCoordinate(manholeDraft.coordinates);
      const feature = new Feature({
        geometry: new Point(fromLonLat(displayCoordinate)),
      });
      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: "rgba(14, 165, 233, 0.8)" }),
            stroke: new Stroke({ color: "#e0f2fe", width: 2 }),
          }),
        }),
      );
      source.addFeature(feature);
    }

    if ((editMode === "create-pipe" || editMode === "reshape-pipe") && pipeDraft.coordinates.length > 0) {
      const pointFeatures = pipeDraft.coordinates.map((coordinate) => {
        const displayCoordinate = toDisplayCoordinate(coordinate);
        const feature = new Feature({
          geometry: new Point(fromLonLat(displayCoordinate)),
        });
        feature.setStyle(
          new Style({
            image: new CircleStyle({
              radius: 5,
              fill: new Fill({ color: "rgba(245, 158, 11, 0.9)" }),
              stroke: new Stroke({ color: "#fffbeb", width: 2 }),
            }),
          }),
        );
        return feature;
      });
      source.addFeatures(pointFeatures);

      if (pipeDraft.coordinates.length >= 2) {
        const lineFeature = new Feature({
          geometry: new LineString(pipeDraft.coordinates.map((coordinate) => fromLonLat(toDisplayCoordinate(coordinate)))),
        });
        lineFeature.setStyle(
          new Style({
            stroke: new Stroke({
              color: "#f59e0b",
              width: 4,
              lineDash: [8, 6],
            }),
          }),
        );
        source.addFeature(lineFeature);
      }
    }
    if (toolMode === "box-select" && boxSelectionStart) {
      const end = boxSelectionPreview ?? boxSelectionStart;
      const west = Math.min(boxSelectionStart[0], end[0]);
      const south = Math.min(boxSelectionStart[1], end[1]);
      const east = Math.max(boxSelectionStart[0], end[0]);
      const north = Math.max(boxSelectionStart[1], end[1]);
      const polygon = new Polygon([[
        fromLonLat(toDisplayCoordinate([west, south])),
        fromLonLat(toDisplayCoordinate([east, south])),
        fromLonLat(toDisplayCoordinate([east, north])),
        fromLonLat(toDisplayCoordinate([west, north])),
        fromLonLat(toDisplayCoordinate([west, south])),
      ]]);
      const feature = new Feature({ geometry: polygon });
      feature.setStyle(
        new Style({
          fill: new Fill({ color: "rgba(56, 189, 248, 0.12)" }),
          stroke: new Stroke({ color: "#7dd3fc", width: 2, lineDash: [6, 4] }),
        }),
      );
      source.addFeature(feature);
    }

    if (toolMode === "measure" && measureDraft.length > 0) {
      const pointFeatures = measureDraft.map((coordinate) => {
        const displayCoordinate = toDisplayCoordinate(coordinate);
        const feature = new Feature({
          geometry: new Point(fromLonLat(displayCoordinate)),
        });
        feature.setStyle(
          new Style({
            image: new CircleStyle({
              radius: 5,
              fill: new Fill({ color: "rgba(52, 211, 153, 0.9)" }),
              stroke: new Stroke({ color: "#ecfdf5", width: 2 }),
            }),
          }),
        );
        return feature;
      });
      source.addFeatures(pointFeatures);

      if (measureDraft.length >= 2) {
        const lineFeature = new Feature({
          geometry: new LineString(measureDraft.map((coordinate) => fromLonLat(toDisplayCoordinate(coordinate)))),
        });
        lineFeature.setStyle(
          new Style({
            stroke: new Stroke({
              color: "#34d399",
              width: 3,
              lineDash: [10, 6],
            }),
          }),
        );
        source.addFeature(lineFeature);
      }
    }

    if ((editMode === "create-plot" || editMode === "reshape-plot") && plotDraft.coordinates.length > 0) {
      const pointFeatures = plotDraft.coordinates.map((coordinate) => {
        const displayCoordinate = toDisplayCoordinate(coordinate);
        const feature = new Feature({
          geometry: new Point(fromLonLat(displayCoordinate)),
        });
        feature.setStyle(
          new Style({
            image: new CircleStyle({
              radius: 5,
              fill: new Fill({ color: "rgba(96, 165, 250, 0.9)" }),
              stroke: new Stroke({ color: "#eff6ff", width: 2 }),
            }),
          }),
        );
        return feature;
      });
      source.addFeatures(pointFeatures);

      const polygonCoordinates = [...plotDraft.coordinates];
      if (polygonCoordinates.length >= 2) {
        const polygon = new Polygon([[
          ...polygonCoordinates.map((coordinate) => fromLonLat(toDisplayCoordinate(coordinate))),
          fromLonLat(toDisplayCoordinate(plotDraft.coordinates[0])),
        ]]);
        const feature = new Feature({ geometry: polygon });
        feature.setStyle(
          new Style({
            fill: new Fill({ color: "rgba(59, 130, 246, 0.18)" }),
            stroke: new Stroke({ color: "#60a5fa", width: 3, lineDash: [8, 5] }),
          }),
        );
        source.addFeature(feature);
      }
    }
  }, [boxSelectionPreview, boxSelectionStart, editMode, manholeDraft, measureDraft, pipeDraft, plotDraft, toolMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const view = map.getView();
    const extents = (displayLayerRef.current?.getSource()?.getFeatures() ?? [])
      .map((feature) => feature.getGeometry()?.getExtent())
      .filter(Boolean) as ReturnType<OlGeometry["getExtent"]>[];

    if (extents.length === 0) return;

    const mergedExtent = createEmpty();
    extents.forEach((extent) => extendExtent(mergedExtent, extent));
    if (selectedId) return;
    if (hasAppliedInitialFitRef.current) return;
    hasAppliedInitialFitRef.current = true;
    view.fit(bufferExtent(mergedExtent, 120), {
      duration: 350,
      maxZoom: 15,
      padding: [70, 70, 70, 70],
    });
  }, [activeLayers, featuresByLayer]);

  return <div ref={mapElementRef} className="map-canvas" />;
}
