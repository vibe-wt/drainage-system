import { NavLink, Outlet, useLocation } from "react-router-dom";

const adminNavItems = [
  { to: "/admin", label: "总览", description: "后台摘要与入口", icon: "overview" },
  { to: "/admin/assets", label: "资产管理", description: "检查井、管道、地块台账", icon: "assets" },
  { to: "/admin/import-batches", label: "导入批次", description: "导入历史、结果与核查", icon: "imports" },
  { to: "/admin/analysis-runs", label: "分析记录", description: "低浓度分析历史与结果", icon: "analysis" },
] as const;

function AdminIcon({ name }: { name: "overview" | "assets" | "imports" | "analysis" }) {
  const icons = {
    overview: <path d="M6 7h12M6 12h9M6 17h7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
    assets: (
      <>
        <circle cx="8" cy="9" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M13.5 8h4m-4 4h4m-9 4h9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
    imports: (
      <path
        d="M12 5v9m0 0 3-3m-3 3-3-3M6 18h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    analysis: <path d="M6 16V9m6 7V6m6 10v-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
  };

  return (
    <svg viewBox="0 0 24 24" className="admin-nav-icon" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

export function AdminConsolePage() {
  const location = useLocation();
  const currentItem =
    adminNavItems.find((item) => (item.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.to))) ?? adminNavItems[0];

  return (
    <section className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <span className="admin-kicker">Admin</span>
          <h2>后台管理</h2>
          <p>与地图工作台分离的管理入口，适合做批次、台账和分析记录维护。</p>
        </div>
        <nav className="admin-sidebar-nav" aria-label="后台导航">
          {adminNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/admin"} className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}>
              <AdminIcon name={item.icon} />
              <span className="admin-nav-copy">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-content">
        <header className="admin-context-card">
          <div>
            <span className="admin-section-kicker">Current Section</span>
            <h1>{currentItem.label}</h1>
            <p>{currentItem.description}</p>
          </div>
          <div className="admin-breadcrumb">
            <span>后台管理</span>
            <strong>{currentItem.label}</strong>
          </div>
        </header>
        <Outlet />
      </div>
    </section>
  );
}
