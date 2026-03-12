export const layerRegistry = [
  { key: "manholes", label: "检查井" },
  { key: "pipes", label: "管道" },
  { key: "outfalls", label: "排口" },
  { key: "pump_stations", label: "泵站" },
  { key: "plots", label: "地块" },
  { key: "catchments", label: "流域" },
  { key: "monitoring_points", label: "监测点" },
  { key: "task_areas", label: "任务范围" },
] as const;

export type LayerKey = (typeof layerRegistry)[number]["key"];
