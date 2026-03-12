import { FormEvent, useEffect, useState } from "react";

import {
  createUser,
  fetchCurrentUser,
  fetchUsers,
  resetUserPassword,
  updateCurrentUser,
  updateUserStatus,
  type CreateUserPayload,
  type CurrentUser,
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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
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
      const [nextCurrentUser, nextUsers] = await Promise.all([fetchCurrentUser(), fetchUsers()]);
      setCurrentUser(nextCurrentUser);
      setProfileName(nextCurrentUser.display_name);
      setUsers(nextUsers);
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

  return (
    <section className="stack-page">
      <header>
        <h2>用户与访问</h2>
        <p>这是 auth-login 阶段的轻量用户管理入口，只负责用户基础资料和访问身份，不接业务后台功能。</p>
      </header>

      <div className="card-grid user-access-grid">
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
