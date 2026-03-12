import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "../layouts/app-shell";
import { ProtectedRoute } from "../../features/auth/protected-route";
import { LoginPage } from "../../pages/login";

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

const UserAccessPage = lazy(async () => {
  const module = await import("../../pages/user-access");
  return { default: module.UserAccessPage };
});

const AdminConsolePage = lazy(async () => {
  const module = await import("../../pages/admin-console");
  return { default: module.AdminConsolePage };
});

const AdminOverviewPage = lazy(async () => {
  const module = await import("../../pages/admin-console/overview");
  return { default: module.AdminOverviewPage };
});

const AdminAssetsPage = lazy(async () => {
  const module = await import("../../pages/admin-console/assets");
  return { default: module.AdminAssetsPage };
});

const AdminImportBatchesPage = lazy(async () => {
  const module = await import("../../pages/admin-console/import-batches");
  return { default: module.AdminImportBatchesPage };
});

const AdminAnalysisRunsPage = lazy(async () => {
  const module = await import("../../pages/admin-console/analysis-runs");
  return { default: module.AdminAnalysisRunsPage };
});

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <MapWorkbenchPage /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "imports", element: <ImportManagementPage /> },
          { path: "analysis", element: <AnalysisCenterPage /> },
          { path: "access", element: <UserAccessPage /> },
          {
            path: "admin",
            element: <AdminConsolePage />,
            children: [
              { index: true, element: <AdminOverviewPage /> },
              { path: "assets", element: <AdminAssetsPage /> },
              { path: "import-batches", element: <AdminImportBatchesPage /> },
              { path: "analysis-runs", element: <AdminAnalysisRunsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
