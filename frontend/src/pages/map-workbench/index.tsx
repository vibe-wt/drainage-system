import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDetailFields, getMetaFields } from "../../features/map-core/detail-format";
import { objectTypeLabels, riskLevelLabels } from "../../features/map-core/object-meta";
import { useMapCore } from "../../features/map-core/use-map-core";
import type { MapFeature } from "../../shared/types/map";
import { useNavigate } from "react-router-dom";

const MapCanvas = lazy(async () => {
  const module = await import("../../widgets/map-canvas");
  return { default: module.MapCanvas };
});

function ToolbarIcon({ name }: { name: "box" | "measure" | "manhole" | "pipe" | "plot" }) {
  const icons = {
    box: (
      <path
        d="M5 5h14v14H5zM8 8h8v8H8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    ),
    measure: (
      <path
        d="M5 15 15 5m-7 13 2-2m2 0 2-2m2 0 2-2M7 17l2 2m8-12 2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    manhole: (
      <>
        <circle cx="12" cy="10" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 13.6v4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
    pipe: (
      <path
        d="M5 15c2.2 0 2.8-6 5-6s2.8 6 5 6 2.8-6 5-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    plot: (
      <path
        d="M6 6h9l3 4-4 8H6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    ),
  };

  return (
    <svg viewBox="0 0 24 24" className="button-icon" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function InspectorIcon({
  name,
}: {
  name:
    | "overview"
    | "code"
    | "status"
    | "risk"
    | "object"
    | "field"
    | "geo"
    | "link"
    | "analysis"
    | "form"
    | "water"
    | "shape";
}) {
  const icons = {
    overview: <path d="M5 7h14M5 12h10M5 17h8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
    code: (
      <path
        d="M9 8 5 12l4 4m6-8 4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    status: <path d="M7 12.5 10.2 16 17 8.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
    risk: <path d="m12 5 7 12H5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    object: (
      <>
        <circle cx="12" cy="8.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M6.5 18c1.4-2.5 3.2-3.7 5.5-3.7s4.1 1.2 5.5 3.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
    field: <path d="M6 7h12M6 12h12M6 17h8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
    geo: (
      <>
        <path d="M12 19s5-4.6 5-9a5 5 0 1 0-10 0c0 4.4 5 9 5 9Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="10" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </>
    ),
    link: <path d="M10 14 14 10m-6 1.5 1.8-1.8a2.8 2.8 0 0 1 4 4L12 15.5m4-3 1.8-1.8a2.8 2.8 0 0 0-4-4L12 8.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    analysis: <path d="M6 16V8m6 8V5m6 11v-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
    form: <path d="M7 6h10v12H7zM9.5 10.5h5m-5 3h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    water: <path d="M12 5c2.8 3.2 4.2 5.6 4.2 7.3A4.2 4.2 0 0 1 7.8 12.3C7.8 10.6 9.2 8.2 12 5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    shape: <path d="M6 7h9l3 4-4 6H6Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
  };

  return (
    <svg viewBox="0 0 24 24" className="field-icon" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function InspectorHero({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <section className="detail-card inspector-hero">
      <div className="inspector-hero-top">
        <span className="inspector-badge">{badge}</span>
      </div>
      <h4>{title}</h4>
      <p>{subtitle}</p>
    </section>
  );
}

function OverlayBanner({
  badge,
  title,
  description,
  tone = "default",
  actions,
}: {
  badge: string;
  title: string;
  description: string;
  tone?: "default" | "analysis" | "success";
  actions?: ReactNode;
}) {
  return (
    <div className={`map-overlay-card map-overlay-${tone}`}>
      <div className="map-overlay-main">
        <span className="map-overlay-badge">{badge}</span>
        <div className="map-overlay-copy">
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
      </div>
      {actions ? <div className="map-overlay-actions">{actions}</div> : null}
    </div>
  );
}

function PanelSection({
  title,
  icon,
  description,
  children,
  actions,
}: {
  title: string;
  icon: ReactNode;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="detail-card native-section">
      <div className="native-section-head">
        <div>
          <div className="native-section-title">
            {icon}
            <h4>{title}</h4>
          </div>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="native-section-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function FieldGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="field-group">
      <span className="field-label">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function SegmentedField({
  name,
  value,
  options,
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  return (
    <div className="segmented-control" role="tablist" aria-label={name}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`segmented-option ${selected === option.value ? "active" : ""}`}
          onClick={() => setSelected(option.value)}
        >
          {option.label}
        </button>
      ))}
      <input type="hidden" name={name} value={selected} />
    </div>
  );
}

export function MapWorkbenchPage() {
  const navigate = useNavigate();
  const [inspectorTab, setInspectorTab] = useState<"detail" | "edit" | "analysis">("detail");
  const [leftPanelTab, setLeftPanelTab] = useState<"overview" | "search" | "layers">("overview");
  const [basemapMode, setBasemapMode] = useState<"vector" | "satellite" | "imagery">("vector");
  const [locateRequestKey, setLocateRequestKey] = useState(0);
  const [fitAllRequestKey, setFitAllRequestKey] = useState(0);
  const [clearViewMemoryRequestKey, setClearViewMemoryRequestKey] = useState(0);
  const [locateFeedback, setLocateFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const {
    activeLayers,
    activeLayerCount,
    applyLayerPreset,
    analysisFocusIds,
    analysisRiskById,
    boxSelectionIds,
    boxSelectionPreview,
    boxSelectionStart,
    cancelEditing,
    clearAnalysisFocus,
    clearImportedFocus,
    clearMeasure,
    clearPipeDraft,
    clearPlotDraft,
    completePipeDraft,
    counts,
    editMode,
    editError,
    editSuccess,
    error,
    featureIndex,
    featuresByLayer,
    finishMeasure,
    finishPlotDrawing,
    handleMapCoordinateClick,
    isLoading,
    isSaving,
    manholeDraft,
    measureDraft,
    measureLengthMeters,
    pipeDraft,
    pipeEndpointSuggestions,
    plotDraft,
    pulseIds,
    relatedFeatures,
    riskSummary,
    riskFilter,
    showAnalysisOnly,
    showImportedOnly,
    saveSelectedFeature,
    searchKeyword,
    searchResults,
    selectedFeature,
    setRiskFilter,
    setSearchKeyword,
    setSelectedFeature,
    setShowAnalysisOnly,
    startCreateManhole,
    startCreatePipe,
    stats,
    removeSelectedFeature,
    resetWorkbenchView,
    resumePipeDraft,
    startBoxSelect,
    startMeasure,
    startReshapeSelectedPlot,
    startCreatePlot,
    startReshapeSelectedPipe,
    submitManhole,
    submitManholeMove,
    submitPlot,
    submitPlotReshape,
    submitPipe,
    submitPipeReshape,
    startMoveSelectedManhole,
    setShowImportedOnly,
    setViewportBounds,
    stopToolMode,
    toggleLayer,
    toolMode,
    updateBoxSelectionPreview,
    viewportStats,
    undoPlotPoint,
    undoPipePoint,
  } = useMapCore();

  const detailFields = selectedFeature ? getDetailFields(selectedFeature) : [];
  const metaFields = selectedFeature ? getMetaFields(selectedFeature) : [];
  const boxSelectedFeatures = useMemo(
    () => boxSelectionIds.map((id) => featureIndex[id]).filter(Boolean),
    [boxSelectionIds, featureIndex],
  );
  const boxSelectionSummary = boxSelectedFeatures.reduce<Record<string, number>>((acc, feature) => {
    acc[feature.object_type] = (acc[feature.object_type] ?? 0) + 1;
    return acc;
  }, {});
  const canShowDetailTab = Boolean(selectedFeature);
  const canShowEditTab =
    editMode !== "idle" ||
    selectedFeature?.object_type === "manhole" ||
    selectedFeature?.object_type === "pipe" ||
    selectedFeature?.object_type === "plot";
  const canShowAnalysisTab = boxSelectedFeatures.length > 0 || selectedFeature?.object_type === "plot";

  useEffect(() => {
    if (inspectorTab === "detail" && !canShowDetailTab) {
      if (canShowEditTab) {
        setInspectorTab("edit");
      } else if (canShowAnalysisTab) {
        setInspectorTab("analysis");
      }
    }

    if (inspectorTab === "edit" && !canShowEditTab) {
      if (canShowDetailTab) {
        setInspectorTab("detail");
      } else if (canShowAnalysisTab) {
        setInspectorTab("analysis");
      }
    }

    if (inspectorTab === "analysis" && !canShowAnalysisTab) {
      if (canShowDetailTab) {
        setInspectorTab("detail");
      } else if (canShowEditTab) {
        setInspectorTab("edit");
      }
    }
  }, [canShowAnalysisTab, canShowDetailTab, canShowEditTab, inspectorTab]);

  if (isLoading) {
    return (
      <section className="workspace-grid">
        <aside className="panel stack-panel map-skeleton-panel">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-text" />
          <div className="skeleton-card-grid">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
          <div className="skeleton-line skeleton-block" />
          <div className="skeleton-line skeleton-block" />
        </aside>
        <div className="map-stage map-skeleton-stage">
          <div className="map-stage-banner">
            <div>
              <strong>Map Core</strong>
              <span>地图与对象图层加载中</span>
            </div>
          </div>
          <div className="map-canvas-loading">
            <div className="detail-empty dashboard-empty">
              <strong>正在加载地图工作台</strong>
              <span className="muted-inline">正在读取对象图层、统计摘要和工作台状态。</span>
            </div>
          </div>
        </div>
        <aside className="panel stack-panel map-skeleton-panel">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-text" />
          <div className="skeleton-line skeleton-block" />
          <div className="skeleton-line skeleton-block" />
          <div className="skeleton-line skeleton-block" />
        </aside>
      </section>
    );
  }

  return (
    <section className="workspace-grid">
      <aside className="panel stack-panel inspector-panel left-inspector-panel">
        <div className="inspector-header">
          <div className="inspector-header-copy">
            <span className="inspector-kicker">Workbench</span>
            <h2>地图工作台</h2>
            <p>左侧统一成原生分段和分组卡片，收口总览、检索和图层控制。</p>
          </div>
          <div className="segmented-control inspector-segmented" aria-label="左侧面板模式">
            <button
              type="button"
              className={`segmented-option ${leftPanelTab === "overview" ? "active" : ""}`}
              onClick={() => setLeftPanelTab("overview")}
            >
              总览
            </button>
            <button
              type="button"
              className={`segmented-option ${leftPanelTab === "search" ? "active" : ""}`}
              onClick={() => setLeftPanelTab("search")}
            >
              检索
            </button>
            <button
              type="button"
              className={`segmented-option ${leftPanelTab === "layers" ? "active" : ""}`}
              onClick={() => setLeftPanelTab("layers")}
            >
              图层
            </button>
          </div>
        </div>

        {leftPanelTab === "overview" ? (
          <>
            <InspectorHero badge="Overview" title="工作台总览" subtitle="快速切换视角、查看当前状态和视口摘要。" />
            <PanelSection title="快速聚焦" icon={<InspectorIcon name="overview" />} description="按工作目标快速切换到预设视角。">
              <div className="quick-actions-grid">
                <button type="button" className="tool-button" onClick={() => applyLayerPreset("all")}>
                  全部图层
                </button>
                <button type="button" className="tool-button" onClick={() => applyLayerPreset("assets")}>
                  资产视角
                </button>
                <button type="button" className="tool-button" onClick={() => applyLayerPreset("analysis")}>
                  分析视角
                </button>
                <button type="button" className="tool-button" onClick={() => applyLayerPreset("monitoring")}>
                  监测视角
                </button>
              </div>
              <div className="form-actions import-template-actions native-form-actions">
                <button type="button" className="tool-button" onClick={resetWorkbenchView}>
                  重置工作台
                </button>
                <span className="muted-inline">恢复图层、筛选与导入聚焦。</span>
              </div>
            </PanelSection>

            <PanelSection title="当前状态" icon={<InspectorIcon name="status" />} description="当前工作台、工具和对象选择状态。">
              <ul className="property-list compact-properties inspector-property-list">
                <li>
                  <span>激活图层</span>
                  <strong>{activeLayerCount} / 8</strong>
                </li>
                <li>
                  <span>当前筛选</span>
                  <strong>{riskFilter === "all" ? "全部风险" : riskLevelLabels[riskFilter]}</strong>
                </li>
                <li>
                  <span>导入核查</span>
                  <strong>{showImportedOnly ? "仅看本批次" : showAnalysisOnly ? "分析回图中" : pulseIds.length > 0 ? "高亮中" : "未启用"}</strong>
                </li>
                <li>
                  <span>当前操作</span>
                  <strong>
                    {editMode === "idle"
                      ? "浏览"
                      : editMode === "create-manhole"
                        ? "新建检查井"
                        : editMode === "create-pipe"
                          ? "新建管道"
                          : editMode === "create-plot"
                            ? "绘制地块"
                            : editMode === "reshape-plot"
                              ? "重绘地块"
                            : editMode === "move-manhole"
                              ? "调整检查井位置"
                              : "调整管道走向"}
                  </strong>
                </li>
                <li>
                  <span>选中对象</span>
                  <strong>
                    {selectedFeature ? `${selectedFeature.code} · ${objectTypeLabels[selectedFeature.object_type] ?? selectedFeature.object_type}` : "未选中"}
                  </strong>
                </li>
                <li>
                  <span>框选结果</span>
                  <strong>{boxSelectionIds.length > 0 ? `${boxSelectionIds.length} 个对象` : "未框选"}</strong>
                </li>
                <li>
                  <span>测距结果</span>
                  <strong>{measureDraft.length > 1 ? `${measureLengthMeters.toFixed(1)} m` : "未测距"}</strong>
                </li>
              </ul>
            </PanelSection>

            <PanelSection title="视野摘要" icon={<InspectorIcon name="geo" />} description="当前视口内对象和管网长度的局部统计。">
              <div className="info-grid">
                <article className="info-grid-item">
                  <span>检查井</span>
                  <strong>{viewportStats.manhole_count}</strong>
                </article>
                <article className="info-grid-item">
                  <span>管道</span>
                  <strong>{viewportStats.pipe_count}</strong>
                </article>
                <article className="info-grid-item">
                  <span>总长度</span>
                  <strong>{viewportStats.pipe_length_m} m</strong>
                </article>
                <article className="info-grid-item">
                  <span>监测点</span>
                  <strong>{viewportStats.monitoring_point_count}</strong>
                </article>
                <article className="info-grid-item">
                  <span>视口内对象</span>
                  <strong>{viewportStats.total}</strong>
                </article>
              </div>
            </PanelSection>

            <PanelSection title="风险摘要" icon={<InspectorIcon name="risk" />} description="当前可见对象的风险分布。">
              <div className="summary-grid">
                <article className="summary-card">
                  <span>可见对象</span>
                  <strong>{riskSummary.total}</strong>
                </article>
                <article className="summary-card summary-high">
                  <span>高风险</span>
                  <strong>{riskSummary.high}</strong>
                </article>
                <article className="summary-card summary-medium">
                  <span>中风险</span>
                  <strong>{riskSummary.medium}</strong>
                </article>
                <article className="summary-card summary-low">
                  <span>低风险</span>
                  <strong>{riskSummary.low}</strong>
                </article>
              </div>
            </PanelSection>
          </>
        ) : leftPanelTab === "search" ? (
          <>
            <InspectorHero badge="Search" title="检索与筛选" subtitle="快速搜索对象、切换风险筛选，并从结果中直接定位。" />
            <PanelSection title="关键词检索" icon={<InspectorIcon name="code" />} description="按编号、名称或对象类型进行快速定位。">
              <FieldGroup label="搜索关键词" icon={<InspectorIcon name="field" />}>
                <input
                  className="text-input"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="搜索编号、名称、对象类型"
                />
              </FieldGroup>
              <FieldGroup label="风险筛选" icon={<InspectorIcon name="risk" />}>
                <div className="pill-row">
                  {(["all", "high", "medium", "low"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`pill-button ${riskFilter === level ? "active" : ""}`}
                      onClick={() => setRiskFilter(level)}
                    >
                      {level === "all" ? "全部" : riskLevelLabels[level]}
                    </button>
                  ))}
                </div>
              </FieldGroup>
            </PanelSection>
            <PanelSection title="搜索结果" icon={<InspectorIcon name="link" />} description="点击结果项会直接切换地图选中对象。">
              <ul className="search-results">
                {searchResults.map((item) => (
                  <li key={item.object_id}>
                    <button
                      type="button"
                      className="search-result-button"
                      onClick={() => setSelectedFeature(featureIndex[item.object_id] ?? null)}
                    >
                      <strong>{item.title}</strong>
                      <span>
                        {item.subtitle} · {riskLevelLabels[item.risk_level]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </PanelSection>
          </>
        ) : (
          <>
            <InspectorHero badge="Layers" title="图层与专题" subtitle="管理对象图层可见性，并配合风险专题做局部聚焦。" />
            <PanelSection title="图层控制" icon={<InspectorIcon name="shape" />} description="勾选控制各类对象图层的地图展示。">
              <ul className="layer-list">
                {counts.map((layer) => (
                  <li key={layer.key}>
                    <label className="layer-toggle">
                      <input
                        type="checkbox"
                        checked={activeLayers[layer.key]}
                        onChange={() => toggleLayer(layer.key)}
                      />
                      <span className="layer-toggle-switch" aria-hidden="true">
                        <span className="layer-toggle-thumb" />
                      </span>
                      <span className="layer-toggle-meta">
                        <span className="layer-toggle-title">{layer.label}</span>
                        <span className="layer-toggle-caption">
                          {activeLayers[layer.key] ? "已显示" : "已隐藏"} · {layer.count} 个对象
                        </span>
                      </span>
                      <strong>{layer.count}</strong>
                    </label>
                  </li>
                ))}
              </ul>
            </PanelSection>
            <PanelSection title="风险摘要" icon={<InspectorIcon name="risk" />} description="图层控制后，专题分布会同步收敛。">
              <div className="summary-grid">
                <article className="summary-card">
                  <span>可见对象</span>
                  <strong>{riskSummary.total}</strong>
                </article>
                <article className="summary-card summary-high">
                  <span>高风险</span>
                  <strong>{riskSummary.high}</strong>
                </article>
                <article className="summary-card summary-medium">
                  <span>中风险</span>
                  <strong>{riskSummary.medium}</strong>
                </article>
                <article className="summary-card summary-low">
                  <span>低风险</span>
                  <strong>{riskSummary.low}</strong>
                </article>
              </div>
            </PanelSection>
          </>
        )}
      </aside>
      <div className="map-stage">
        <OverlayBanner
          badge="Map Core"
          title="地图主舞台"
          description={
            isLoading
              ? "图层加载中"
              : `${basemapMode === "vector" ? "高德普通" : basemapMode === "satellite" ? "高德卫星" : "高德仅影像"} · ${riskFilter === "all" ? "全部风险" : riskLevelLabels[riskFilter]} · 图层已就绪`
          }
          actions={
            <>
              <div className="segmented-control map-basemap-toggle" aria-label="底图模式">
                <button
                  type="button"
                  className={`segmented-option ${basemapMode === "vector" ? "active" : ""}`}
                  onClick={() => setBasemapMode("vector")}
                >
                  普通
                </button>
                <button
                  type="button"
                  className={`segmented-option ${basemapMode === "satellite" ? "active" : ""}`}
                  onClick={() => setBasemapMode("satellite")}
                >
                  卫星
                </button>
                <button
                  type="button"
                  className={`segmented-option ${basemapMode === "imagery" ? "active" : ""}`}
                  onClick={() => setBasemapMode("imagery")}
                >
                  仅影像
                </button>
              </div>
              <button type="button" className="tool-button" onClick={() => setLocateRequestKey((current) => current + 1)}>
                定位到我
              </button>
              <button type="button" className="tool-button" onClick={() => setFitAllRequestKey((current) => current + 1)}>
                回到全图
              </button>
              <button
                type="button"
                className="tool-button"
                onClick={() => setClearViewMemoryRequestKey((current) => current + 1)}
              >
                清除位置记忆
              </button>
              {error ? <span className="error-text">{error}</span> : null}
            </>
          }
        />
        {locateFeedback ? (
          <OverlayBanner
            badge={locateFeedback.isError ? "Locate" : "Location"}
            title={locateFeedback.isError ? "定位失败" : "定位成功"}
            description={locateFeedback.message}
            tone={locateFeedback.isError ? "analysis" : "success"}
          />
        ) : null}
        {showImportedOnly && pulseIds.length > 0 ? (
          <OverlayBanner
            badge="Import"
            title="本批次导入对象"
            description={`当前高亮 ${pulseIds.length} 个对象，可切换为仅查看这批对象。`}
            actions={
              <div className="draft-actions">
                <button
                  type="button"
                  className={`tool-button ${showImportedOnly ? "active" : ""}`}
                  onClick={() => setShowImportedOnly((current: boolean) => !current)}
                >
                  {showImportedOnly ? "显示全部对象" : "仅看本批次"}
                </button>
                <button type="button" className="tool-button" onClick={clearImportedFocus}>
                  清除本批次高亮
                </button>
              </div>
            }
          />
        ) : null}
        {showAnalysisOnly && analysisFocusIds.length > 0 ? (
          <OverlayBanner
            badge="Analysis"
            title="分析结果回图"
            description={`当前回图 ${analysisFocusIds.length} 个分析对象，地图已按分析风险等级着色。`}
            tone="analysis"
            actions={
              <div className="draft-actions">
                <button
                  type="button"
                  className={`tool-button ${showAnalysisOnly ? "active" : ""}`}
                  onClick={() => setShowAnalysisOnly((current: boolean) => !current)}
                >
                  {showAnalysisOnly ? "显示全部对象" : "仅看分析结果"}
                </button>
                <button type="button" className="tool-button" onClick={clearAnalysisFocus}>
                  清除分析高亮
                </button>
              </div>
            }
          />
        ) : null}
        {showAnalysisOnly ? (
          <div className="analysis-legend map-overlay-card">
            <div className="map-overlay-main">
              <span className="map-overlay-badge">Legend</span>
              <div className="map-overlay-copy">
                <strong>分析图例</strong>
                <span>当前专题按风险等级着色显示。</span>
              </div>
            </div>
            <div className="legend-row-group">
              <div className="legend-row">
                <span className="legend-chip legend-high" />
                <span>高风险</span>
              </div>
              <div className="legend-row">
                <span className="legend-chip legend-medium" />
                <span>中风险</span>
              </div>
              <div className="legend-row">
                <span className="legend-chip legend-low" />
                <span>低风险</span>
              </div>
            </div>
          </div>
        ) : null}
        {editSuccess ? (
          <OverlayBanner
            badge="Saved"
            title="保存成功"
            description={editSuccess}
            tone="success"
          />
        ) : null}
        <div className="floating-tools toolbar-dock">
          <div className="toolbar-group">
            <button
              type="button"
              className={`tool-button ${toolMode === "box-select" ? "active" : ""}`}
              onClick={toolMode === "box-select" ? stopToolMode : startBoxSelect}
              disabled={editMode !== "idle"}
            >
              <ToolbarIcon name="box" />
              {toolMode === "box-select" ? "退出框选" : "框选"}
            </button>
            <button
              type="button"
              className={`tool-button ${toolMode === "measure" ? "active" : ""}`}
              onClick={toolMode === "measure" ? stopToolMode : startMeasure}
              disabled={editMode !== "idle"}
            >
              <ToolbarIcon name="measure" />
              {toolMode === "measure" ? "退出测距" : "测距"}
            </button>
          </div>
          <span className="toolbar-divider" aria-hidden="true" />
          <div className="toolbar-group">
            <button type="button" className={`tool-button ${editMode === "create-manhole" ? "active" : ""}`} onClick={startCreateManhole}>
              <ToolbarIcon name="manhole" />
              新建检查井
            </button>
            <button type="button" className={`tool-button ${editMode === "create-pipe" ? "active" : ""}`} onClick={startCreatePipe}>
              <ToolbarIcon name="pipe" />
              新建管道
            </button>
            <button type="button" className={`tool-button ${editMode === "create-plot" ? "active" : ""}`} onClick={startCreatePlot}>
              <ToolbarIcon name="plot" />
              绘制地块
            </button>
          </div>
        </div>
        {editMode !== "idle" || toolMode !== "browse" ? (
          <div className="draft-toolbar">
            <div className="draft-toolbar-copy">
              <span className="draft-toolbar-badge">Tool</span>
              <div className="draft-toolbar-text">
                <strong>
                  {editMode === "create-manhole"
                    ? "新建检查井中"
                    : editMode === "move-manhole"
                      ? "调整检查井位置中"
                      : editMode === "reshape-pipe"
                        ? "调整管道走向中"
                        : editMode === "create-pipe"
                          ? "新建管道中"
                          : editMode === "create-plot"
                            ? "绘制地块中"
                            : editMode === "reshape-plot"
                              ? "重绘地块中"
                            : toolMode === "box-select"
                              ? "框选中"
                              : "测距中"}
                </strong>
                <span>
                  {editMode === "create-manhole"
                    ? "点击地图选择井位"
                    : editMode === "move-manhole"
                      ? "点击地图选择新的检查井位置"
                      : editMode === "reshape-pipe"
                        ? `${pipeDraft.isComplete ? "已结束采点" : "采点中"} · 当前用于重绘的节点数 ${pipeDraft.coordinates.length}`
                        : editMode === "create-pipe"
                          ? `${pipeDraft.isComplete ? "已结束采点" : "采点中"} · 已采集 ${pipeDraft.coordinates.length} 个节点`
                          : editMode === "create-plot"
                            ? `已采集 ${plotDraft.coordinates.length} 个节点 · 双击或右键结束，Backspace 撤销`
                            : editMode === "reshape-plot"
                              ? `已采集 ${plotDraft.coordinates.length} 个节点用于重绘边界 · 双击或右键结束，Backspace 撤销`
                            : toolMode === "box-select"
                              ? boxSelectionStart
                                ? `已记录第一个角点${boxSelectionPreview ? "，移动鼠标预览范围后点击终点" : "，请移动并点击终点"}，ESC取消`
                                : "请点击第一个角点开始框选，ESC取消"
                              : `已采集 ${measureDraft.length} 个测点 · 当前长度 ${measureLengthMeters.toFixed(1)} m`}
                </span>
              </div>
            </div>
            {editMode === "create-pipe" || editMode === "reshape-pipe" ? (
              <div className="draft-actions">
                <button
                  type="button"
                  className={`tool-button ${pipeDraft.isComplete ? "" : "active"}`}
                  onClick={pipeDraft.isComplete ? resumePipeDraft : completePipeDraft}
                  disabled={pipeDraft.coordinates.length < 2}
                >
                  {pipeDraft.isComplete ? "继续采点" : "结束采点"}
                </button>
                <button type="button" className="tool-button" onClick={undoPipePoint} disabled={pipeDraft.coordinates.length === 0}>
                  撤销节点
                </button>
                <button type="button" className="tool-button" onClick={clearPipeDraft} disabled={pipeDraft.coordinates.length === 0}>
                  清空草稿
                </button>
              </div>
            ) : null}
            {editMode === "create-plot" || editMode === "reshape-plot" ? (
              <div className="draft-actions">
                <button type="button" className="tool-button" onClick={undoPlotPoint} disabled={plotDraft.coordinates.length === 0}>
                  撤销节点
                </button>
                <button type="button" className="tool-button" onClick={clearPlotDraft} disabled={plotDraft.coordinates.length === 0}>
                  清空草稿
                </button>
                <button type="button" className="tool-button active" onClick={finishPlotDrawing} disabled={plotDraft.coordinates.length < 3}>
                  结束绘制
                </button>
              </div>
            ) : null}
            {toolMode === "box-select" ? (
              <div className="draft-actions">
                <button type="button" className="tool-button" onClick={stopToolMode}>
                  取消框选
                </button>
              </div>
            ) : null}
            {toolMode === "measure" ? (
              <div className="draft-actions">
                <button type="button" className="tool-button" onClick={clearMeasure} disabled={measureDraft.length === 0}>
                  清空测距
                </button>
                <button type="button" className="tool-button active" onClick={finishMeasure} disabled={measureDraft.length < 2}>
                  结束测距
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <Suspense
          fallback={
            <div className="map-canvas map-canvas-loading">
              <div className="detail-empty dashboard-empty">
                <strong>地图加载中</strong>
                <span className="muted-inline">正在按需加载地图引擎、编辑器和交互模块。</span>
              </div>
            </div>
          }
        >
          <MapCanvas
            activeLayers={activeLayers}
            basemapMode={basemapMode}
            analysisRiskById={analysisRiskById}
            boxSelectionPreview={boxSelectionPreview}
            boxSelectionStart={boxSelectionStart}
            editMode={editMode}
            featuresByLayer={featuresByLayer}
            manholeDraft={manholeDraft}
            measureDraft={measureDraft}
            onMapCoordinateClick={handleMapCoordinateClick}
            onMapDoubleClick={finishPlotDrawing}
            onLocateResult={(message, isError) => setLocateFeedback({ message, isError: Boolean(isError) })}
            onViewMemoryResult={(message) => setLocateFeedback({ message, isError: false })}
            onMapPointerMove={updateBoxSelectionPreview}
            locateRequestKey={locateRequestKey}
            fitAllRequestKey={fitAllRequestKey}
            clearViewMemoryRequestKey={clearViewMemoryRequestKey}
            onViewportChange={setViewportBounds}
            pulseIds={pulseIds}
            selectedId={selectedFeature?.id ?? null}
            onSelect={setSelectedFeature}
            pipeDraft={pipeDraft}
            plotDraft={plotDraft}
            toolMode={toolMode}
          />
        </Suspense>
      </div>
      <aside className="panel stack-panel inspector-panel">
        <div className="inspector-header">
          <div className="inspector-header-copy">
            <span className="inspector-kicker">Inspector</span>
            <h3>原生详情面板</h3>
            <p>右侧固定为详情、编辑、分析三段切换，不再随上下文自动跳转。</p>
          </div>
          <div className="segmented-control inspector-segmented" aria-label="面板模式">
            <button
              type="button"
              className={`segmented-option ${inspectorTab === "detail" ? "active" : ""}`}
              onClick={() => setInspectorTab("detail")}
              disabled={!canShowDetailTab}
            >
              详情
            </button>
            <button
              type="button"
              className={`segmented-option ${inspectorTab === "edit" ? "active" : ""}`}
              onClick={() => setInspectorTab("edit")}
              disabled={!canShowEditTab}
            >
              编辑
            </button>
            <button
              type="button"
              className={`segmented-option ${inspectorTab === "analysis" ? "active" : ""}`}
              onClick={() => setInspectorTab("analysis")}
              disabled={!canShowAnalysisTab}
            >
              分析
            </button>
          </div>
        </div>
        {inspectorTab === "detail" ? (
          selectedFeature ? (
            <>
            <InspectorHero
              badge={riskLevelLabels[selectedFeature.risk_level]}
              title={selectedFeature.name}
              subtitle={`${selectedFeature.code} · ${objectTypeLabels[selectedFeature.object_type] ?? selectedFeature.object_type} · ${selectedFeature.status}`}
            />
            {selectedFeature.object_type === "manhole" || selectedFeature.object_type === "pipe" || selectedFeature.object_type === "plot" ? (
              <EditSelectedFeaturePanel
                key={selectedFeature.id}
                feature={selectedFeature}
                error={editError}
                isSaving={isSaving}
                onDelete={removeSelectedFeature}
                onMove={selectedFeature.object_type === "manhole" ? startMoveSelectedManhole : undefined}
                onReshape={selectedFeature.object_type === "plot" ? startReshapeSelectedPlot : selectedFeature.object_type === "pipe" ? startReshapeSelectedPipe : undefined}
                onSubmit={saveSelectedFeature}
              />
            ) : null}
            <PanelSection title="基础属性" icon={<InspectorIcon name="field" />} description="当前对象的主要业务字段和展示属性。">
              <ul className="property-list inspector-property-list">
                {detailFields.map((field) => (
                  <li key={field.key}>
                    <span>{field.label}</span>
                    <strong>{field.value}</strong>
                  </li>
                ))}
              </ul>
            </PanelSection>
            <PanelSection title="空间与分析" icon={<InspectorIcon name="geo" />} description="坐标、专题和对象联动会在这里收口。">
              <div className="info-grid">
                {metaFields.map((field) => (
                  <article key={field.label} className="info-grid-item">
                    <span>{field.label}</span>
                    <strong>{field.value}</strong>
                  </article>
                ))}
              </div>
              <p className="native-note">当前对象已接入地图高亮、自动定位和分析回图，后续可继续挂任务和报告。</p>
            </PanelSection>
            {relatedFeatures.length > 0 ? (
              <PanelSection title="关联对象" icon={<InspectorIcon name="link" />} description="地块和检查井之间的空间关联已可联动高亮。">
                <p className="native-note">
                  {selectedFeature.object_type === "plot"
                    ? `当前地块命中 ${relatedFeatures.length} 个检查井，已在地图中联动高亮。`
                    : `当前检查井关联 ${relatedFeatures.length} 个地块，已在地图中联动高亮。`}
                </p>
                <ul className="search-results batch-result-list">
                  {relatedFeatures.map((feature) => (
                    <li key={feature.id}>
                      <button type="button" className="search-result-button" onClick={() => setSelectedFeature(feature)}>
                        <strong>{feature.code}</strong>
                        <span>
                          {feature.name} · {objectTypeLabels[feature.object_type] ?? feature.object_type} ·{" "}
                          {riskLevelLabels[feature.risk_level]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </PanelSection>
            ) : null}
            {selectedFeature.object_type === "plot" ? (
              <PanelSection title="分析入口" icon={<InspectorIcon name="analysis" />} description="直接把当前地块送入低浓度外水分析流程。">
                <div className="form-actions import-template-actions native-form-actions">
                  <button
                    type="button"
                    className="tool-button active"
                    onClick={() => navigate(`/analysis?plots=${selectedFeature.id}`)}
              >
                分析当前地块
              </button>
            </div>
          </PanelSection>
            ) : null}
          </>
          ) : (
            <section className="detail-empty inspector-empty">
              <p>点击地图对象后，在这里查看对象摘要、属性信息和空间联动结果。</p>
            </section>
          )
        ) : inspectorTab === "edit" ? (
          editMode === "create-manhole" ? (
            <CreateManholePanel
              error={editError}
              isSaving={isSaving}
              coordinates={manholeDraft.coordinates}
              onCancel={cancelEditing}
              onSubmit={submitManhole}
            />
          ) : editMode === "move-manhole" && selectedFeature?.object_type === "manhole" ? (
            <MoveManholePanel
              coordinates={manholeDraft.coordinates}
              error={editError}
              feature={selectedFeature}
              isSaving={isSaving}
              onCancel={cancelEditing}
              onSubmit={submitManholeMove}
            />
          ) : editMode === "reshape-pipe" && selectedFeature?.object_type === "pipe" ? (
            <ReshapePipePanel
              coordinates={pipeDraft.coordinates}
              endpointSuggestions={pipeEndpointSuggestions}
              error={editError}
              feature={selectedFeature}
              isSaving={isSaving}
              onCancel={cancelEditing}
              onSubmit={submitPipeReshape}
            />
          ) : editMode === "create-pipe" ? (
            <CreatePipePanel
              key={`${pipeDraft.coordinates.length}-${pipeEndpointSuggestions.startId}-${pipeEndpointSuggestions.endId}`}
              error={editError}
              isSaving={isSaving}
              coordinates={pipeDraft.coordinates}
              endpointSuggestions={pipeEndpointSuggestions}
              onCancel={cancelEditing}
              onSubmit={submitPipe}
            />
          ) : editMode === "reshape-plot" && selectedFeature?.object_type === "plot" ? (
            <ReshapePlotPanel
              coordinates={plotDraft.coordinates}
              error={editError}
              feature={selectedFeature}
              isSaving={isSaving}
              onCancel={cancelEditing}
              onSubmit={submitPlotReshape}
            />
          ) : editMode === "create-plot" ? (
            <CreatePlotPanel
              coordinates={plotDraft.coordinates}
              error={editError}
              isSaving={isSaving}
              onCancel={cancelEditing}
              onSubmit={submitPlot}
            />
          ) : selectedFeature &&
            (selectedFeature.object_type === "manhole" ||
              selectedFeature.object_type === "pipe" ||
              selectedFeature.object_type === "plot") ? (
            <>
              <InspectorHero
                badge="Edit"
                title={`编辑 ${selectedFeature.name}`}
                subtitle={`${selectedFeature.code} · ${objectTypeLabels[selectedFeature.object_type] ?? selectedFeature.object_type}`}
              />
              <EditSelectedFeaturePanel
                key={selectedFeature.id}
                feature={selectedFeature}
                error={editError}
                isSaving={isSaving}
                onDelete={removeSelectedFeature}
                onMove={selectedFeature.object_type === "manhole" ? startMoveSelectedManhole : undefined}
                onReshape={selectedFeature.object_type === "plot" ? startReshapeSelectedPlot : selectedFeature.object_type === "pipe" ? startReshapeSelectedPipe : undefined}
                onSubmit={saveSelectedFeature}
              />
            </>
          ) : (
            <section className="detail-empty inspector-empty">
              <p>选择检查井、管道或地块后，在这里进入编辑、重绘和删除操作。</p>
            </section>
          )
        ) : (
          boxSelectedFeatures.length > 0 ? (
            <BatchSelectionPanel
              features={boxSelectedFeatures}
              summary={boxSelectionSummary}
              onClear={stopToolMode}
              onAnalyzePlots={(plotIds) => navigate(`/analysis?plots=${plotIds.join(",")}`)}
              onSelectFeature={(feature) => {
                stopToolMode();
                setSelectedFeature(feature);
              }}
            />
          ) : selectedFeature?.object_type === "plot" ? (
            <>
              <InspectorHero
                badge="Analysis"
                title={`分析 ${selectedFeature.name}`}
                subtitle={`${selectedFeature.code} · ${riskLevelLabels[selectedFeature.risk_level]} · 低浓度外水分析入口`}
              />
              <PanelSection title="分析入口" icon={<InspectorIcon name="analysis" />} description="当前已选地块可直接送入分析中心。">
                <div className="form-actions import-template-actions native-form-actions">
                  <button
                    type="button"
                    className="tool-button active"
                    onClick={() => navigate(`/analysis?plots=${selectedFeature.id}`)}
                  >
                    分析当前地块
                  </button>
                </div>
              </PanelSection>
              <PanelSection title="空间与分析" icon={<InspectorIcon name="geo" />} description="查看当前地块的空间信息和分析上下文。">
                <div className="info-grid">
                  {metaFields.map((field) => (
                    <article key={field.label} className="info-grid-item">
                      <span>{field.label}</span>
                      <strong>{field.value}</strong>
                    </article>
                  ))}
                </div>
              </PanelSection>
            </>
          ) : (
            <section className="detail-empty inspector-empty">
              <p>选中地块或使用框选后，在这里发起分析并查看批量分析入口。</p>
            </section>
          )
        )}
      </aside>
    </section>
  );
}

function BatchSelectionPanel({
  features,
  summary,
  onClear,
  onAnalyzePlots,
  onSelectFeature,
}: {
  features: MapFeature[];
  summary: Record<string, number>;
  onClear: () => void;
  onAnalyzePlots: (plotIds: string[]) => void;
  onSelectFeature: (feature: MapFeature | null) => void;
}) {
  const plotIds = features.filter((feature) => feature.object_type === "plot").map((feature) => feature.id);
  return (
    <>
      <InspectorHero badge="Batch" title="框选结果" subtitle={`当前命中 ${features.length} 个对象，可继续查看详情或发起分析。`} />
      <PanelSection title="汇总概览" icon={<InspectorIcon name="overview" />} description="按对象类型整理当前框选结果。">
        <div className="summary-grid">
          {Object.entries(summary).map(([objectType, count]) => (
            <article key={objectType} className="summary-card">
              <span>{objectTypeLabels[objectType] ?? objectType}</span>
              <strong>{count}</strong>
            </article>
          ))}
        </div>
        <div className="form-actions import-template-actions native-form-actions">
          <button type="button" className="tool-button" onClick={onClear}>
            清除框选
          </button>
          {plotIds.length > 0 ? (
            <button type="button" className="tool-button active" onClick={() => onAnalyzePlots(plotIds)}>
              分析框选地块
            </button>
          ) : null}
          <span className="muted-inline">下一步可在这里继续接批量删除、批量分析和批量任务。</span>
        </div>
      </PanelSection>
      <PanelSection title="对象列表" icon={<InspectorIcon name="link" />} description="点击列表项会切换到单对象详情。">
        <ul className="search-results batch-result-list">
          {features.map((feature) => (
            <li key={feature.id}>
              <button type="button" className="search-result-button" onClick={() => onSelectFeature(feature)}>
                <strong>{feature.code}</strong>
                <span>
                  {feature.name} · {objectTypeLabels[feature.object_type] ?? feature.object_type} ·{" "}
                  {riskLevelLabels[feature.risk_level as keyof typeof riskLevelLabels] ?? feature.risk_level}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PanelSection>
    </>
  );
}

function EditSelectedFeaturePanel({
  feature,
  error,
  isSaving,
  onDelete,
  onMove,
  onReshape,
  onSubmit,
}: {
  feature: {
    id: string;
    code: string;
    name: string;
    object_type: string;
    risk_level: string;
    properties: Record<string, string | number | boolean | null>;
  };
  error: string | null;
  isSaving: boolean;
  onDelete: () => Promise<void>;
  onMove?: () => void;
  onReshape?: () => void;
  onSubmit: (payload: Record<string, FormDataEntryValue>) => Promise<void>;
}) {
  return (
    <PanelSection title="编辑对象" icon={<InspectorIcon name="form" />} description="按业务分组维护对象基础信息和几何动作。">
      {error ? <p className="error-text native-note">{error}</p> : null}
      <form
        className="form-stack inspector-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(Object.fromEntries(new FormData(event.currentTarget).entries()));
        }}
      >
        <div className="field-cluster">
          <FieldGroup label="对象编号" icon={<InspectorIcon name="code" />}>
            <input className="text-input" name="code" defaultValue={feature.code} />
          </FieldGroup>
          <FieldGroup label="对象名称" icon={<InspectorIcon name="object" />}>
            <input className="text-input" name="name" defaultValue={feature.name} />
          </FieldGroup>
        </div>
        <PanelSection title="风险与状态" icon={<InspectorIcon name="risk" />} description="采用分段控件切换风险等级。">
          <FieldGroup label="风险等级" icon={<InspectorIcon name="risk" />}>
            <SegmentedField
              name="risk_level"
              value={feature.risk_level}
              options={[
                { value: "low", label: "低风险" },
                { value: "medium", label: "中风险" },
                { value: "high", label: "高风险" },
              ]}
            />
          </FieldGroup>
        </PanelSection>
        {feature.object_type === "manhole" ? (
          <PanelSection title="检查井属性" icon={<InspectorIcon name="geo" />} description="维护井类型、所属片区和井深。">
            <div className="field-cluster">
              <FieldGroup label="井类型" icon={<InspectorIcon name="field" />}>
                <input className="text-input" name="manhole_type" defaultValue={String(feature.properties.manhole_type ?? "")} />
              </FieldGroup>
              <FieldGroup label="所属片区" icon={<InspectorIcon name="link" />}>
                <input className="text-input" name="catchment_name" defaultValue={String(feature.properties.catchment_name ?? "")} />
              </FieldGroup>
              <FieldGroup label="井深 (m)" icon={<InspectorIcon name="geo" />}>
                <input className="text-input" name="depth_m" type="number" step="0.1" defaultValue={String(feature.properties.depth_m ?? 0)} />
              </FieldGroup>
            </div>
          </PanelSection>
        ) : null}
        {feature.object_type === "pipe" ? (
          <PanelSection title="管道属性" icon={<InspectorIcon name="shape" />} description="维护类型、管径和首尾检查井关联。">
            <div className="field-cluster">
              <FieldGroup label="管道类型" icon={<InspectorIcon name="field" />}>
                <input className="text-input" name="pipe_type" defaultValue={String(feature.properties.pipe_type ?? "")} />
              </FieldGroup>
              <FieldGroup label="管径 (mm)" icon={<InspectorIcon name="shape" />}>
                <input className="text-input" name="diameter_mm" type="number" defaultValue={String(feature.properties.diameter_mm ?? 400)} />
              </FieldGroup>
              <FieldGroup label="起点井 ID" icon={<InspectorIcon name="link" />}>
                <input className="text-input" name="start_manhole_id" defaultValue={String(feature.properties.start_manhole_id ?? "")} />
              </FieldGroup>
              <FieldGroup label="终点井 ID" icon={<InspectorIcon name="link" />}>
                <input className="text-input" name="end_manhole_id" defaultValue={String(feature.properties.end_manhole_id ?? "")} />
              </FieldGroup>
            </div>
          </PanelSection>
        ) : null}
        {feature.object_type === "plot" ? (
          <PanelSection title="地块分析字段" icon={<InspectorIcon name="water" />} description="这些字段会直接进入低浓度外水分析。">
            <div className="field-cluster">
              <FieldGroup label="地块类型" icon={<InspectorIcon name="shape" />}>
                <input className="text-input" name="plot_type" defaultValue={String(feature.properties.plot_type ?? "")} />
              </FieldGroup>
              <FieldGroup label="日用水量" icon={<InspectorIcon name="water" />}>
                <input
                  className="text-input"
                  name="water_usage_m3d"
                  type="number"
                  step="0.1"
                  defaultValue={String(feature.properties.water_usage_m3d ?? 0)}
                />
              </FieldGroup>
              <FieldGroup label="COD 基线" icon={<InspectorIcon name="analysis" />}>
                <input
                  className="text-input"
                  name="cod_baseline"
                  type="number"
                  step="0.1"
                  defaultValue={String(feature.properties.cod_baseline ?? 400)}
                />
              </FieldGroup>
            </div>
          </PanelSection>
        ) : null}
        <div className="form-actions form-actions-between native-form-actions">
          <div className="inline-actions">
            {feature.object_type === "manhole" && onMove ? (
              <button type="button" className="tool-button" onClick={onMove} disabled={isSaving}>
                调整位置
              </button>
            ) : null}
            {feature.object_type === "pipe" && onReshape ? (
              <button type="button" className="tool-button" onClick={onReshape} disabled={isSaving}>
                调整走向
              </button>
            ) : null}
            {feature.object_type === "plot" && onReshape ? (
              <button type="button" className="tool-button" onClick={onReshape} disabled={isSaving}>
                重绘边界
              </button>
            ) : null}
            <button
              type="button"
              className="tool-button danger-button"
              onClick={() => {
                if (
                  window.confirm(
                    `确认删除${feature.object_type === "manhole" ? "检查井" : feature.object_type === "pipe" ? "管道" : "地块"} ${feature.code}？`,
                  )
                ) {
                  void onDelete();
                }
              }}
              disabled={isSaving}
            >
              删除
            </button>
          </div>
          <button type="submit" className="tool-button active" disabled={isSaving}>
            {isSaving ? "保存中" : "保存修改"}
          </button>
        </div>
      </form>
    </PanelSection>
  );
}

function MoveManholePanel({
  coordinates,
  error,
  feature,
  isSaving,
  onCancel,
  onSubmit,
}: {
  coordinates: [number, number] | null;
  error: string | null;
  feature: {
    code: string;
    name: string;
  };
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <PanelSection title="调整检查井位置" icon={<InspectorIcon name="geo" />} description={`当前对象：${feature.code} · ${feature.name}`}>
      <div className="info-grid">
        <article className="info-grid-item">
          <span>操作说明</span>
          <strong>请在地图上点击新的检查井位置后保存</strong>
        </article>
        <article className="info-grid-item">
          <span>新坐标</span>
          <strong>{coordinates ? `${coordinates[0]}, ${coordinates[1]}` : "未选点"}</strong>
        </article>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="form-actions native-form-actions">
        <button type="button" className="tool-button" onClick={onCancel}>
          取消
        </button>
        <button type="button" className="tool-button active" onClick={() => void onSubmit()} disabled={!coordinates || isSaving}>
          {isSaving ? "保存中" : "保存位置"}
        </button>
      </div>
    </PanelSection>
  );
}

function ReshapePipePanel({
  coordinates,
  endpointSuggestions,
  error,
  feature,
  isSaving,
  onCancel,
  onSubmit,
}: {
  coordinates: [number, number][];
  endpointSuggestions: {
    startId: string;
    endId: string;
    startLabel: string;
    endLabel: string;
  };
  error: string | null;
  feature: {
    code: string;
    name: string;
  };
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <PanelSection title="调整管道走向" icon={<InspectorIcon name="shape" />} description={`当前对象：${feature.code} · ${feature.name}`}>
      <div className="info-grid">
        <article className="info-grid-item">
          <span>编辑方式</span>
          <strong>可清空后重绘，或撤销尾部节点后继续采点</strong>
        </article>
        <article className="info-grid-item">
          <span>当前节点数</span>
          <strong>{coordinates.length}</strong>
        </article>
      </div>
      {endpointSuggestions.startId || endpointSuggestions.endId ? (
        <div className="hint-block">
          {endpointSuggestions.startId ? <p>起点井：{endpointSuggestions.startLabel}</p> : null}
          {endpointSuggestions.endId ? <p>终点井：{endpointSuggestions.endLabel}</p> : null}
        </div>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="form-actions native-form-actions">
        <button type="button" className="tool-button" onClick={onCancel}>
          取消
        </button>
        <button type="button" className="tool-button active" onClick={() => void onSubmit()} disabled={coordinates.length < 2 || isSaving}>
          {isSaving ? "保存中" : "保存走向"}
        </button>
      </div>
    </PanelSection>
  );
}

function ReshapePlotPanel({
  coordinates,
  error,
  feature,
  isSaving,
  onCancel,
  onSubmit,
}: {
  coordinates: [number, number][];
  error: string | null;
  feature: {
    code: string;
    name: string;
  };
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <PanelSection title="重绘地块边界" icon={<InspectorIcon name="shape" />} description={`当前对象：${feature.code} · ${feature.name}`}>
      <div className="info-grid">
        <article className="info-grid-item">
          <span>操作方式</span>
          <strong>单击加点，双击或右键结束，Backspace 撤销</strong>
        </article>
        <article className="info-grid-item">
          <span>当前节点数</span>
          <strong>{coordinates.length}</strong>
        </article>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="form-actions native-form-actions">
        <button type="button" className="tool-button" onClick={onCancel}>
          取消
        </button>
        <button type="button" className="tool-button active" onClick={() => void onSubmit()} disabled={coordinates.length < 3 || isSaving}>
          {isSaving ? "保存中" : "保存边界"}
        </button>
      </div>
    </PanelSection>
  );
}

function CreateManholePanel({
  coordinates,
  error,
  isSaving,
  onCancel,
  onSubmit,
}: {
  coordinates: [number, number] | null;
  error: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    code: string;
    name: string;
    risk_level: string;
    manhole_type: string;
    catchment_name: string;
    depth_m: number;
  }) => Promise<void>;
}) {
  const suggestedCode = `MH-${new Date().getTime().toString().slice(-6)}`;

  async function handleSubmit(formData: FormData) {
    await onSubmit({
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      risk_level: String(formData.get("risk_level") ?? "low"),
      manhole_type: String(formData.get("manhole_type") ?? "污水井"),
      catchment_name: String(formData.get("catchment_name") ?? ""),
      depth_m: Number(formData.get("depth_m") ?? 0),
    });
  }

  return (
    <>
      <InspectorHero badge="Create" title="新建检查井" subtitle="先在地图上点击一个点，再分组填写基础属性和分析字段。" />
      <PanelSection title="空间锚点" icon={<InspectorIcon name="geo" />} description="当前地图采点将作为检查井坐标。">
        <div className="info-grid">
          <article className="info-grid-item">
            <span>当前坐标</span>
            <strong>{coordinates ? `${coordinates[0]}, ${coordinates[1]}` : "未选点"}</strong>
          </article>
        </div>
      </PanelSection>
      {error ? <p className="error-text native-note">{error}</p> : null}
      <form
        className="form-stack inspector-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
      >
        <PanelSection title="基础信息" icon={<InspectorIcon name="form" />} description="定义编号、名称和所属业务类型。">
          <div className="field-cluster">
            <FieldGroup label="井编号" icon={<InspectorIcon name="code" />}>
              <input className="text-input" name="code" placeholder="井编号" defaultValue={suggestedCode} />
            </FieldGroup>
            <FieldGroup label="井名称" icon={<InspectorIcon name="object" />}>
              <input className="text-input" name="name" placeholder="井名称" defaultValue="新建检查井" />
            </FieldGroup>
            <FieldGroup label="井类型" icon={<InspectorIcon name="field" />}>
              <input className="text-input" name="manhole_type" placeholder="井类型" defaultValue="污水井" />
            </FieldGroup>
          </div>
        </PanelSection>
        <PanelSection title="片区与风险" icon={<InspectorIcon name="risk" />} description="片区和风险等级会直接影响地图专题和分析入口。">
          <div className="field-cluster">
            <FieldGroup label="所属片区" icon={<InspectorIcon name="link" />}>
              <input className="text-input" name="catchment_name" placeholder="所属片区" />
            </FieldGroup>
            <FieldGroup label="井深 (m)" icon={<InspectorIcon name="geo" />}>
              <input className="text-input" name="depth_m" type="number" step="0.1" placeholder="井深" defaultValue="3.0" />
            </FieldGroup>
            <FieldGroup label="风险等级" icon={<InspectorIcon name="risk" />}>
              <SegmentedField
                name="risk_level"
                value="low"
                options={[
                  { value: "low", label: "低风险" },
                  { value: "medium", label: "中风险" },
                  { value: "high", label: "高风险" },
                ]}
              />
            </FieldGroup>
          </div>
        </PanelSection>
        <div className="form-actions native-form-actions">
          <button type="button" className="tool-button" onClick={onCancel}>取消</button>
          <button type="submit" className="tool-button active" disabled={!coordinates || isSaving}>
            {isSaving ? "保存中" : "保存检查井"}
          </button>
        </div>
      </form>
    </>
  );
}

function CreatePipePanel({
  coordinates,
  endpointSuggestions,
  error,
  isSaving,
  onCancel,
  onSubmit,
}: {
  coordinates: [number, number][];
  endpointSuggestions: {
    startId: string;
    endId: string;
    startLabel: string;
    endLabel: string;
  };
  error: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    code: string;
    name: string;
    risk_level: string;
    pipe_type: string;
    diameter_mm: number;
    start_manhole_id: string;
    end_manhole_id: string;
  }) => Promise<void>;
}) {
  const suggestedCode = `P-${new Date().getTime().toString().slice(-6)}`;

  async function handleSubmit(formData: FormData) {
    await onSubmit({
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      risk_level: String(formData.get("risk_level") ?? "low"),
      pipe_type: String(formData.get("pipe_type") ?? "污水"),
      diameter_mm: Number(formData.get("diameter_mm") ?? 400),
      start_manhole_id: String(formData.get("start_manhole_id") ?? ""),
      end_manhole_id: String(formData.get("end_manhole_id") ?? ""),
    });
  }

  return (
    <>
      <InspectorHero badge="Create" title="新建管道" subtitle="按节点采集走向后，分组维护管道属性和首尾检查井关联。" />
      <PanelSection title="绘制状态" icon={<InspectorIcon name="shape" />} description="在地图上依次点击节点，至少需要两个点。">
        <div className="info-grid">
          <article className="info-grid-item">
            <span>当前节点数</span>
            <strong>{coordinates.length}</strong>
          </article>
        </div>
      </PanelSection>
      {endpointSuggestions.startId || endpointSuggestions.endId ? (
        <div className="hint-block">
          {endpointSuggestions.startId ? <p>起点已吸附：{endpointSuggestions.startLabel}</p> : null}
          {endpointSuggestions.endId ? <p>终点已吸附：{endpointSuggestions.endLabel}</p> : null}
        </div>
      ) : null}
      {error ? <p className="error-text native-note">{error}</p> : null}
      <form
        className="form-stack inspector-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
      >
        <PanelSection title="基础信息" icon={<InspectorIcon name="form" />} description="定义管道编号、名称和业务类型。">
          <div className="field-cluster">
            <FieldGroup label="管道编号" icon={<InspectorIcon name="code" />}>
              <input className="text-input" name="code" placeholder="管道编号" defaultValue={suggestedCode} />
            </FieldGroup>
            <FieldGroup label="管道名称" icon={<InspectorIcon name="object" />}>
              <input className="text-input" name="name" placeholder="管道名称" defaultValue="新建管道" />
            </FieldGroup>
            <FieldGroup label="管道类型" icon={<InspectorIcon name="field" />}>
              <input className="text-input" name="pipe_type" placeholder="管道类型" defaultValue="污水" />
            </FieldGroup>
          </div>
        </PanelSection>
        <PanelSection title="连接关系" icon={<InspectorIcon name="link" />} description="自动吸附后可微调首尾检查井编号。">
          <div className="field-cluster">
            <FieldGroup label="管径 (mm)" icon={<InspectorIcon name="shape" />}>
              <input className="text-input" name="diameter_mm" type="number" placeholder="管径(mm)" defaultValue="400" />
            </FieldGroup>
            <FieldGroup label="起点井 ID" icon={<InspectorIcon name="link" />}>
              <input className="text-input" name="start_manhole_id" placeholder="起点井ID" defaultValue={endpointSuggestions.startId} />
            </FieldGroup>
            <FieldGroup label="终点井 ID" icon={<InspectorIcon name="link" />}>
              <input className="text-input" name="end_manhole_id" placeholder="终点井ID" defaultValue={endpointSuggestions.endId} />
            </FieldGroup>
            <FieldGroup label="风险等级" icon={<InspectorIcon name="risk" />}>
              <SegmentedField
                name="risk_level"
                value="low"
                options={[
                  { value: "low", label: "低风险" },
                  { value: "medium", label: "中风险" },
                  { value: "high", label: "高风险" },
                ]}
              />
            </FieldGroup>
          </div>
        </PanelSection>
        <div className="form-actions native-form-actions">
          <button type="button" className="tool-button" onClick={onCancel}>取消</button>
          <button type="submit" className="tool-button active" disabled={coordinates.length < 2 || isSaving}>
            {isSaving ? "保存中" : "保存管道"}
          </button>
        </div>
      </form>
    </>
  );
}

function CreatePlotPanel({
  coordinates,
  error,
  isSaving,
  onCancel,
  onSubmit,
}: {
  coordinates: [number, number][];
  error: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    code: string;
    name: string;
    risk_level: string;
    plot_type: string;
    water_usage_m3d: number;
    cod_baseline: number;
  }) => Promise<void>;
}) {
  const suggestedCode = `PL-${new Date().getTime().toString().slice(-6)}`;

  async function handleSubmit(formData: FormData) {
    await onSubmit({
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      risk_level: String(formData.get("risk_level") ?? "low"),
      plot_type: String(formData.get("plot_type") ?? "小区"),
      water_usage_m3d: Number(formData.get("water_usage_m3d") ?? 0),
      cod_baseline: Number(formData.get("cod_baseline") ?? 400),
    });
  }

  return (
    <>
      <InspectorHero badge="Create" title="绘制地块" subtitle="参照旧系统交互进行面绘制，并按分析字段组织表单。" />
      <PanelSection title="绘制状态" icon={<InspectorIcon name="shape" />} description="单击加点，双击或右键结束，ESC 取消，Backspace 撤销。">
        <div className="info-grid">
          <article className="info-grid-item">
            <span>当前节点数</span>
            <strong>{coordinates.length}</strong>
          </article>
        </div>
      </PanelSection>
      {error ? <p className="error-text native-note">{error}</p> : null}
      <form
        className="form-stack inspector-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
      >
        <PanelSection title="基础信息" icon={<InspectorIcon name="form" />} description="定义地块编号、名称和用地类型。">
          <div className="field-cluster">
            <FieldGroup label="地块编号" icon={<InspectorIcon name="code" />}>
              <input className="text-input" name="code" placeholder="地块编号" defaultValue={suggestedCode} />
            </FieldGroup>
            <FieldGroup label="地块名称" icon={<InspectorIcon name="object" />}>
              <input className="text-input" name="name" placeholder="地块名称" defaultValue="新建地块" />
            </FieldGroup>
            <FieldGroup label="地块类型" icon={<InspectorIcon name="shape" />}>
              <input className="text-input" name="plot_type" placeholder="地块类型" defaultValue="小区" />
            </FieldGroup>
          </div>
        </PanelSection>
        <PanelSection title="分析字段" icon={<InspectorIcon name="analysis" />} description="这里的数值会直接进入外水风险分析。">
          <div className="field-cluster">
            <FieldGroup label="日用水量" icon={<InspectorIcon name="water" />}>
              <input className="text-input" name="water_usage_m3d" type="number" step="0.1" placeholder="日用水量" defaultValue="320" />
            </FieldGroup>
            <FieldGroup label="COD 基线" icon={<InspectorIcon name="analysis" />}>
              <input className="text-input" name="cod_baseline" type="number" step="0.1" placeholder="COD 基线" defaultValue="400" />
            </FieldGroup>
            <FieldGroup label="风险等级" icon={<InspectorIcon name="risk" />}>
              <SegmentedField
                name="risk_level"
                value="low"
                options={[
                  { value: "low", label: "低风险" },
                  { value: "medium", label: "中风险" },
                  { value: "high", label: "高风险" },
                ]}
              />
            </FieldGroup>
          </div>
        </PanelSection>
        <div className="form-actions native-form-actions">
          <button type="button" className="tool-button" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="tool-button active" disabled={coordinates.length < 3 || isSaving}>
            {isSaving ? "保存中" : "保存地块"}
          </button>
        </div>
      </form>
    </>
  );
}
