import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";

const riskAccent: Record<string, string> = {
  low: "#30d158",
  medium: "#ff9f0a",
  high: "#ff453a",
};

const baseStroke: Record<string, string> = {
  manhole: "#0a84ff",
  monitoring_point: "#ff9f0a",
  outfall: "#ff375f",
  pump_station: "#30d158",
  pipe: "#5e5ce6",
  plot: "#0a84ff",
  catchment: "#ff453a",
  task_area: "#ffd60a",
};

const baseFill: Record<string, string> = {
  manhole: "#64d2ff",
  monitoring_point: "#ffb340",
  outfall: "#ff6482",
  pump_station: "#46e083",
  pipe: "#7c7af8",
  plot: "rgba(10, 132, 255, 0.14)",
  catchment: "rgba(255, 69, 58, 0.06)",
  task_area: "rgba(255, 214, 10, 0.08)",
};

const selectedGlow = "#0a84ff";
const selectedHalo = "rgba(10, 132, 255, 0.18)";

export function buildFeatureStyle(objectType: string, riskLevel: string, isSelected = false, isPulsing = false): Style | Style[] {
  const riskColor = riskAccent[riskLevel] ?? "#94a3b8";
  const primaryStroke = baseStroke[objectType] ?? "#94a3b8";
  const primaryFill = baseFill[objectType] ?? "rgba(148, 163, 184, 0.18)";
  const pulseBoost = isPulsing ? 1.5 : 0;

  if (objectType === "pipe") {
    const baseWidth = isSelected ? 5.4 + pulseBoost : 3.8;
    return [
      new Style({
        stroke: new Stroke({
          color: isSelected ? selectedHalo : "rgba(255, 255, 255, 0.88)",
          width: baseWidth + (isSelected ? 6 : 3),
          lineCap: "round",
          lineJoin: "round",
        }),
        zIndex: isSelected ? 68 : 44,
      }),
      new Style({
        stroke: new Stroke({
          color: isSelected ? selectedGlow : primaryStroke,
          width: baseWidth,
          lineCap: "round",
          lineJoin: "round",
        }),
        zIndex: isSelected ? 69 : 45,
      }),
      new Style({
        stroke: new Stroke({
          color: riskColor,
          width: Math.max(1.4, baseWidth - 2.2),
          lineCap: "round",
          lineJoin: "round",
        }),
        zIndex: isSelected ? 70 : 46,
      }),
    ];
  }

  if (objectType === "plot" || objectType === "catchment" || objectType === "task_area") {
    const zIndex = objectType === "task_area" ? 25 : objectType === "plot" ? 20 : 10;
    return [
      new Style({
        fill: new Fill({ color: isSelected ? selectedHalo : primaryFill }),
        stroke: new Stroke({
          color: isSelected ? selectedGlow : primaryStroke,
          width: isSelected ? 4.5 + pulseBoost : 2.4,
        }),
        zIndex: zIndex + 1,
      }),
      new Style({
        stroke: new Stroke({
          color: riskColor,
          width: isSelected ? 2.2 : 1.2,
          lineDash: objectType === "task_area" ? [8, 5] : undefined,
        }),
        zIndex: zIndex + 2,
      }),
    ];
  }

  return [
    new Style({
      image: new CircleStyle({
        radius: isSelected ? 11.5 + pulseBoost : 8.5,
        fill: new Fill({ color: isSelected ? selectedHalo : "rgba(255, 255, 255, 0.88)" }),
        stroke: new Stroke({ color: isSelected ? selectedGlow : "rgba(255, 255, 255, 0.92)", width: isSelected ? 3.5 : 2.6 }),
      }),
      zIndex: isSelected ? 80 : 60,
    }),
    new Style({
      image: new CircleStyle({
        radius: isSelected ? 7.6 + pulseBoost : 5.8,
        fill: new Fill({ color: primaryFill }),
        stroke: new Stroke({ color: primaryStroke, width: isSelected ? 2.6 : 2 }),
      }),
      zIndex: isSelected ? 81 : 61,
    }),
    new Style({
      image: new CircleStyle({
        radius: isSelected ? 4.4 : 3.6,
        fill: new Fill({ color: riskColor }),
        stroke: new Stroke({ color: "rgba(255,255,255,0.85)", width: 1.1 }),
      }),
      zIndex: isSelected ? 82 : 62,
    }),
  ];
}
