import type { MapFeature } from "../../shared/types/map";

const propertyLabels: Record<string, string> = {
  manhole_type: "井类型",
  catchment_name: "所属片区",
  depth_m: "井深(m)",
  pipe_type: "管道类型",
  diameter_mm: "管径(mm)",
  start_manhole_id: "起点井",
  end_manhole_id: "终点井",
  outfall_type: "排口类型",
  receiving_water: "受纳水体",
  pump_station_type: "泵站类型",
  capacity_m3d: "规模(m3/d)",
  plot_type: "地块类型",
  water_usage_m3d: "用水量(m3/d)",
  cod_baseline: "基准COD",
  catchment_type: "片区类型",
  score: "风险评分",
  monitor_type: "监测类型",
  linked_object_type: "关联对象类型",
  linked_object_id: "关联对象ID",
  cod: "COD",
  last_observed_at: "最近监测时间",
  priority: "优先级",
  owner: "负责人",
};

function formatCoordinates(feature: MapFeature): string {
  if (feature.geom.type === "Point") {
    const [lng, lat] = feature.geom.coordinates as number[];
    return `${lng.toFixed(4)}, ${lat.toFixed(4)}`;
  }

  if (feature.geom.type === "LineString") {
    const coordinates = feature.geom.coordinates as number[][];
    return `${coordinates.length} 个节点`;
  }

  const coordinates = feature.geom.coordinates as number[][][];
  return `${coordinates[0]?.length ?? 0} 个边界点`;
}

export function getDetailFields(feature: MapFeature) {
  return Object.entries(feature.properties).map(([key, value]) => ({
    key,
    label: propertyLabels[key] ?? key,
    value: String(value),
  }));
}

export function getMetaFields(feature: MapFeature) {
  return [
    { label: "几何类型", value: feature.geom.type },
    { label: "对象 ID", value: feature.id },
    { label: "空间摘要", value: formatCoordinates(feature) },
  ];
}
