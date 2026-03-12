export type SourceType = "excel" | "geojson";
export type ObjectType = "manholes" | "pipes";

export interface ImportBatch {
  id: string;
  batch_name: string;
  source_type: SourceType;
  object_type: ObjectType;
  import_status: string;
  file_name?: string | null;
  total_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  preview_rows: Record<string, unknown>[];
  columns: string[];
  error_summary: string[];
  imported_objects: Array<{ id: string; code: string; object_type: string }>;
}

export const importBatchObjectTypeLabelMap: Record<ObjectType, string> = {
  manholes: "检查井",
  pipes: "管道",
};

export const importBatchSourceTypeLabelMap: Record<SourceType, string> = {
  excel: "Excel",
  geojson: "GeoJSON",
};

export const importBatchStatusLabelMap: Record<string, string> = {
  created: "已创建",
  uploaded: "已上传",
  previewed: "已预览",
  completed: "已完成",
  completed_with_errors: "完成但有错误",
  failed: "失败",
};
