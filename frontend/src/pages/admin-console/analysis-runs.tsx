import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  fetchLowCodAnalysisRun,
  fetchLowCodAnalysisRuns,
  type LowCodAnalysisResult,
  type LowCodAnalysisRunSummary,
} from "../analysis-center/api";

const analysisStatusLabelMap: Record<string, string> = {
  pending: "排队中",
  running: "运行中",
  completed: "已完成",
  failed: "失败",
};

const analysisTypeLabelMap: Record<string, string> = {
  low_cod: "低浓度外水分析",
};

function formatAnalysisStatus(status: string) {
  return analysisStatusLabelMap[status] ?? status;
}

function formatAnalysisType(type: string) {
  return analysisTypeLabelMap[type] ?? type;
}

function mapStatusClassName(status: string) {
  if (status === "completed") return "status-completed";
  if (status === "running" || status === "pending") return "status-warning";
  if (status === "failed") return "status-failed";
  return "status-draft";
}

export function AdminAnalysisRunsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [runs, setRuns] = useState<LowCodAnalysisRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState(() => searchParams.get("run") ?? "");
  const [selectedRun, setSelectedRun] = useState<LowCodAnalysisResult | null>(null);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "all");
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") ?? "all");
  const [onlyHighRisk, setOnlyHighRisk] = useState(() => searchParams.get("highRisk") === "1");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRuns();
  }, []);

  async function loadRuns() {
    setIsLoading(true);
    setError(null);
    try {
      const history = await fetchLowCodAnalysisRuns();
      setRuns(history);
      const nextRunId = history[0]?.run_id ?? "";
      setSelectedRunId((current) => current || nextRunId);
      if (!selectedRunId && nextRunId) {
        void loadRunDetail(nextRunId);
      }
    } catch (loadError) {
      setRuns([]);
      setSelectedRunId("");
      setSelectedRun(null);
      setError(loadError instanceof Error ? loadError.message : "读取分析记录失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRunDetail(runId: string) {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const detail = await fetchLowCodAnalysisRun(runId);
      setSelectedRun(detail);
    } catch (loadError) {
      setSelectedRun(null);
      setError(loadError instanceof Error ? loadError.message : "读取分析详情失败");
    } finally {
      setIsLoadingDetail(false);
    }
  }

  const filteredRows = useMemo(() => {
    return runs.filter((item) => {
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      const matchType = typeFilter === "all" || item.analysis_type === typeFilter;
      const matchHighRisk = !onlyHighRisk || item.summary.high_risk > 0;
      return matchStatus && matchType && matchHighRisk;
    });
  }, [onlyHighRisk, runs, statusFilter, typeFilter]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedRunId("");
      setSelectedRun(null);
      return;
    }
    if (!filteredRows.some((item) => item.run_id === selectedRunId)) {
      const nextRunId = filteredRows[0].run_id;
      setSelectedRunId(nextRunId);
      void loadRunDetail(nextRunId);
    }
  }, [filteredRows, selectedRunId]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (statusFilter !== "all") nextParams.set("status", statusFilter);
    if (typeFilter !== "all") nextParams.set("type", typeFilter);
    if (onlyHighRisk) nextParams.set("highRisk", "1");
    if (selectedRunId) nextParams.set("run", selectedRunId);
    setSearchParams(nextParams, { replace: true });
  }, [onlyHighRisk, selectedRunId, setSearchParams, statusFilter, typeFilter]);

  const summary = {
    total: runs.length,
    running: runs.filter((item) => item.status === "running" || item.status === "pending").length,
    highRisk: runs.reduce((acc, item) => acc + item.summary.high_risk, 0),
  };

  const selectedRunSummary = runs.find((item) => item.run_id === selectedRunId) ?? null;
  const selectedHighRiskItems = selectedRun?.items.filter((item) => item.risk_level === "high") ?? [];
  const selectedMediumRiskItems = selectedRun?.items.filter((item) => item.risk_level === "medium") ?? [];
  const avgBaselineCod = selectedRun?.items.length
    ? Math.round(selectedRun.items.reduce((acc, item) => acc + item.baseline_cod, 0) / selectedRun.items.length)
    : 0;
  const avgWaterUsage = selectedRun?.items.length
    ? Math.round(selectedRun.items.reduce((acc, item) => acc + item.water_usage_m3d, 0) / selectedRun.items.length)
    : 0;

  return (
    <section className="admin-stack">
      <article className="admin-section-card">
        <div className="admin-section-head">
          <div>
            <span className="admin-section-kicker">Analysis</span>
            <h3>分析记录管理</h3>
          </div>
          <div className="admin-action-row">
            <button type="button" className="admin-ghost-button" onClick={() => void loadRuns()} disabled={isLoading}>
              {isLoading ? "刷新中" : "刷新列表"}
            </button>
            <button type="button" className="admin-ghost-button" onClick={() => navigate("/analysis")}>
              前往分析中心
            </button>
          </div>
        </div>

        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <span>分析记录</span>
            <strong>{summary.total}</strong>
            <p>来自后端真实历史 run</p>
          </article>
          <article className="admin-summary-card">
            <span>运行中</span>
            <strong>{summary.running}</strong>
            <p>含排队中和运行中的任务</p>
          </article>
          <article className="admin-summary-card">
            <span>累计高风险</span>
            <strong>{summary.highRisk}</strong>
            <p>按历史 run 摘要累加</p>
          </article>
        </div>

        <div className="admin-toolbar">
          <div className="admin-toolbar-fields">
            <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">全部状态</option>
              {Object.entries(analysisStatusLabelMap).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
            <select className="admin-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">全部类型</option>
              {Array.from(new Set(runs.map((item) => item.analysis_type))).map((type) => (
                <option key={type} value={type}>
                  {formatAnalysisType(type)}
                </option>
              ))}
            </select>
            <button type="button" className={`admin-filter-chip ${onlyHighRisk ? "active" : ""}`} onClick={() => setOnlyHighRisk((current) => !current)}>
              仅看含高风险
            </button>
          </div>
          {isLoading ? (
            <article className="admin-state-card">
              <strong>分析记录加载中</strong>
              <p>正在读取历史 run 和结果摘要。</p>
            </article>
          ) : null}
          {error ? (
            <article className="admin-state-card">
              <strong>分析记录读取失败</strong>
              <p>{error}</p>
            </article>
          ) : null}
        </div>

        <div className="admin-list">
          {filteredRows.map((row) => (
            <article
              key={row.run_id}
              className={`admin-list-card admin-record-card ${selectedRunId === row.run_id ? "admin-record-card-active" : ""}`}
            >
              <button
                type="button"
                className="admin-record-main admin-record-button"
                onClick={() => {
                  setSelectedRunId(row.run_id);
                  void loadRunDetail(row.run_id);
                }}
              >
                <div className="admin-record-head">
                  <strong>{formatAnalysisType(row.analysis_type)}</strong>
                  <span className={`admin-status-pill ${mapStatusClassName(row.status)}`}>{formatAnalysisStatus(row.status)}</span>
                </div>
                <p>
                  {new Date(row.created_at).toLocaleString("zh-CN", { hour12: false })} · 分析对象 {row.summary.total} 个
                </p>
                <div className="admin-meta-row">
                  <span>高风险 {row.summary.high_risk}</span>
                  <span>中风险 {row.summary.medium_risk}</span>
                  <span>低风险 {row.summary.low_risk}</span>
                  <span>平均 COD {row.summary.average_observed_cod}</span>
                </div>
              </button>
              <div className="admin-action-column">
                <button type="button" className="admin-inline-button" onClick={() => navigate("/analysis")}>
                  打开分析中心
                </button>
                <button type="button" className="admin-inline-button" onClick={() => navigate("/dashboard")}>
                  打开 Dashboard
                </button>
              </div>
            </article>
          ))}
          {!isLoading && filteredRows.length === 0 ? (
            <article className="admin-state-card">
              <strong>没有分析记录</strong>
              <p>当前筛选条件下没有匹配的分析 run。</p>
            </article>
          ) : null}
        </div>

        {selectedRun ? (
          <section className="admin-detail-panel">
            <div className="admin-section-head">
              <div>
                <span className="admin-section-kicker">Run Detail</span>
                <h3>分析结果摘要</h3>
              </div>
              {isLoadingDetail ? <span className="admin-status-pill">详情加载中</span> : null}
            </div>

            <div className="admin-detail-grid">
              <article className="admin-detail-card">
                <strong>结果汇总</strong>
                <p>分析对象：{selectedRun.summary.total}</p>
                <p>高风险：{selectedRun.summary.high_risk}</p>
                <p>中风险：{selectedRun.summary.medium_risk}</p>
                <p>低风险：{selectedRun.summary.low_risk}</p>
                <p>平均实测 COD：{selectedRun.summary.average_observed_cod}</p>
              </article>
              <article className="admin-detail-card">
                <strong>快捷操作</strong>
                <div className="admin-action-row">
                  <button
                    type="button"
                    className="admin-inline-button"
                    onClick={() =>
                      navigate(`/?analysis=${selectedRun.items.map((item) => `${item.plot_id}:${item.risk_level}`).join(",")}`)
                    }
                  >
                    结果回图
                  </button>
                  <button type="button" className="admin-inline-button" onClick={() => navigate("/analysis")}>
                    去分析中心复跑
                  </button>
                </div>
              </article>
            </div>

            <div className="admin-detail-grid">
              <article className="admin-detail-card">
                <strong>运行快照</strong>
                <p>分析类型：{selectedRunSummary ? formatAnalysisType(selectedRunSummary.analysis_type) : "未知"}</p>
                <p>对象总数：{selectedRun.items.length}</p>
                <p>平均基线 COD：{avgBaselineCod}</p>
                <p>平均用水量：{avgWaterUsage}</p>
                <p>高风险占比：{selectedRun.summary.total ? `${Math.round((selectedRun.summary.high_risk / selectedRun.summary.total) * 100)}%` : "0%"}</p>
              </article>
              <article className="admin-detail-card">
                <strong>风险分层</strong>
                <div className="admin-tag-row">
                  <span className="admin-status-pill status-failed">高风险 {selectedRun.summary.high_risk}</span>
                  <span className="admin-status-pill status-warning">中风险 {selectedRun.summary.medium_risk}</span>
                  <span className="admin-status-pill status-ready">低风险 {selectedRun.summary.low_risk}</span>
                </div>
                <p>优先处理高风险对象，其次复核中风险对象的基础数据和监测值。</p>
              </article>
            </div>

            <div className="admin-detail-grid">
              <article className="admin-detail-card">
                <strong>高风险对象</strong>
                {selectedHighRiskItems.length ? (
                  <ul className="admin-plain-list">
                    {selectedHighRiskItems.slice(0, 8).map((item) => (
                        <li key={item.plot_id}>
                          <button type="button" className="admin-link-button" onClick={() => navigate(`/?feature=${item.plot_id}`)}>
                            {item.plot_code} · {item.plot_name} · COD {item.observed_cod}
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>当前 run 没有高风险对象。</p>
                )}
              </article>
              <article className="admin-detail-card">
                <strong>中风险与结果预览</strong>
                {selectedMediumRiskItems.length ? (
                  <ul className="admin-plain-list">
                    {selectedMediumRiskItems.slice(0, 8).map((item) => (
                      <li key={item.plot_id}>
                        {item.plot_code} · {item.label} · 基线 {item.baseline_cod} / 实测 {item.observed_cod}
                      </li>
                    ))}
                  </ul>
                ) : selectedRun.items.length ? (
                  <ul className="admin-plain-list">
                    {selectedRun.items.slice(0, 8).map((item) => (
                      <li key={item.plot_id}>
                        {item.plot_code} · {item.label} · 基线 {item.baseline_cod} / 实测 {item.observed_cod}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>当前 run 暂无结果对象。</p>
                )}
              </article>
            </div>
          </section>
        ) : null}
      </article>
    </section>
  );
}
