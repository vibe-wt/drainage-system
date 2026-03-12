import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiGet, apiPost, apiPostForm } from "../../shared/api/client";

const API_BASE_URL = "http://localhost:8000/api/v1";

type SourceType = "excel" | "geojson";
type ObjectType = "manholes" | "pipes";

interface ImportBatch {
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

export function ImportManagementPage() {
  const navigate = useNavigate();
  const [batchName, setBatchName] = useState("首批导入");
  const [sourceType, setSourceType] = useState<SourceType>("excel");
  const [objectType, setObjectType] = useState<ObjectType>("manholes");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [currentBatch, setCurrentBatch] = useState<ImportBatch | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void loadBatches();
  }, []);

  const targetFields = useMemo(() => {
    if (objectType === "manholes") {
      return ["code", "name", "risk_level", "manhole_type", "catchment_name", "depth_m", "lng", "lat"];
    }
    return ["code", "name", "risk_level", "pipe_type", "diameter_mm", "start_manhole_id", "end_manhole_id", "coordinates"];
  }, [objectType]);

  async function loadBatches() {
    const response = await apiGet<{ items: ImportBatch[] }>("/import-batches");
    setBatches(response.items);
    if (!currentBatch && response.items.length > 0) {
      setCurrentBatch(response.items[0]);
      setPreviewColumns(response.items[0].columns);
      setPreviewRows(response.items[0].preview_rows);
    }
  }

  function buildSuggestedMapping(columns: string[]) {
    const suggestions: Record<string, string> = {};
    targetFields.forEach((field) => {
      const exact = columns.find((column) => column.toLowerCase() === field.toLowerCase());
      if (exact) suggestions[field] = exact;
    });
    return suggestions;
  }

  async function handleCreateAndUpload() {
    if (!selectedFile) {
      setError("请先选择要上传的文件。");
      return;
    }
    setIsBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const batchResponse = await apiPost<{ data: ImportBatch }>("/import-batches", {
        batch_name: batchName,
        source_type: sourceType,
        object_type: objectType,
      });
      const createdBatch = batchResponse.data;
      const form = new FormData();
      form.append("file", selectedFile);
      const uploaded = await apiPostForm<{ data: ImportBatch }>(`/import-batches/${createdBatch.id}/file`, form);
      setCurrentBatch(uploaded.data);
      setPreviewColumns(uploaded.data.columns);
      setMapping(buildSuggestedMapping(uploaded.data.columns));
      setPreviewRows(uploaded.data.preview_rows);
      setFeedback(`文件 ${uploaded.data.file_name ?? ""} 已上传，可继续预览并导入。`);
      await loadBatches();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePreview() {
    if (!currentBatch) return;
    setIsBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await apiPost<{ data: { columns: string[]; preview_rows: Record<string, unknown>[] } }>(
        `/import-batches/${currentBatch.id}/preview`,
        { mapping },
      );
      setPreviewColumns(response.data.columns);
      setPreviewRows(response.data.preview_rows);
      setFeedback("预览已更新。");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "预览失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCommit() {
    if (!currentBatch) return;
    setIsBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await apiPost<{ data: { success_count: number; failed_count: number; imported_objects: Array<{ id: string }> } }>(
        `/import-batches/${currentBatch.id}/commit`,
        { mapping },
      );
      setFeedback(`导入完成，成功 ${response.data.success_count} 条，失败 ${response.data.failed_count} 条。`);
      const refreshed = await apiGet<{ data: ImportBatch }>(`/import-batches/${currentBatch.id}`);
      setCurrentBatch(refreshed.data);
      setPreviewColumns(refreshed.data.columns);
      setPreviewRows(refreshed.data.preview_rows);
      await loadBatches();
      if (response.data.success_count > 0 && response.data.imported_objects.length > 0) {
        navigate(`/?imported=${response.data.imported_objects.map((item) => item.id).join(",")}`);
      }
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "导入失败");
    } finally {
      setIsBusy(false);
    }
  }

  function openImportedObjectsOnMap(batch: ImportBatch) {
    if (batch.imported_objects.length === 0) {
      return;
    }
    navigate(`/?imported=${batch.imported_objects.map((item) => item.id).join(",")}`);
  }

  return (
    <section className="stack-page">
      <header>
        <h2>导入管理</h2>
        <p>当前支持检查井/管道的 Excel 与 GeoJSON 导入，包含上传、预览、字段映射和提交入库。</p>
        <div className="form-actions import-template-actions">
          <a
            className="tool-button"
            href={`${API_BASE_URL}/import-batches/templates/${objectType}/${sourceType}`}
            target="_blank"
            rel="noreferrer"
          >
            下载当前模板
          </a>
          <span className="muted-inline">
            当前模板：{objectType === "manholes" ? "检查井" : "管道"} / {sourceType === "excel" ? "Excel" : "GeoJSON"}
          </span>
        </div>
      </header>
      <div className="card-grid import-grid">
        <article className="panel stack-panel">
          <strong>导入来源</strong>
          <input className="text-input" value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="导入批次名称" />
          <select className="text-input" value={sourceType} onChange={(event) => setSourceType(event.target.value as SourceType)}>
            <option value="excel">Excel</option>
            <option value="geojson">GeoJSON</option>
          </select>
          <select className="text-input" value={objectType} onChange={(event) => setObjectType(event.target.value as ObjectType)}>
            <option value="manholes">检查井</option>
            <option value="pipes">管道</option>
          </select>
          <input className="text-input" type="file" accept={sourceType === "excel" ? ".xlsx,.xls" : ".geojson,.json"} onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
          <button type="button" className="tool-button active" onClick={() => void handleCreateAndUpload()} disabled={isBusy || !selectedFile}>
            {isBusy ? "处理中" : "创建批次并上传"}
          </button>
          {feedback ? <p className="success-text">{feedback}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </article>

        <article className="panel stack-panel">
          <strong>字段映射</strong>
          {currentBatch ? (
            <>
              <p>当前批次：{currentBatch.batch_name}</p>
              <p>状态：{currentBatch.import_status}</p>
              <p>文件：{currentBatch.file_name ?? "未上传"}</p>
              {targetFields.map((field) => (
                <label key={field} className="stack-panel compact-field">
                  <span>{field}</span>
                  <select
                    className="text-input"
                    value={mapping[field] ?? ""}
                    onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}
                  >
                    <option value="">未映射</option>
                    {previewColumns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <div className="form-actions">
                <button type="button" className="tool-button" onClick={() => void handlePreview()} disabled={isBusy}>
                  预览
                </button>
                <button type="button" className="tool-button active" onClick={() => void handleCommit()} disabled={isBusy}>
                  提交入库
                </button>
              </div>
            </>
          ) : (
            <p>先上传一个批次，然后在这里做字段映射。</p>
          )}
        </article>

        <article className="panel stack-panel">
          <strong>预览结果</strong>
          {previewRows.length > 0 ? (
            <div className="preview-table">
              <div className="preview-row preview-head">
                {Object.keys(previewRows[0] ?? {}).map((key) => (
                  <span key={key}>{key}</span>
                ))}
              </div>
              {previewRows.map((row, index) => (
                <div key={index} className="preview-row">
                  {Object.entries(row).map(([key, value]) => (
                    <span key={key}>{Array.isArray(value) ? JSON.stringify(value) : String(value ?? "")}</span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p>上传并点击预览后，这里会显示前 5 条标准化结果。</p>
          )}
        </article>

        <article className="panel stack-panel">
          <strong>批次记录</strong>
          <ul className="plain-list import-batch-list">
            {batches.map((batch) => (
              <li key={batch.id}>
                <button
                  type="button"
                  className={`batch-button ${currentBatch?.id === batch.id ? "active" : ""}`}
                  onClick={() => {
                    setCurrentBatch(batch);
                    setPreviewColumns(batch.columns);
                    setPreviewRows(batch.preview_rows);
                    setMapping(buildSuggestedMapping(batch.columns));
                    setFeedback(null);
                    setError(null);
                  }}
                >
                  <strong>{batch.batch_name}</strong>
                  <span>
                    {batch.object_type} · {batch.import_status}
                  </span>
                  <span>
                    成功 {batch.success_count} / 失败 {batch.failed_count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {currentBatch ? (
            <div className="detail-card">
              <h4>当前批次结果</h4>
              <p>状态：{currentBatch.import_status}</p>
              <p>总数：{currentBatch.total_count}</p>
              <p>成功：{currentBatch.success_count}</p>
              <p>失败：{currentBatch.failed_count}</p>
              <p>说明：</p>
              <p>`uploaded` 表示文件已上传但还没提交入库。</p>
              <p>`completed_with_errors` 表示已尝试入库，但有失败记录。</p>
              <p>`completed` 表示全部成功入库。</p>
              {currentBatch.imported_objects.length > 0 ? (
                <>
                  <div className="form-actions form-actions-between">
                    <h4>已导入对象</h4>
                    <button type="button" className="tool-button" onClick={() => openImportedObjectsOnMap(currentBatch)}>
                      去地图查看
                    </button>
                  </div>
                  <ul className="plain-list">
                    {currentBatch.imported_objects.map((item) => (
                      <li key={item.id}>
                        {item.code} · {item.object_type}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {currentBatch.error_summary.length > 0 ? (
                <>
                  <h4>失败明细</h4>
                  <ul className="plain-list">
                    {currentBatch.error_summary.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>当前批次没有失败明细。</p>
              )}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
