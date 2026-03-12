import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { fetchMapObjects } from "../../features/map-core/api";
import { getDetailFields, getMetaFields } from "../../features/map-core/detail-format";
import { objectTypeLabels, riskLevelLabels } from "../../features/map-core/object-meta";
import type { MapFeature } from "../../shared/types/map";

type AdminAssetType = "manhole" | "pipe" | "plot";

type AdminAssetRow = {
  id: string;
  code: string;
  name: string;
  type: AdminAssetType;
  area: string;
  owner: string;
  statusLabel: string;
  statusClassName: string;
  note: string;
  updatedAt: string;
};

const managedAssetTypes: AdminAssetType[] = ["manhole", "pipe", "plot"];

const assetTypeLabelMap: Record<AdminAssetType, string> = {
  manhole: "检查井",
  pipe: "管道",
  plot: "地块",
};

function normalizeStatus(feature: MapFeature) {
  const source = String(feature.status || feature.properties.status || "").toLowerCase();
  if (source.includes("error") || source.includes("fail")) {
    return { label: "异常", className: "status-failed" };
  }
  if (source.includes("draft") || source.includes("pending")) {
    return { label: "草稿", className: "status-draft" };
  }
  if (source.includes("warning")) {
    return { label: "待核查", className: "status-warning" };
  }
  if (source.includes("active") || source.includes("ready") || source.includes("normal")) {
    return { label: "已就绪", className: "status-ready" };
  }
  if (feature.risk_level === "high") {
    return { label: "待核查", className: "status-warning" };
  }
  return { label: "已就绪", className: "status-ready" };
}

function formatAssetRow(feature: MapFeature): AdminAssetRow | null {
  if (!managedAssetTypes.includes(feature.object_type as AdminAssetType)) {
    return null;
  }

  const props = feature.properties ?? {};
  const status = normalizeStatus(feature);
  const area =
    String(props.catchment_name ?? props.area_name ?? props.area ?? props.region_name ?? props.plot_group ?? "未分配");
  const owner = String(props.owner ?? props.manager ?? props.team ?? props.source ?? "未指定");
  const updatedAt = String(props.updated_at ?? props.updatedAt ?? props.created_at ?? props.createdAt ?? "");
  const risk = riskLevelLabels[feature.risk_level] ?? feature.risk_level;
  const noteParts = [
    props.manhole_type ? `井型 ${String(props.manhole_type)}` : "",
    props.pipe_type ? `管型 ${String(props.pipe_type)}` : "",
    props.diameter_mm ? `管径 ${String(props.diameter_mm)}` : "",
    feature.object_type === "plot" ? `风险 ${risk}` : "",
  ].filter(Boolean);

  return {
    id: feature.id,
    code: feature.code,
    name: feature.name,
    type: feature.object_type as AdminAssetType,
    area,
    owner,
    statusLabel: status.label,
    statusClassName: status.className,
    note: noteParts.join(" / ") || `风险等级 ${risk}`,
    updatedAt,
  };
}

function formatDateLabel(value: string) {
  if (!value) return "无时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN");
}

