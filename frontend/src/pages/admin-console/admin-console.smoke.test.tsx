import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";

import type { MapObjectsResponse } from "../../shared/types/map";
import type { ImportBatch } from "../import-management/types";
import type { LowCodAnalysisResult, LowCodAnalysisRunSummary } from "../analysis-center/api";

const { fetchMapObjectsMock, apiGetMock, fetchLowCodAnalysisRunsMock, fetchLowCodAnalysisRunMock } = vi.hoisted(() => ({
  fetchMapObjectsMock: vi.fn(),
  apiGetMock: vi.fn(),
  fetchLowCodAnalysisRunsMock: vi.fn(),
  fetchLowCodAnalysisRunMock: vi.fn(),
}));

vi.mock("../../features/map-core/api", () => ({
  fetchMapObjects: fetchMapObjectsMock,
}));

vi.mock("../../shared/api/client", () => ({
  apiGet: apiGetMock,
}));

vi.mock("../analysis-center/api", () => ({
  fetchLowCodAnalysisRuns: fetchLowCodAnalysisRunsMock,
  fetchLowCodAnalysisRun: fetchLowCodAnalysisRunMock,
}));

import { AdminAssetsPage } from "./assets";
import { AdminImportBatchesPage } from "./import-batches";
import { AdminAnalysisRunsPage } from "./analysis-runs";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderWithRouter(initialEntry: string, element: ReactNode) {
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <>
            <LocationProbe />
            {element}
          </>
        ),
      },
    ],
    { initialEntries: [initialEntry] },
  );

  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("admin console smoke tests", () => {
  it("renders asset management with real-data mapping and persists filters to url", async () => {
    fetchMapObjectsMock.mockResolvedValue({
      data: {
        manholes: [
          {
            id: "mh-001",
            code: "MH-001",
            name: "东门主井",
            object_type: "manhole",
            risk_level: "low",
            status: "ready",
            properties: { catchment_name: "城东片区", owner: "巡检组", manhole_type: "雨水井" },
            geom: { type: "Point", coordinates: [120.1, 30.2] },
          },
        ],
        pipes: [],
        plots: [
          {
            id: "plot-001",
            code: "PL-001",
            name: "科技园 A 地块",
            object_type: "plot",
            risk_level: "high",
            status: "warning",
            properties: { catchment_name: "科技园片区", owner: "分析组", plot_type: "工业", water_usage_m3d: 320 },
            geom: { type: "Polygon", coordinates: [[[120.1, 30.2], [120.2, 30.2], [120.2, 30.3], [120.1, 30.2]]] },
          },
        ],
      },
      meta: {
        counts: {
          manholes: 1,
          pipes: 0,
          plots: 1,
        },
      },
    });

    renderWithRouter("/admin/assets", <AdminAssetsPage />);

    expect(await screen.findByText("MH-001")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "地块" }));

    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).toContain("type=plot");
      expect(screen.getByTestId("location-search").textContent).toContain("asset=plot-001");
    });

    expect(screen.getByText("发起分析")).toBeTruthy();
    expect(screen.getAllByText(/科技园片区/).length).toBeGreaterThan(0);
  });

  it("renders import batch management with error grouping and url state", async () => {
    const batches: ImportBatch[] = [
      {
        id: "batch-ok",
        batch_name: "正常批次",
        source_type: "excel",
        object_type: "manholes",
        import_status: "completed",
        file_name: "ok.xlsx",
        total_count: 5,
        success_count: 5,
        failed_count: 0,
        created_at: "2026-03-12T08:00:00+08:00",
        preview_rows: [{ code: "MH-001", name: "东门主井" }],
        columns: ["code", "name"],
        error_summary: [],
        imported_objects: [{ id: "mh-001", code: "MH-001", object_type: "manhole" }],
      },
      {
        id: "batch-error",
        batch_name: "异常批次",
        source_type: "geojson",
        object_type: "pipes",
        import_status: "completed_with_errors",
        file_name: "pipe.geojson",
        total_count: 3,
        success_count: 1,
        failed_count: 2,
        created_at: "2026-03-12T09:00:00+08:00",
        preview_rows: [{ code: "PI-001", diameter_mm: 400, start_manhole_id: "MH-001" }],
        columns: ["code", "diameter_mm", "start_manhole_id"],
        error_summary: ["重复编号 PI-002", "缺失检查井关系"],
        imported_objects: [],
      },
    ];

    apiGetMock.mockImplementation(async (path: string) => {
      if (path === "/import-batches") return { items: batches };
      throw new Error(`unexpected path: ${path}`);
    });

    renderWithRouter("/admin/import-batches", <AdminImportBatchesPage />);

    expect((await screen.findAllByText("正常批次")).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "仅看异常批次" }));

    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).toContain("errors=1");
    });

    expect(screen.queryByText("正常批次")).toBeNull();
    expect(screen.getAllByText("异常批次").length).toBeGreaterThan(0);
    expect(screen.getByText("重复编号 1")).toBeTruthy();
    expect(screen.getByText("字段缺失 1")).toBeTruthy();
    expect(screen.getAllByText(/diameter_mm/).length).toBeGreaterThan(0);
  });

  it("renders analysis management with detail snapshot and url state", async () => {
    const runs: LowCodAnalysisRunSummary[] = [
      {
        run_id: "run-1",
        analysis_type: "low_cod",
        status: "completed",
        created_at: "2026-03-12T10:00:00+08:00",
        summary: { total: 4, high_risk: 2, medium_risk: 1, low_risk: 1, average_observed_cod: 180 },
      },
      {
        run_id: "run-2",
        analysis_type: "low_cod",
        status: "completed",
        created_at: "2026-03-12T11:00:00+08:00",
        summary: { total: 2, high_risk: 0, medium_risk: 1, low_risk: 1, average_observed_cod: 260 },
      },
    ];

    const runDetail: LowCodAnalysisResult = {
      summary: { total: 4, high_risk: 2, medium_risk: 1, low_risk: 1, average_observed_cod: 180 },
      items: [
        {
          plot_id: "plot-001",
          plot_code: "PL-001",
          plot_name: "科技园 A 地块",
          plot_type: "工业",
          geom: { type: "Polygon", coordinates: [[[120.1, 30.2], [120.2, 30.2], [120.2, 30.3], [120.1, 30.2]]] },
          baseline_cod: 320,
          observed_cod: 150,
          water_usage_m3d: 300,
          risk_level: "high",
          label: "高风险",
        },
        {
          plot_id: "plot-002",
          plot_code: "PL-002",
          plot_name: "科技园 B 地块",
          plot_type: "工业",
          geom: { type: "Polygon", coordinates: [[[120.1, 30.2], [120.2, 30.2], [120.2, 30.3], [120.1, 30.2]]] },
          baseline_cod: 300,
          observed_cod: 170,
          water_usage_m3d: 280,
          risk_level: "high",
          label: "高风险",
        },
        {
          plot_id: "plot-003",
          plot_code: "PL-003",
          plot_name: "科技园 C 地块",
          plot_type: "工业",
          geom: { type: "Polygon", coordinates: [[[120.1, 30.2], [120.2, 30.2], [120.2, 30.3], [120.1, 30.2]]] },
          baseline_cod: 260,
          observed_cod: 210,
          water_usage_m3d: 240,
          risk_level: "medium",
          label: "中风险",
        },
        {
          plot_id: "plot-004",
          plot_code: "PL-004",
          plot_name: "科技园 D 地块",
          plot_type: "工业",
          geom: { type: "Polygon", coordinates: [[[120.1, 30.2], [120.2, 30.2], [120.2, 30.3], [120.1, 30.2]]] },
          baseline_cod: 240,
          observed_cod: 190,
          water_usage_m3d: 220,
          risk_level: "low",
          label: "低风险",
        },
      ],
    };

    fetchLowCodAnalysisRunsMock.mockResolvedValue(runs);
    fetchLowCodAnalysisRunMock.mockImplementation(async (runId: string) => {
      if (runId === "run-1") return runDetail;
      return {
        summary: { total: 2, high_risk: 0, medium_risk: 1, low_risk: 1, average_observed_cod: 260 },
        items: [],
      };
    });

    renderWithRouter("/admin/analysis-runs", <AdminAnalysisRunsPage />);

    expect(await screen.findByText(/平均基线 COD：280/)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "仅看含高风险" }));

    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).toContain("highRisk=1");
    });

    expect(screen.queryByText(/高风险 0/)).toBeNull();
    expect(screen.getByText(/高风险占比：50%/)).toBeTruthy();
    expect(screen.getByText(/平均基线 COD：280/)).toBeTruthy();
    expect(screen.getByText(/PL-001/)).toBeTruthy();
  });
});
