import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { riskLevelLabels } from "../../features/map-core/object-meta";
import {
  fetchDashboardCatchmentRanking,
  fetchDashboardMapOverview,
  fetchDashboardOverview,
  fetchDashboardProblemDistribution,
  fetchDashboardRiskRanking,
  fetchDashboardTaskProgress,
  type DashboardMapOverviewItem,
  type DashboardOverviewData,
  type DashboardProblemDistributionData,
  type DashboardRankingItem,
  type DashboardTaskProgressData,
} from "./api";
import {
  fetchLowCodAnalysisRuns,
  type LowCodAnalysisRunSummary,
} from "../analysis-center/api";

export function DashboardPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<LowCodAnalysisRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [taskProgress, setTaskProgress] = useState<DashboardTaskProgressData | null>(null);
  const [problemDistribution, setProblemDistribution] = useState<DashboardProblemDistributionData | null>(null);
  const [riskRanking, setRiskRanking] = useState<DashboardRankingItem[]>([]);
  const [catchmentRanking, setCatchmentRanking] = useState<DashboardRankingItem[]>([]);
  const [mapOverview, setMapOverview] = useState<DashboardMapOverviewItem[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSwitchingRun, setIsSwitchingRun] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadLatest() {
      setIsBootstrapping(true);
      setLoadError(null);
      try {
        const [history, taskData, problemData, overviewData, riskData, catchmentData, mapData] = await Promise.all([
          fetchLowCodAnalysisRuns(),
          fetchDashboardTaskProgress(),
          fetchDashboardProblemDistribution(),
          fetchDashboardOverview(),
          fetchDashboardRiskRanking(),
          fetchDashboardCatchmentRanking(),
          fetchDashboardMapOverview(),
        ]);
        if (!cancelled) {
          setRuns(history);
          setTaskProgress(taskData);
          setProblemDistribution(problemData);
          setOverview(overviewData);
          setRiskRanking(riskData);
          setCatchmentRanking(catchmentData);
          setMapOverview(mapData);
          if (history[0]) {
            setSelectedRunId(history[0].run_id);
          }
        }
      } catch {
        if (!cancelled) {
          setRuns([]);
          setSelectedRunId("");
          setOverview(null);
          setTaskProgress(null);
          setProblemDistribution(null);
          setRiskRanking([]);
          setCatchmentRanking([]);
          setMapOverview([]);
          setLoadError("Dashboard 暂无可用分析数据。先到分析中心运行一次低浓度分析。");
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }
    void loadLatest();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSelectRun(runId: string) {
    if (runId === selectedRunId) {
      return;
    }
    setSelectedRunId(runId);
    setIsSwitchingRun(true);
    setLoadError(null);
    try {
      const [taskData, problemData, overviewData, riskData, catchmentData, mapData] = await Promise.all([
        fetchDashboardTaskProgress(runId),
        fetchDashboardProblemDistribution(runId),
        fetchDashboardOverview(runId),
        fetchDashboardRiskRanking(runId),
        fetchDashboardCatchmentRanking(runId),
        fetchDashboardMapOverview(runId),
      ]);
      setTaskProgress(taskData);
      setProblemDistribution(problemData);
      setOverview(overviewData);
      setRiskRanking(riskData);
      setCatchmentRanking(catchmentData);
      setMapOverview(mapData);
    } catch {
      setLoadError("历史分析切换失败，已保留当前展示内容。");
    } finally {
      setIsSwitchingRun(false);
    }
  }

  return (
    <section className="stack-page">
      <header>
        <h2>Dashboard</h2>
        <p>当前先同步最近一次低浓度外水分析结果，作为领导和项目经理的汇总入口。</p>
      </header>
      {isSwitchingRun ? (
        <article className="panel stack-panel dashboard-status-banner">
          <strong>正在切换历史分析</strong>
          <span className="muted-inline">当前内容会保留，待新的聚合结果返回后再整体更新。</span>
        </article>
      ) : null}
      {loadError ? (
        <article className="panel stack-panel dashboard-status-banner dashboard-status-error">
          <strong>数据状态</strong>
          <span className="muted-inline">{loadError}</span>
        </article>
      ) : null}
      {runs.length ? (
        <article className="panel stack-panel">
          <strong>分析历史切换</strong>
          <div className="history-chip-row">
            {runs.map((run) => (
              <button
                key={run.run_id}
                type="button"
                className={`history-chip ${selectedRunId === run.run_id ? "active" : ""}`}
                onClick={() => void handleSelectRun(run.run_id)}
                disabled={isSwitchingRun}
              >
                {new Date(run.created_at).toLocaleString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </button>
            ))}
          </div>
        </article>
      ) : isBootstrapping ? (
        <article className="panel stack-panel">
          <strong>分析历史切换</strong>
          <div className="history-chip-row">
            <span className="history-chip history-chip-placeholder">加载历史分析中</span>
          </div>
        </article>
      ) : null}
      <div className="card-grid">
        <article className="panel stack-panel">
          <strong>项目总览</strong>
          {overview ? (
            <div className="summary-grid">
              <article className="summary-card">
                <span>分析对象</span>
                <strong>{overview.analysis_object_count}</strong>
              </article>
              <article className="summary-card">
                <span>检查井</span>
                <strong>{overview.manhole_count}</strong>
              </article>
              <article className="summary-card">
                <span>管道长度(m)</span>
                <strong>{overview.pipe_length_m}</strong>
              </article>
              <article className="summary-card summary-high">
                <span>高风险</span>
                <strong>{overview.high_risk_area_count}</strong>
              </article>
              <article className="summary-card summary-medium">
                <span>中风险</span>
                <strong>{overview.medium_risk_area_count}</strong>
              </article>
              <article className="summary-card summary-low">
                <span>低风险</span>
                <strong>{overview.low_risk_area_count}</strong>
              </article>
            </div>
          ) : isBootstrapping ? (
            <DashboardEmptyState title="项目总览加载中" description="正在读取后端聚合数据。" />
          ) : (
            <DashboardEmptyState title="暂无项目总览" description="先到分析中心运行一次低浓度分析，再回到 Dashboard 查看。" />
          )}
        </article>

        <article className="panel stack-panel">
          <strong>风险分布总览</strong>
          {mapOverview.length ? (
            <RiskOverviewMap
              items={mapOverview}
              onSelectPlot={(plotId) => navigate(`/?feature=${plotId}`)}
            />
          ) : isBootstrapping ? (
            <DashboardEmptyState title="风险分布加载中" description="正在整理地图专题分布。" />
          ) : (
            <DashboardEmptyState title="暂无空间分布" description="当前没有可用于展示的风险分布对象。" />
          )}
        </article>

        <article className="panel stack-panel">
          <strong>风险排名</strong>
          {riskRanking.length ? (
            <ul className="search-results batch-result-list">
              {riskRanking.map((item) => (
                  <li key={item.object_id}>
                    <button
                      type="button"
                      className="search-result-button"
                      onClick={() => navigate(`/?feature=${item.object_id}`)}
                    >
                      <strong>{item.object_code}</strong>
                      <span>
                        {item.object_name} · {riskLevelLabels[item.risk_level]} · 实测 COD {item.observed_cod}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          ) : isBootstrapping ? (
            <DashboardEmptyState title="风险排名加载中" description="正在读取后端聚合的风险排序。" />
          ) : (
            <DashboardEmptyState title="暂无风险排名" description="当前没有可展示的风险排序结果。" />
          )}
        </article>

        <article className="panel stack-panel">
          <strong>片区排名</strong>
          {catchmentRanking.length ? (
            <ul className="search-results batch-result-list">
              {catchmentRanking.map((item) => (
                <li key={item.object_id}>
                  <button
                    type="button"
                    className="search-result-button"
                    onClick={() => navigate(`/?feature=${item.object_id}`)}
                  >
                    <strong>{item.object_code}</strong>
                    <span>
                      {item.object_name} · {item.label} · 基线 {item.baseline_cod}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : isBootstrapping ? (
            <DashboardEmptyState title="片区排名加载中" description="正在汇总片区层级的分析结果。" />
          ) : (
            <DashboardEmptyState title="暂无片区排名" description="当前还没有片区排名结果。" />
          )}
        </article>

        <article className="panel stack-panel">
          <strong>任务进度</strong>
          {taskProgress ? (
            <TaskProgressCard data={taskProgress} />
          ) : isBootstrapping ? (
            <DashboardEmptyState title="任务进度加载中" description="正在读取后端聚合的任务进度摘要。" />
          ) : (
            <DashboardEmptyState title="暂无任务进度" description="当前还没有可展示的任务进度数据。" />
          )}
        </article>

        <article className="panel stack-panel">
          <strong>问题分布</strong>
          {problemDistribution ? (
            <ProblemDistributionCard
              data={problemDistribution}
              onOpenAnalysis={() => navigate("/analysis")}
              onOpenMap={() => navigate("/")}
            />
          ) : isBootstrapping ? (
            <DashboardEmptyState title="问题分布加载中" description="正在读取后端聚合的问题类型分布。" />
          ) : (
            <DashboardEmptyState title="暂无问题分布" description="当前还没有可展示的问题分布数据。" />
          )}
        </article>
      </div>
    </section>
  );
}

function DashboardEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="detail-empty dashboard-empty">
      <strong>{title}</strong>
      <span className="muted-inline">{description}</span>
    </div>
  );
}

function TaskProgressCard({ data }: { data: DashboardTaskProgressData }) {
  return (
    <>
      <div className="summary-grid">
        <article className="summary-card summary-high">
          <span>待优先处置</span>
          <strong>{data.pending_count}</strong>
        </article>
        <article className="summary-card summary-medium">
          <span>研判中</span>
          <strong>{data.in_progress_count}</strong>
        </article>
        <article className="summary-card summary-low">
          <span>已闭环</span>
          <strong>{data.completed_count}</strong>
        </article>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span className="progress-segment progress-high" style={{ width: `${data.pending_ratio * 100}%` }} />
        <span className="progress-segment progress-medium" style={{ width: `${data.in_progress_ratio * 100}%` }} />
        <span className="progress-segment progress-low" style={{ width: `${data.completed_ratio * 100}%` }} />
      </div>
      <p className="muted-inline">当前由后端 Dashboard 聚合接口返回任务进度摘要，和历史分析切换保持同步。</p>
    </>
  );
}

function ProblemDistributionCard({
  data,
  onOpenAnalysis,
  onOpenMap,
}: {
  data: DashboardProblemDistributionData;
  onOpenAnalysis: () => void;
  onOpenMap: () => void;
}) {
  return (
    <div className="detail-card">
      <h4>问题类型分布</h4>
      <div className="problem-list">
        <div className="problem-row">
          <span>明显外水混入</span>
          <strong>{data.severe_count}</strong>
        </div>
        <div className="problem-row">
          <span>低浓度异常</span>
          <strong>{data.weak_count}</strong>
        </div>
        <div className="problem-row">
          <span>浓度正常</span>
          <strong>{data.normal_count}</strong>
        </div>
      </div>
      <p>平均实测 COD：{data.average_observed_cod}</p>
      <div className="form-actions import-template-actions">
        <button type="button" className="tool-button" onClick={onOpenAnalysis}>
          去分析中心
        </button>
        <button type="button" className="tool-button" onClick={onOpenMap}>
          去地图工作台
        </button>
      </div>
    </div>
  );
}

function RiskOverviewMap({
  items,
  onSelectPlot,
}: {
  items: DashboardMapOverviewItem[];
  onSelectPlot: (plotId: string) => void;
}) {
  const polygons = items.map((item) => ({
    ...item,
    ring: item.geom.coordinates[0] ?? [],
  }));
  const allPoints = polygons.flatMap((item) => item.ring);
  const lngs = allPoints.map((point) => point[0]);
  const lats = allPoints.map((point) => point[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const width = 420;
  const height = 220;
  const pad = 16;
  const project = (lng: number, lat: number) => {
    const x = pad + ((lng - minLng) / Math.max(maxLng - minLng, 0.000001)) * (width - pad * 2);
    const y = height - pad - ((lat - minLat) / Math.max(maxLat - minLat, 0.000001)) * (height - pad * 2);
    return [x, y];
  };
  const fillByRisk = {
    high: "rgba(239, 68, 68, 0.78)",
    medium: "rgba(245, 158, 11, 0.74)",
    low: "rgba(74, 222, 128, 0.72)",
  } as const;

  return (
    <div className="dashboard-map-card">
      <svg viewBox={`0 0 ${width} ${height}`} className="dashboard-map-svg" role="img" aria-label="风险分布总览图">
        <rect x="0" y="0" width={width} height={height} rx="16" fill="rgba(8, 20, 28, 0.92)" />
        {polygons.map((item) => (
          <polygon
            key={item.object_id}
            points={item.ring.map(([lng, lat]) => project(lng, lat).join(",")).join(" ")}
            fill={fillByRisk[item.risk_level]}
            stroke="rgba(255,255,255,0.78)"
            strokeWidth="2"
            className="dashboard-map-polygon"
            onClick={() => onSelectPlot(item.object_id)}
          />
        ))}
      </svg>
      <div className="dashboard-legend-row">
        <span className="legend-chip legend-high" />
        <span>高风险</span>
        <span className="legend-chip legend-medium" />
        <span>中风险</span>
        <span className="legend-chip legend-low" />
        <span>低风险</span>
      </div>
    </div>
  );
}
