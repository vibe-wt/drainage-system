import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { apiGet } from "../../shared/api/client";
import {
  type ImportBatch,
  importBatchObjectTypeLabelMap,
  importBatchSourceTypeLabelMap,
  importBatchStatusLabelMap,
} from "../import-management/types";

function formatAdminImportStatus(status: string) {
  return importBatchStatusLabelMap[status] ?? status;
}

function mapStatusClassName(status: string) {
  if (status === "completed") return "status-completed";
  if (status === "completed_with_errors") return "status-warning";
  if (status === "uploaded" || status === "previewed" || status === "created") return "status-draft";
  if (status === "failed") return "status-failed";
  return "";
}

export function AdminImportBatchesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => searchParams.get("batch") ?? "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "excel" | "geojson">(
    () => (searchParams.get("source") as "all" | "excel" | "geojson") || "all",
  );
  const [onlyWithErrors, setOnlyWithErrors] = useState(() => searchParams.get("errors") === "1");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadBatches();
  }, []);

  async function loadBatches() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiGet<{ items: ImportBatch[] }>("/import-batches");
      setBatches(response.items);
      setSelectedBatchId((current) => current || response.items[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取导入批次失败");
      setBatches([]);
      setSelectedBatchId("");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    return batches.filter((item) => {
      const matchStatus = statusFilter === "all" || item.import_status === statusFilter;
      const matchSource = sourceFilter === "all" || item.source_type === sourceFilter;
      const matchErrors = !onlyWithErrors || item.failed_count > 0 || item.import_status === "completed_with_errors" || item.import_status === "failed";
      return matchStatus && matchSource && matchErrors;
    });
  }, [batches, onlyWithErrors, sourceFilter, statusFilter]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedBatchId("");
      return;
    }
    if (!filteredRows.some((item) => item.id === selectedBatchId)) {
      setSelectedBatchId(filteredRows[0].id);
    }
  }, [filteredRows, selectedBatchId]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (statusFilter !== "all") nextParams.set("status", statusFilter);
    if (sourceFilter !== "all") nextParams.set("source", sourceFilter);
    if (onlyWithErrors) nextParams.set("errors", "1");
    if (selectedBatchId) nextParams.set("batch", selectedBatchId);
    setSearchParams(nextParams, { replace: true });
  }, [onlyWithErrors, selectedBatchId, setSearchParams, sourceFilter, statusFilter]);

  const selectedBatch = filteredRows.find((item) => item.id === selectedBatchId) ?? null;

  const summary = {
    total: batches.length,
    pending: batches.filter((item) => item.import_status !== "completed").length,
    imported: batches.reduce((acc, item) => acc + item.success_count, 0),
  };

  const errorGroups = useMemo(() => {
    if (!selectedBatch) return [];
    const grouped = new Map<string, number>();
    selectedBatch.error_summary.forEach((item) => {
      const key = item.includes("重复") ? "重复编号" : item.includes("缺失") ? "字段缺失" : item.includes("检查井") ? "关联关系错误" : "其他错误";
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    return Array.from(grouped.entries()).map(([label, count]) => ({ label, count }));
  }, [selectedBatch]);

  const previewSampleRows = selectedBatch?.preview_rows.slice(0, 3) ?? [];

  return (
    <section className="admin-stack">
      <article className="admin-section-card">
        <div className="admin-section-head">
          <div>
            <span className="admin-section-kicker">Imports</span>
            <h3>导入批次管理</h3>
          </div>
          <div className="admin-action-row">
            <button type="button" className="admin-ghost-button" onClick={() => void loadBatches()} disabled={isLoading}>
              {isLoading ? "刷新中" : "刷新列表"}
            </button>
            <button type="button" className="admin-ghost-button" onClick={() => navigate("/imports")}>
              前往导入页
            </button>
          </div>
        </div>

        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <span>批次数量</span>
            <strong>{summary.total}</strong>
            <p>后端真实返回的导入履历</p>
          </article>
          <article className="admin-summary-card">
            <span>未完成</span>
            <strong>{summary.pending}</strong>
            <p>含已上传、已预览和失败批次</p>
          </article>
          <article className="admin-summary-card">
            <span>成功入库</span>
            <strong>{summary.imported}</strong>
            <p>累计成功写入对象数</p>
          </article>
        </div>

        <div className="admin-toolbar">
          <div className="admin-toolbar-fields">
            <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">全部状态</option>
              {Object.entries(importBatchStatusLabelMap).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
            <select className="admin-select" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "all" | "excel" | "geojson")}>
              <option value="all">全部来源</option>
              <option value="excel">Excel</option>
              <option value="geojson">GeoJSON</option>
            </select>
            <button type="button" className={`admin-filter-chip ${onlyWithErrors ? "active" : ""}`} onClick={() => setOnlyWithErrors((current) => !current)}>
              仅看异常批次
            </button>
          </div>
          {isLoading ? (
            <article className="admin-state-card">
              <strong>批次列表加载中</strong>
              <p>正在读取导入历史和处理结果。</p>
            </article>
          ) : null}
          {error ? (
            <article className="admin-state-card">
              <strong>批次读取失败</strong>
              <p>{error}</p>
            </article>
          ) : null}
        </div>

        <div className="admin-list">
          {filteredRows.map((row) => (
            <article
              key={row.id}
              className={`admin-list-card admin-record-card ${selectedBatchId === row.id ? "admin-record-card-active" : ""}`}
            >
              <button type="button" className="admin-record-main admin-record-button" onClick={() => setSelectedBatchId(row.id)}>
                <div className="admin-record-head">
                  <strong>{row.batch_name}</strong>
                  <span className={`admin-status-pill ${mapStatusClassName(row.import_status)}`}>{formatAdminImportStatus(row.import_status)}</span>
                </div>
                <p>
                  {importBatchObjectTypeLabelMap[row.object_type] ?? row.object_type} · {importBatchSourceTypeLabelMap[row.source_type] ?? row.source_type} ·
                  文件 {row.file_name ?? "未上传"}
                </p>
                <div className="admin-meta-row">
                  <span>{new Date(row.created_at).toLocaleString("zh-CN", { hour12: false })}</span>
                  <span>总计 {row.total_count}</span>
                  <span>成功 {row.success_count}</span>
                  <span>失败 {row.failed_count}</span>
                </div>
              </button>
              <div className="admin-action-column">
                <button type="button" className="admin-inline-button" onClick={() => navigate("/imports")}>
                  继续处理
                </button>
                <button
                  type="button"
                  className="admin-inline-button"
                  onClick={() =>
                    row.imported_objects.length
                      ? navigate(`/?imported=${row.imported_objects.map((item) => item.id).join(",")}`)
                      : navigate("/")
                  }
                >
                  去地图查看
                </button>
              </div>
            </article>
          ))}
          {!isLoading && filteredRows.length === 0 ? (
            <article className="admin-state-card">
              <strong>没有导入批次</strong>
              <p>当前筛选条件下没有匹配的导入记录。</p>
            </article>
          ) : null}
        </div>

        {selectedBatch ? (
          <section className="admin-detail-panel">
            <div className="admin-section-head">
              <div>
                <span className="admin-section-kicker">Batch Detail</span>
                <h3>{selectedBatch.batch_name}</h3>
              </div>
              <span className={`admin-status-pill ${mapStatusClassName(selectedBatch.import_status)}`}>
                {formatAdminImportStatus(selectedBatch.import_status)}
              </span>
            </div>
            <div className="admin-detail-grid">
              <article className="admin-detail-card">
                <strong>批次摘要</strong>
                <p>对象类型：{importBatchObjectTypeLabelMap[selectedBatch.object_type] ?? selectedBatch.object_type}</p>
                <p>来源类型：{importBatchSourceTypeLabelMap[selectedBatch.source_type] ?? selectedBatch.source_type}</p>
                <p>创建时间：{new Date(selectedBatch.created_at).toLocaleString("zh-CN", { hour12: false })}</p>
                <p>文件名：{selectedBatch.file_name ?? "未上传"}</p>
              </article>
              <article className="admin-detail-card">
                <strong>处理结果</strong>
                <p>总数：{selectedBatch.total_count}</p>
                <p>成功：{selectedBatch.success_count}</p>
                <p>失败：{selectedBatch.failed_count}</p>
                <p>预览列数：{selectedBatch.columns.length}</p>
              </article>
            </div>

            <div className="admin-detail-grid">
              <article className="admin-detail-card">
                <strong>失败明细</strong>
                {selectedBatch.error_summary.length ? (
                  <>
                    <div className="admin-tag-row">
                      {errorGroups.map((item) => (
                        <span key={item.label} className="admin-status-pill status-warning">
                          {item.label} {item.count}
                        </span>
                      ))}
                    </div>
                    <ul className="admin-plain-list">
                      {selectedBatch.error_summary.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>当前批次没有失败明细。</p>
                )}
              </article>
              <article className="admin-detail-card">
                <strong>已导入对象</strong>
                {selectedBatch.imported_objects.length ? (
                  <ul className="admin-plain-list">
                    {selectedBatch.imported_objects.slice(0, 8).map((item) => (
                      <li key={item.id}>
                        {item.code} · {item.object_type}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>当前批次还没有入库对象。</p>
                )}
              </article>
            </div>

            <div className="admin-detail-grid">
              <article className="admin-detail-card">
                <strong>预览列摘要</strong>
                {selectedBatch.columns.length ? (
                  <div className="admin-tag-row">
                    {selectedBatch.columns.map((column) => (
                      <span key={column} className="admin-status-pill">
                        {column}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>当前批次没有预览列。</p>
                )}
              </article>
              <article className="admin-detail-card">
                <strong>预览样例</strong>
                {previewSampleRows.length ? (
                  <div className="admin-preview-list">
                    {previewSampleRows.map((row, index) => (
                      <div key={index} className="admin-preview-card">
                        {Object.entries(row).slice(0, 6).map(([key, value]) => (
                          <p key={key}>
                            <strong>{key}</strong>：{String(value ?? "")}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>当前批次没有预览样例。</p>
                )}
              </article>
            </div>
          </section>
        ) : null}
      </article>
    </section>
  );
}
