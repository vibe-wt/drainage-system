import { apiDeleteJson, apiGet, apiPatch, apiPost } from "../../shared/api/client";

export interface UserListItem {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

export interface CreateUserPayload {
  email: string;
  display_name: string;
  password: string;
  role: string;
  status: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  last_login_at: string | null;
}

export interface UserSessionItem {
  session_id: string;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
  is_current: boolean;
}

export async function fetchUsers(): Promise<UserListItem[]> {
  const response = await apiGet<{ items: UserListItem[] }>("/auth/users");
  return response.items;
}

export async function createUser(payload: CreateUserPayload): Promise<string> {
  const response = await apiPost<{ message: string }>("/auth/users", payload);
  return response.message;
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiGet<CurrentUser>("/auth/me");
}

export async function updateCurrentUser(payload: {
  display_name?: string;
  new_password?: string;
}): Promise<CurrentUser> {
  return apiPatch<CurrentUser>("/auth/me", payload);
}

export async function updateUserStatus(userId: string, status: string): Promise<string> {
  const response = await apiPatch<{ message: string }>(`/auth/users/${userId}/status`, { status });
  return response.message;
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<string> {
  const response = await apiPatch<{ message: string }>(`/auth/users/${userId}/password`, { new_password: newPassword });
  return response.message;
}

export async function fetchMySessions(): Promise<UserSessionItem[]> {
  const response = await apiGet<{ items: UserSessionItem[] }>("/auth/me/sessions");
  return response.items;
}

export async function revokeMySession(sessionId: string): Promise<string> {
  const response = await apiDeleteJson<{ message: string }>(`/auth/me/sessions/${sessionId}`);
  return response.message;
}
