import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchLowCodAnalysisRuns } from "../analysis-center/api";
import { fetchMapObjects } from "../../features/map-core/api";
import { apiGet } from "../../shared/api/client";
import type { ImportBatch } from "../import-management/types";

type AdminOverviewStats = {
  assetTypeCount: number;
  managedAssetCount: number;
  pendingImportCount: number;
  completedRunCount: number;
  latestRunTime: string;
};

const quickLinks = [
  { title: "资产管理", desc: "进入台账页查看真实资产列表、筛选对象并直接跳地图定位。", to: "/admin/assets" },
  { title: "导入批次", desc: "查看后端真实导入历史、失败明细和继续处理入口。", to: "/admin/import-batches" },
  { title: "分析记录", desc: "查看真实分析 run 状态、结果摘要和地图回图入口。", to: "/admin/analysis-runs" },
];

function formatDateTime(value: string) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadOverview();
  }, []);

  async function loadOverview() {
    setIsLoading(true);
    setError(null);
    try {
      const [objectsResponse, importResponse, analysisRuns] = await Promise.all([
        fetchMapObjects(),
        apiGet<{ items: ImportBatch[] }>("/import-batches"),
        fetchLowCodAnalysisRuns(),
      ]);

      const managedLayers = ["manholes", "pipes", "plots"];
      const managedAssetCount = managedLayers.reduce((acc, key) => acc + (objectsResponse.meta.counts[key] ?? 0), 0);
      const assetTypeCount = managedLayers.filter((key) => (objectsResponse.meta.counts[key] ?? 0) > 0).length;
      const pendingImportCount = importResponse.items.filter((item) => item.import_status !== "completed").length;
      const completedRunCount = analysisRuns.filter((item) => item.status === "completed").length;
      const latestRunTime = analysisRuns[0]?.created_at ?? "";

      setStats({
        assetTypeCount,
        managedAssetCount,
        pendingImportCount,
        completedRunCount,
        latestRunTime,
      });
    } catch (loadError) {
      setStats(null);
      setError(loadError instanceof Error ? loadError.message : "读取后台总览失败");
    } finally {
      setIsLoading(false);
    }
  }

  const cards = [
    {
      label: "资产类型",
      value: stats ? `${stats.assetTypeCount} 类` : "--",
      caption: stats ? `共 ${stats.managedAssetCount} 个真实资产对象` : "正在读取检查井、管道、地块对象",
    },
    {
      label: "待处理批次",
      value: stats ? `${stats.pendingImportCount} 个` : "--",
      caption: "需要继续核查错误明细或补做提交入库",
    },
    {
      label: "已完成分析",
      value: stats ? `${stats.completedRunCount} 次` : "--",
      caption: stats ? `最近一次分析 ${formatDateTime(stats.latestRunTime)}` : "正在读取分析历史记录",
    },
  ];

  return (
    <section className="admin-stack">
      <article className="admin-hero-card">
        <span className="admin-pill">Admin Console</span>
        <div>
          <h1>后台管理总览</h1>
          <p>这里汇总后台当前接入的真实资产、导入批次和分析记录，作为后台入口页使用，不扩展到地图核心交互。</p>
        </div>
      </article>

      <section className="admin-kpi-grid">
        {cards.map((card) => (
          <article key={card.label} className="admin-kpi-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.caption}</p>
          </article>
        ))}
      </section>

      <section className="admin-section-card">
        <div className="admin-section-head">
          <div>
            <span className="admin-section-kicker">Quick Start</span>
            <h3>第一批后台能力</h3>
          </div>
          <button type="button" className="admin-ghost-button" onClick={() => void loadOverview()} disabled={isLoading}>
            {isLoading ? "刷新中" : "刷新总览"}
          </button>
        </div>
        {isLoading ? (
          <article className="admin-state-card">
            <strong>总览加载中</strong>
            <p>正在汇总资产、导入批次和分析记录。</p>
          </article>
        ) : null}
        {error ? (
          <article className="admin-state-card">
            <strong>总览读取失败</strong>
            <p>{error}</p>
          </article>
        ) : null}
        <div className="admin-link-grid">
          {quickLinks.map((item) => (
            <Link key={item.title} to={item.to} className="admin-link-card admin-link-card-action">
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
