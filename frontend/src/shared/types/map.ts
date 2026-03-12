export type GeometryType = "Point" | "LineString" | "Polygon";

export type RiskLevel = "low" | "medium" | "high";

export interface Geometry {
  type: GeometryType;
  coordinates: number[] | number[][] | number[][][];
}

export interface MapFeature {
  id: string;
  code: string;
  name: string;
  object_type: string;
  risk_level: RiskLevel;
  status: string;
  properties: Record<string, string | number | boolean | null>;
  geom: Geometry;
}

export interface MapObjectsResponse {
  data: Record<string, MapFeature[]>;
  meta: {
    counts: Record<string, number>;
  };
}

export interface MapStats {
  manhole_count: number;
  pipe_count: number;
  pipe_length_m: number;
  monitoring_point_count: number;
}

export interface SearchResultItem {
  object_type: string;
  object_id: string;
  title: string;
  subtitle: string;
  risk_level: RiskLevel;
  geom: Geometry;
}

export type ViewportBounds = [number, number, number, number];
