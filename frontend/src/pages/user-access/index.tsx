import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "../../features/auth/auth-context";
import {
  fetchAuthAuditLogs,
  createUser,
  fetchCurrentUser,
  fetchMySessions,
  fetchUsers,
  revokeMySession,
  resetUserPassword,
  updateCurrentUser,
  updateUserStatus,
  type AuthAuditLogItem,
  type CreateUserPayload,
  type CurrentUser,
  type UserSessionItem,
  type UserListItem,
} from "./api";

const initialForm: CreateUserPayload = {
  email: "",
  display_name: "",
  password: "",
  role: "viewer",
  status: "active",
};

function formatTime(value: string | null): string {
  if (!value) {
    return "尚未登录";
  }
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function UserAccessPage() {
  const auth = useAuth();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuthAuditLogItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [form, setForm] = useState<CreateUserPayload>(initialForm);
  const [profileName, setProfileName] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [nextCurrentUser, nextUsers, nextSessions, nextAuditLogs] = await Promise.all([
        fetchCurrentUser(),
        fetchUsers(),
        fetchMySessions(),
        fetchAuthAuditLogs().catch(() => []),
      ]);
      setCurrentUser(nextCurrentUser);
      setProfileName(nextCurrentUser.display_name);
      setUsers(nextUsers);
      setSessions(nextSessions);
      setAuditLogs(nextAuditLogs);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "用户列表加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const message = await createUser(form);
      setFeedbackMessage(message);
      setForm(initialForm);
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建用户失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const nextCurrentUser = await updateCurrentUser({
        display_name: profileName,
        new_password: profilePassword || undefined,
      });
      setCurrentUser(nextCurrentUser);
      setProfileName(nextCurrentUser.display_name);
      setProfilePassword("");
      setFeedbackMessage("当前账号信息已更新");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "当前账号更新失败");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleToggleStatus(user: UserListItem) {
    setBusyUserId(user.id);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const nextStatus = user.status === "active" ? "disabled" : "active";
      const message = await updateUserStatus(user.id, nextStatus);
      setFeedbackMessage(message);
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "更新用户状态失败");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleResetPassword(user: UserListItem) {
    const draft = passwordDrafts[user.id]?.trim();
    if (!draft || draft.length < 8) {
      setErrorMessage("重置密码至少需要 8 位");
      return;
    }
    setBusyUserId(user.id);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const message = await resetUserPassword(user.id, draft);
      setFeedbackMessage(message);
      setPasswordDrafts((current) => ({ ...current, [user.id]: "" }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "重置密码失败");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleRevokeSession(session: UserSessionItem) {
    setBusyUserId(session.session_id);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const message = await revokeMySession(session.session_id);
      setFeedbackMessage(message);
      if (session.is_current) {
        await auth.logout();
        return;
      }
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "撤销会话失败");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section className="stack-page">
      <header>
        <h2>用户与访问</h2>
        <p>这是 auth-login 阶段的轻量用户管理入口，只负责用户基础资料和访问身份，不接业务后台功能。</p>
      </header>

      <div className="card-grid user-access-grid">
        <article className="panel stack-panel">
          <strong>角色边界</strong>
          <p className="muted-inline">当前阶段先采用轻量角色守卫，确保多人登录下的基本读写边界明确。</p>
          <div className="role-rule-list">
            <div className="role-rule-card">
              <strong>viewer</strong>
              <span>只读访问地图、Dashboard、导入记录、分析结果和用户页面。</span>
            </div>
            <div className="role-rule-card">
              <strong>editor</strong>
              <span>允许导入数据、编辑对象、运行分析，但不能管理用户。</span>
            </div>
            <div className="role-rule-card">
              <strong>admin</strong>
              <span>继承 editor 能力，并可创建用户、修改状态、重置密码。</span>
            </div>
          </div>
        </article>

        <article className="panel stack-panel">
          <strong>我的账号</strong>
          <p className="muted-inline">当前登录用户可以在这里维护显示名和个人密码，不涉及角色变更。</p>
          <form className="user-form" onSubmit={handleProfileSubmit}>
            <label className="compact-field">
              <span>登录邮箱</span>
              <input className="text-input" value={currentUser?.email ?? ""} disabled />
            </label>
            <label className="compact-field">
              <span>显示名</span>
              <input className="text-input" value={profileName} onChange={(event) => setProfileName(event.target.value)} required />
            </label>
            <label className="compact-field">
              <span>新密码</span>
              <input
                className="text-input"
                type="password"
                value={profilePassword}
                onChange={(event) => setProfilePassword(event.target.value)}
                placeholder="留空则不修改"
                minLength={8}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="tool-button active" disabled={isSavingProfile}>
                {isSavingProfile ? "保存中" : "更新我的账号"}
              </button>
            </div>
          </form>
        </article>

        <article className="panel stack-panel">
          <strong>我的会话</strong>
          <p className="muted-inline">查看当前账号在哪些浏览器或设备上保持登录，并按需撤销会话。</p>
          {sessions.length === 0 ? (
            <div className="dashboard-empty">
              <strong>暂无会话记录</strong>
              <span className="muted-inline">当前没有可展示的会话信息。</span>
            </div>
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <article key={session.session_id} className="user-card">
                  <div className="user-card-head">
                    <strong>{session.is_current ? "当前会话" : "历史会话"}</strong>
                    <span className={`user-badge user-badge-${session.status === "active" ? "active" : "disabled"}`}>
                      {session.status}
                    </span>
                  </div>
                  <span>会话 ID: {session.session_id}</span>
                  <span>IP: {session.ip_address ?? "未知"}</span>
                  <span>最近活动: {formatTime(session.last_seen_at)}</span>
                  <span>创建时间: {formatTime(session.created_at)}</span>
                  <span>到期时间: {formatTime(session.expires_at)}</span>
                  <span className="user-agent-text">{session.user_agent ?? "未知 User-Agent"}</span>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="tool-button"
                      onClick={() => void handleRevokeSession(session)}
                      disabled={busyUserId === session.session_id || session.status !== "active"}
                    >
                      {session.is_current ? "退出当前会话" : "撤销此会话"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        {currentUser?.role === "admin" ? (
          <article className="panel stack-panel">
            <strong>认证审计</strong>
            <p className="muted-inline">记录登录、用户创建、状态调整、密码重置和会话撤销，作为认证域的基础追溯面。</p>
            {auditLogs.length === 0 ? (
              <div className="dashboard-empty">
                <strong>暂无审计记录</strong>
                <span className="muted-inline">当前还没有可展示的认证动作日志。</span>
              </div>
            ) : (
              <div className="audit-log-list">
                {auditLogs.map((item) => (
                  <article key={item.id} className="user-card">
                    <div className="user-card-head">
                      <strong>{item.action}</strong>
                      <span>{formatTime(item.created_at)}</span>
                    </div>
                    <span>操作者: {item.actor_user_id ?? "匿名"}</span>
                    <span>目标用户: {item.target_user_id ?? "无"}</span>
                    <span>目标会话: {item.target_session_id ?? "无"}</span>
                    <span>IP: {item.ip_address ?? "未知"}</span>
                    <span className="user-agent-text">{item.user_agent ?? "未知 User-Agent"}</span>
                  </article>
                ))}
              </div>
            )}
          </article>
        ) : null}

        <article className="panel stack-panel">
          <strong>新增用户</strong>
          <p className="muted-inline">先提供最小用户创建能力，便于多人登录和后续后台管理接入。</p>
          <form className="user-form" onSubmit={handleSubmit}>
            <label className="compact-field">
              <span>邮箱</span>
              <input
                className="text-input"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>
            <label className="compact-field">
              <span>显示名</span>
              <input
                className="text-input"
                value={form.display_name}
                onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
                required
              />
            </label>
            <label className="compact-field">
              <span>初始密码</span>
              <input
                className="text-input"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                minLength={8}
              />
            </label>
            <label className="compact-field">
              <span>角色</span>
              <select
                className="text-input"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              >
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label className="compact-field">
              <span>状态</span>
              <select
                className="text-input"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="tool-button active" disabled={isSubmitting}>
                {isSubmitting ? "创建中" : "创建用户"}
              </button>
            </div>
          </form>
          {feedbackMessage ? <p className="success-text">{feedbackMessage}</p> : null}
          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        </article>

        <article className="panel stack-panel">
          <strong>用户列表</strong>
          <p className="muted-inline">当前仅展示登录基础所需信息，后续可在后台管理中继续扩展部门、权限组和审计视图。</p>
          {isLoading ? (
            <div className="dashboard-empty">
              <strong>用户列表加载中</strong>
              <span className="muted-inline">正在读取当前租户的基础用户清单。</span>
            </div>
          ) : users.length === 0 ? (
            <div className="dashboard-empty">
              <strong>暂无用户</strong>
              <span className="muted-inline">当前系统还没有可展示的用户记录。</span>
            </div>
          ) : (
            <div className="user-list">
              {users.map((user) => (
                <article key={user.id} className="user-card">
                  <div className="user-card-head">
                    <strong>{user.display_name}</strong>
                    <span className={`user-badge user-badge-${user.status}`}>{user.status}</span>
                  </div>
                  <span>{user.email}</span>
                  <span>角色: {user.role}</span>
                  <span>创建时间: {formatTime(user.created_at)}</span>
                  <span>最近登录: {formatTime(user.last_login_at)}</span>
                  <div className="user-card-actions">
                    <button
                      type="button"
                      className="tool-button"
                      onClick={() => void handleToggleStatus(user)}
                      disabled={busyUserId === user.id || user.id === currentUser?.id}
                    >
                      {user.status === "active" ? "禁用" : "启用"}
                    </button>
                    <input
                      className="text-input"
                      type="password"
                      placeholder="输入新密码"
                      value={passwordDrafts[user.id] ?? ""}
                      onChange={(event) =>
                        setPasswordDrafts((current) => ({ ...current, [user.id]: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="tool-button active"
                      onClick={() => void handleResetPassword(user)}
                      disabled={busyUserId === user.id}
                    >
                      重置密码
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
