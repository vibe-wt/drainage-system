import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "../layouts/app-shell";

const MapWorkbenchPage = lazy(async () => {
  const module = await import("../../pages/map-workbench");
  return { default: module.MapWorkbenchPage };
});

const DashboardPage = lazy(async () => {
  const module = await import("../../pages/dashboard");
  return { default: module.DashboardPage };
});

const ImportManagementPage = lazy(async () => {
  const module = await import("../../pages/import-management");
  return { default: module.ImportManagementPage };
});

const AnalysisCenterPage = lazy(async () => {
  const module = await import("../../pages/analysis-center");
  return { default: module.AnalysisCenterPage };
});

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <MapWorkbenchPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "imports", element: <ImportManagementPage /> },
      { path: "analysis", element: <AnalysisCenterPage /> },
    ],
  },
]);
