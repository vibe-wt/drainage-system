import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/auth-context";

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@drainage.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await auth.login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="login-hero-copy">
          <span className="login-kicker">AUTH FOUNDATION</span>
          <h1>排水系统研究工作台登录入口</h1>
          <p>
            第一阶段先补齐多人使用的认证基础。当前基于服务端会话，后续可以继续扩展到用户管理、权限分层、后台管理和地图工作台联动。
          </p>
        </div>
        <div className="login-hero-points">
          <article className="login-point-card">
            <strong>会话托管</strong>
            <span>使用 HttpOnly Cookie 持久化登录状态，前端不直接保存凭证。</span>
          </article>
          <article className="login-point-card">
            <strong>可扩展用户模型</strong>
            <span>预留用户角色、状态、最近登录时间和会话表，为后续多人权限扩展做准备。</span>
          </article>
          <article className="login-point-card">
            <strong>工作台接入</strong>
            <span>业务页面保持原结构，仅在路由入口和接口层统一接入认证。</span>
          </article>
        </div>
      </section>

      <section className="login-card panel">
        <div className="login-card-head">
          <strong>登录 Drainage System</strong>
          <span>默认种子管理员已预填，便于本地联调。</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>邮箱</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@drainage.local"
              required
            />
          </label>

          <label className="login-field">
            <span>密码</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              required
              minLength={8}
            />
          </label>

          {errorMessage ? <p className="login-error">{errorMessage}</p> : null}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? "登录中..." : "进入工作台"}
          </button>
        </form>

        <div className="login-footnote">
          <span>建议上线后通过环境变量覆盖种子管理员账号和密码。</span>
          <code>seed_admin_email / seed_admin_password</code>
        </div>
      </section>
    </main>
  );
}
