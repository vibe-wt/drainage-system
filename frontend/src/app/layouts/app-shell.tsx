import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../features/auth/auth-context";

const navItems = [
  { to: "/", label: "地图工作台" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/imports", label: "导入管理" },
  { to: "/analysis", label: "分析中心" },
  { to: "/access", label: "用户与访问" },
  { to: "/admin", label: "后台管理" },
];

type ThemeMode = "light" | "dark";

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "dark") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3a1 1 0 0 1 1 1v1.2a1 1 0 0 1-2 0V4a1 1 0 0 1 1-1Zm0 14.6a1 1 0 0 1 1 1V20a1 1 0 0 1-2 0v-1.4a1 1 0 0 1 1-1Zm8-6.6a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-1.4a1 1 0 1 1 0-2H20ZM5.4 12a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1.4a1 1 0 0 1 1 1Zm10.49-5.9 1-1a1 1 0 1 1 1.41 1.41l-.99.99a1 1 0 0 1-1.42-1.4Zm-9.2 9.19a1 1 0 0 1 1.41 0 1 1 0 0 1 0 1.42l-.99.99a1 1 0 0 1-1.41-1.42l.99-.99Zm11.61.99a1 1 0 0 1 0 1.42 1 1 0 0 1-1.41 0l-.99-.99a1 1 0 0 1 1.41-1.42l.99.99ZM7.7 6.11a1 1 0 1 1-1.41 1.4l-.99-.98A1 1 0 1 1 6.71 5.1l.99 1ZM12 7.25A4.75 4.75 0 1 1 7.25 12 4.76 4.76 0 0 1 12 7.25Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15.5 3.5a7.7 7.7 0 0 0 4.9 12.95 7.9 7.9 0 0 1-2.9 3.1A8.5 8.5 0 1 1 13.96 3c.52-.02 1.03.02 1.54.12Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AppShell() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const { user, session, logout, permissionMessage, clearPermissionMessage } = useAuth();

  const sessionExpiresText = session
    ? new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(session.session.expiresAt))
    : null;

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("drainage-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setThemeMode(savedTheme);
      return;
    }
    setThemeMode(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem("drainage-theme", themeMode);
  }, [themeMode]);

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav-brand">
          <div className="top-nav-badge">DS</div>
          <div>
            <strong>Drainage System</strong>
            <span>{user ? `${user.displayName} · ${user.role}` : "Map-first Research Workspace"}</span>
          </div>
        </div>
        <div className="top-nav-actions">
          <nav className="top-nav-links">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          {user ? (
            <div className="session-summary">
              <strong>{user.email}</strong>
              <span>{sessionExpiresText ? `会话至 ${sessionExpiresText}` : "会话有效"}</span>
            </div>
          ) : null}
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setThemeMode((current) => (current === "light" ? "dark" : "light"))}
            aria-label={themeMode === "light" ? "切换到夜间模式" : "切换到白天模式"}
            title={themeMode === "light" ? "切换到夜间模式" : "切换到白天模式"}
          >
            <ThemeIcon mode={themeMode} />
            <span>{themeMode === "light" ? "夜间" : "白天"}</span>
          </button>
          <button type="button" className="session-button" onClick={() => void logout()}>
            退出
          </button>
        </div>
      </header>
      {permissionMessage ? (
        <section className="permission-banner" role="status" aria-live="polite">
          <div>
            <strong>权限受限</strong>
            <span>{permissionMessage}</span>
          </div>
          <button type="button" className="permission-banner-close" onClick={clearPermissionMessage}>
            知道了
          </button>
        </section>
      ) : null}
      <main className="page-shell">
        <Suspense
          fallback={
            <section className="stack-page">
              <article className="panel stack-panel dashboard-status-banner">
                <strong>页面加载中</strong>
                <span className="muted-inline">正在按需加载模块，稍候即可显示。</span>
              </article>
            </section>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