export function AdminAssetsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [selectedType, setSelectedType] = useState<AdminAssetType | "all">(
    () => (searchParams.get("type") as AdminAssetType | "all") || "all",
  );
  const [keyword, setKeyword] = useState(() => searchParams.get("keyword") ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "warning" | "draft" | "failed">(
    () => (searchParams.get("status") as "all" | "ready" | "warning" | "draft" | "failed") || "all",
  );
  const [selectedAssetId, setSelectedAssetId] = useState(() => searchParams.get("asset") ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAssets();
  }, []);

  async function loadAssets() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchMapObjects();
      const items = Object.values(response.data)
        .flat()
        .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
      setFeatures(items);
    } catch (loadError) {
      setFeatures([]);
      setError(loadError instanceof Error ? loadError.message : "读取资产对象失败");
    } finally {
      setIsLoading(false);
    }
  }

  const assetRows = useMemo(() => features.map(formatAssetRow).filter((item): item is AdminAssetRow => Boolean(item)), [features]);

  const filteredAssets = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return assetRows.filter((item) => {
      const matchType = selectedType === "all" || item.type === selectedType;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "ready" && item.statusClassName === "status-ready") ||
        (statusFilter === "warning" && item.statusClassName === "status-warning") ||
        (statusFilter === "draft" && item.statusClassName === "status-draft") ||
        (statusFilter === "failed" && item.statusClassName === "status-failed");
      const matchKeyword =
        normalizedKeyword.length === 0 ||
        item.code.toLowerCase().includes(normalizedKeyword) ||
        item.name.toLowerCase().includes(normalizedKeyword) ||
        item.area.toLowerCase().includes(normalizedKeyword);
      return matchType && matchStatus && matchKeyword;
    });
  }, [assetRows, keyword, selectedType, statusFilter]);

  useEffect(() => {
    if (!filteredAssets.length) {
      setSelectedAssetId("");
      return;
    }
    if (!filteredAssets.some((item) => item.id === selectedAssetId)) {
      setSelectedAssetId(filteredAssets[0].id);
    }
  }, [filteredAssets, selectedAssetId]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (selectedType !== "all") nextParams.set("type", selectedType);
    if (keyword.trim()) nextParams.set("keyword", keyword.trim());
    if (statusFilter !== "all") nextParams.set("status", statusFilter);
    if (selectedAssetId) nextParams.set("asset", selectedAssetId);
    setSearchParams(nextParams, { replace: true });
  }, [keyword, selectedAssetId, selectedType, setSearchParams, statusFilter]);

  const summary = {
    total: filteredAssets.length,
    ready: filteredAssets.filter((item) => item.statusClassName === "status-ready").length,
    warning: filteredAssets.filter((item) => item.statusClassName === "status-warning").length,
  };

  const selectedFeature = features.find((item) => item.id === selectedAssetId) ?? null;
  const selectedRow = filteredAssets.find((item) => item.id === selectedAssetId) ?? null;
  const detailFields = selectedFeature ? getDetailFields(selectedFeature).filter((item) => item.value !== "null") : [];
  const metaFields = selectedFeature ? getMetaFields(selectedFeature) : [];

  return (
    <section className="admin-stack">
      <article className="admin-section-card">
        <div className="admin-section-head">
          <div>
            <span className="admin-section-kicker">Assets</span>
            <h3>资产管理</h3>
          </div>
          <div className="admin-action-row">
            <button type="button" className="admin-ghost-button" onClick={() => void loadAssets()} disabled={isLoading}>
              {isLoading ? "刷新中" : "刷新列表"}
            </button>
            <button type="button" className="admin-ghost-button" onClick={() => navigate("/")}>
              返回地图工作台
            </button>
            <button type="button" className="admin-ghost-button" onClick={() => navigate("/imports")}>
              前往导入管理
            </button>
          </div>
        </div>
        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <span>当前结果</span>
            <strong>{summary.total}</strong>
            <p>筛选后的真实资产数量</p>
          </article>
          <article className="admin-summary-card">
            <span>已就绪</span>
            <strong>{summary.ready}</strong>
            <p>可直接用于地图与分析</p>
          </article>
          <article className="admin-summary-card">
            <span>待核查</span>
            <strong>{summary.warning}</strong>
            <p>高风险或状态异常对象</p>
          </article>
        </div>

        <div className="admin-toolbar">
          <div className="admin-filter-chip-row" role="tablist" aria-label="资产类型">
            <button type="button" className={`admin-filter-chip ${selectedType === "all" ? "active" : ""}`} onClick={() => setSelectedType("all")}>
              全部
            </button>
            {managedAssetTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={`admin-filter-chip ${selectedType === type ? "active" : ""}`}
                onClick={() => setSelectedType(type)}
              >
                {assetTypeLabelMap[type]}
              </button>
            ))}
          </div>
          <div className="admin-toolbar-fields">
            <input
              className="admin-search-input"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索编号、名称、片区"
            />
            <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "ready" | "warning" | "draft" | "failed")}>
              <option value="all">全部状态</option>
              <option value="ready">已就绪</option>
              <option value="warning">待核查</option>
              <option value="draft">草稿</option>
              <option value="failed">异常</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <article className="admin-state-card">
            <strong>资产列表加载中</strong>
            <p>正在读取检查井、管道和地块对象。</p>
          </article>
        ) : null}
        {error ? (
          <article className="admin-state-card">
            <strong>资产读取失败</strong>
            <p>{error}</p>
          </article>
        ) : null}

        <div className="admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>对象</th>
                <th>类型</th>
                <th>片区</th>
                <th>负责人</th>
                <th>状态</th>
                <th>说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((row) => (
                <tr key={row.id} className={selectedAssetId === row.id ? "admin-table-row-active" : ""}>
                  <td>
                    <button type="button" className="admin-table-button" onClick={() => setSelectedAssetId(row.id)}>
                      <div className="admin-table-primary">
                        <strong>{row.code}</strong>
                        <span>{row.name}</span>
                      </div>
                    </button>
                  </td>
                  <td>{objectTypeLabels[row.type] ?? row.type}</td>
                  <td>{row.area}</td>
                  <td>{row.owner}</td>
                  <td>
                    <span className={`admin-status-pill ${row.statusClassName}`}>{row.statusLabel}</span>
                  </td>
                  <td>
                    <div className="admin-table-primary">
                      <strong>{formatDateLabel(row.updatedAt)}</strong>
                      <span>{row.note}</span>
                    </div>
                  </td>
                  <td>
                    <button type="button" className="admin-inline-button" onClick={() => navigate(`/?feature=${row.id}`)}>
                      地图定位
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filteredAssets.length === 0 ? (
            <article className="admin-state-card">
              <strong>没有资产记录</strong>
              <p>当前筛选条件下没有匹配的资产对象。</p>
            </article>
          ) : null}
        </div>

        {selectedFeature && selectedRow ? (
          <section className="admin-detail-panel">
            <div className="admin-section-head">
              <div>
                <span className="admin-section-kicker">Asset Detail</span>
                <h3>
                  {selectedRow.code} · {selectedRow.name}
                </h3>
              </div>
              <span className={`admin-status-pill ${selectedRow.statusClassName}`}>{selectedRow.statusLabel}</span>
            </div>

            <div className="admin-detail-grid">
              <article className="admin-detail-card">
                <strong>对象摘要</strong>
                <p>类型：{objectTypeLabels[selectedFeature.object_type] ?? selectedFeature.object_type}</p>
                <p>片区：{selectedRow.area}</p>
                <p>负责人：{selectedRow.owner}</p>
                <p>风险等级：{riskLevelLabels[selectedFeature.risk_level] ?? selectedFeature.risk_level}</p>
                <p>说明：{selectedRow.note}</p>
              </article>
              <article className="admin-detail-card">
                <strong>快捷操作</strong>
                <div className="admin-action-row">
                  <button type="button" className="admin-inline-button" onClick={() => navigate(`/?feature=${selectedFeature.id}`)}>
                    地图定位
                  </button>
                  {selectedFeature.object_type === "plot" ? (
                    <button type="button" className="admin-inline-button" onClick={() => navigate(`/analysis?plots=${selectedFeature.id}`)}>
                      发起分析
                    </button>
                  ) : (
                    <button type="button" className="admin-inline-button" onClick={() => navigate("/imports")}>
                      去导入管理
                    </button>
                  )}
                </div>
              </article>
            </div>

            <div className="admin-detail-grid">
              <article className="admin-detail-card">
                <strong>基础信息</strong>
                <ul className="admin-plain-list">
                  {metaFields.map((item) => (
                    <li key={item.label}>
                      {item.label}：{item.value}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="admin-detail-card">
                <strong>业务属性</strong>
                {detailFields.length ? (
                  <ul className="admin-plain-list">
                    {detailFields.slice(0, 12).map((item) => (
                      <li key={item.key}>
                        {item.label}：{item.value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>当前对象没有额外业务属性。</p>
                )}
              </article>
            </div>
          </section>
        ) : null}
      </article>
    </section>
  );
}
