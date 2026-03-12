import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./auth-context";

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return (
      <main className="auth-loading-shell">
        <section className="panel stack-panel auth-loading-panel">
          <strong>正在恢复登录状态</strong>
          <span className="muted-inline">认证中心正在校验当前会话。</span>
        </section>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
