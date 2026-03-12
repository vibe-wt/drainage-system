import { apiGet, apiPost } from "../../shared/api/client";

export interface LowCodAnalysisResult {
  summary: {
    total: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
    average_observed_cod: number;
  };
  items: Array<{
    plot_id: string;
    plot_code: string;
    plot_name: string;
    plot_type: string;
    geom: {
      type: "Polygon";
      coordinates: number[][][];
    };
    baseline_cod: number;
    observed_cod: number;
    water_usage_m3d: number;
    risk_level: "low" | "medium" | "high";
    label: string;
  }>;
}

export interface LowCodAnalysisRunSummary {
  run_id: string;
  analysis_type: string;
  status: string;
  created_at: string;
  summary: LowCodAnalysisResult["summary"];
}

export async function runLowCodAnalysis(payload: {
  plot_ids: string[];
  cod_threshold: number;
  expected_cod: number;
}): Promise<LowCodAnalysisResult> {
  return apiPost<LowCodAnalysisResult>("/analysis/low-cod/runs", payload);
}

export async function fetchLatestLowCodAnalysis(): Promise<LowCodAnalysisResult> {
  return apiGet<LowCodAnalysisResult>("/analysis/low-cod/latest");
}

export async function fetchLowCodAnalysisRuns(): Promise<LowCodAnalysisRunSummary[]> {
  const response = await apiGet<{ items: LowCodAnalysisRunSummary[] }>("/analysis/low-cod/runs");
  return response.items;
}

export async function fetchLowCodAnalysisRun(runId: string): Promise<LowCodAnalysisResult> {
  return apiGet<LowCodAnalysisResult>(`/analysis/low-cod/runs/${runId}`);
}
