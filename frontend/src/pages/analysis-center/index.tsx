import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  fetchLatestLowCodAnalysis,
  fetchLowCodAnalysisRun,
  fetchLowCodAnalysisRuns,
  runLowCodAnalysis,
  type LowCodAnalysisResult,
  type LowCodAnalysisRunSummary,
} from "./api";
import { riskLevelLabels } from "../../features/map-core/object-meta";

export function AnalysisCenterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [codThreshold, setCodThreshold] = useState(200);
  const [expectedCod, setExpectedCod] = useState(400);
  const [plotIds, setPlotIds] = useState<string[]>([]);
  const [result, setResult] = useState<LowCodAnalysisResult | null>(null);
  const [runs, setRuns] = useState<LowCodAnalysisRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const plots = searchParams
      .get("plots")
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
    setPlotIds(plots);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadLatest() {
      try {
        const [latest, history] = await Promise.all([
          fetchLatestLowCodAnalysis(),
          fetchLowCodAnalysisRuns(),
        ]);
        if (!cancelled) {
          setResult(latest);
          setRuns(history);
          if (history[0]) {
            setSelectedRunId(history[0].run_id);
          }
        }
      } catch {
        if (!cancelled) {
          setResult(null);
          setRuns([]);
          setSelectedRunId("");
        }
      }
    }
    void loadLatest();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    try {
      const next = await runLowCodAnalysis({
        plot_ids: plotIds,
        cod_threshold: codThreshold,
        expected_cod: expectedCod,
      });
      setResult(next);
      const history = await fetchLowCodAnalysisRuns();
      setRuns(history);
      if (history[0]) {
        setSelectedRunId(history[0].run_id);
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "分析执行失败");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSelectRun(runId: string) {
    setSelectedRunId(runId);
    setError(null);
    try {
      const next = await fetchLowCodAnalysisRun(runId);
      setResult(next);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "读取分析记录失败");
    }
  }

  return (
    <section className="stack-page">
      <header>
        <h2>分析中心</h2>
        <p>第一阶段先落低浓度外水风险分析。可从地图工作台带入单个地块或框选地块。</p>
      </header>
      <div className="card-grid">
        <article className="panel stack-panel">
          <strong>参数配置</strong>
          {runs.length ? (
            <label className="compact-field">
              <span>历史分析</span>
              <select
                className="text-input"
                value={selectedRunId}
                onChange={(event) => void handleSelectRun(event.target.value)}
              >
                <option value="">选择历史分析</option>
                {runs.map((run) => (
                  <option key={run.run_id} value={run.run_id}>
                    {new Date(run.created_at).toLocaleString("zh-CN", { hour12: false })} · {run.summary.total} 个对象
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="compact-field">
            <span>目标地块</span>
            <input
              className="text-input"
              value={plotIds.join(",")}
              onChange={(event) =>
                setPlotIds(
                  event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
              }
              placeholder="plot_001,plot_002"
            />
          </label>
          <label className="compact-field">
            <span>低浓度阈值 COD</span>
            <input
              className="text-input"
              type="number"
              value={codThreshold}
              onChange={(event) => setCodThreshold(Number(event.target.value))}
            />
          </label>
          <label className="compact-field">
            <span>期望 COD 基线</span>
            <input
              className="text-input"
              type="number"
              value={expectedCod}
              onChange={(event) => setExpectedCod(Number(event.target.value))}
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="form-actions import-template-actions">
            <button type="button" className="tool-button active" onClick={() => void handleRun()} disabled={isRunning}>
              {isRunning ? "分析中" : "运行分析"}
            </button>
            <button type="button" className="tool-button" onClick={() => navigate("/")}>
              返回地图
            </button>
          </div>
        </article>

        <article className="panel stack-panel">
          <strong>结果摘要</strong>
          {result ? (
            <>
              <div className="summary-grid">
                <article className="summary-card">
                  <span>分析对象</span>
                  <strong>{result.summary.total}</strong>
                </article>
                <article className="summary-card summary-high">
                  <span>高风险</span>
                  <strong>{result.summary.high_risk}</strong>
                </article>
                <article className="summary-card summary-medium">
                  <span>中风险</span>
                  <strong>{result.summary.medium_risk}</strong>
                </article>
                <article className="summary-card summary-low">
                  <span>低风险</span>
                  <strong>{result.summary.low_risk}</strong>
                </article>
                <article className="summary-card">
                  <span>平均实测 COD</span>
                  <strong>{result.summary.average_observed_cod}</strong>
                </article>
              </div>
              <div className="form-actions import-template-actions">
                <button
                  type="button"
                  className="tool-button active"
                  onClick={() =>
                    navigate(
                      `/?analysis=${result.items.map((item) => `${item.plot_id}:${item.risk_level}`).join(",")}`,
                    )
                  }
                >
                  结果回图
                </button>
              </div>
            </>
          ) : (
            <p className="muted-inline">运行分析后显示结果摘要。</p>
          )}
        </article>

        <article className="panel stack-panel">
          <strong>结果列表</strong>
          {result ? (
            <ul className="search-results batch-result-list">
              {result.items.map((item) => (
                <li key={item.plot_id}>
                  <button
                    type="button"
                    className="search-result-button"
                    onClick={() => navigate(`/?feature=${item.plot_id}`)}
                  >
                    <strong>{item.plot_code}</strong>
                    <span>
                      {item.plot_name} · {riskLevelLabels[item.risk_level]} · 实测 COD {item.observed_cod}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-inline">当前还没有分析结果。</p>
          )}
        </article>

        <article className="panel stack-panel">
          <strong>历史记录</strong>
          {runs.length ? (
            <ul className="search-results batch-result-list">
              {runs.map((run) => (
                <li key={run.run_id}>
                  <button
                    type="button"
                    className={`search-result-button ${selectedRunId === run.run_id ? "active-history" : ""}`}
                    onClick={() => void handleSelectRun(run.run_id)}
                  >
                    <strong>{new Date(run.created_at).toLocaleString("zh-CN", { hour12: false })}</strong>
                    <span>
                      {run.summary.total} 个对象 · 高 {run.summary.high_risk} / 中 {run.summary.medium_risk} / 低 {run.summary.low_risk}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-inline">还没有历史分析记录。</p>
          )}
        </article>

        <article className="panel stack-panel">
          <strong>结果说明</strong>
          <p className="muted-inline">规则：实测 COD 低于阈值时判定为疑似外水影响。高风险对象通常明显低于阈值。</p>
          {result?.items?.[0] ? (
            <div className="detail-card">
              <h4>当前首个对象</h4>
              <p>{result.items[0].plot_name}</p>
              <p>基线 COD：{result.items[0].baseline_cod}</p>
              <p>实测 COD：{result.items[0].observed_cod}</p>
              <p>判定：{result.items[0].label}</p>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
