import { apiGet } from "../../shared/api/client";

export interface DashboardOverviewData {
  project_count: number;
  manhole_count: number;
  pipe_length_m: number;
  monitoring_point_count: number;
  high_risk_area_count: number;
  medium_risk_area_count: number;
  low_risk_area_count: number;
  active_task_count: number;
  analysis_object_count: number;
  source_run_id: string | null;
}

export interface DashboardTaskProgressData {
  pending_count: number;
  in_progress_count: number;
  completed_count: number;
  pending_ratio: number;
  in_progress_ratio: number;
  completed_ratio: number;
  source_run_id: string | null;
}

export interface DashboardProblemDistributionData {
  severe_count: number;
  weak_count: number;
  normal_count: number;
  average_observed_cod: number;
  source_run_id: string | null;
}

export interface DashboardRankingItem {
  object_id: string;
  object_code: string;
  object_name: string;
  risk_level: "low" | "medium" | "high";
  observed_cod: number;
  baseline_cod: number;
  label: string;
}

export interface DashboardMapOverviewItem {
  object_id: string;
  object_code: string;
  object_name: string;
  risk_level: "low" | "medium" | "high";
  geom: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export async function fetchDashboardOverview(runId?: string): Promise<DashboardOverviewData> {
  const query = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
  const response = await apiGet<{ data: DashboardOverviewData }>(`/dashboard/overview${query}`);
  return response.data;
}

export async function fetchDashboardTaskProgress(runId?: string): Promise<DashboardTaskProgressData> {
  const query = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
  const response = await apiGet<{ data: DashboardTaskProgressData }>(`/dashboard/task-progress${query}`);
  return response.data;
}

export async function fetchDashboardProblemDistribution(runId?: string): Promise<DashboardProblemDistributionData> {
  const query = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
  const response = await apiGet<{ data: DashboardProblemDistributionData }>(`/dashboard/problem-distribution${query}`);
  return response.data;
}

export async function fetchDashboardRiskRanking(runId?: string): Promise<DashboardRankingItem[]> {
  const query = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
  const response = await apiGet<{ items: DashboardRankingItem[] }>(`/dashboard/risk-ranking${query}`);
  return response.items;
}

export async function fetchDashboardCatchmentRanking(runId?: string): Promise<DashboardRankingItem[]> {
  const query = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
  const response = await apiGet<{ items: DashboardRankingItem[] }>(`/dashboard/catchment-ranking${query}`);
  return response.items;
}

export async function fetchDashboardMapOverview(runId?: string): Promise<DashboardMapOverviewItem[]> {
  const query = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
  const response = await apiGet<{ items: DashboardMapOverviewItem[] }>(`/dashboard/map-overview${query}`);
  return response.items;
}
