import { apiGet, apiPost } from "../../shared/api/client";
import type { AuthSession } from "./types";

interface LoginPayload {
  email: string;
  password: string;
}

interface LogoutResponse {
  message: string;
}

interface AuthSessionDto {
  user: {
    id: string;
    email: string;
    display_name: string;
    role: string;
    status: string;
    last_login_at: string | null;
  };
  session: {
    session_id: string;
    expires_at: string;
  };
}

function toAuthSession(payload: AuthSessionDto): AuthSession {
  return {
    user: {
      id: payload.user.id,
      email: payload.user.email,
      displayName: payload.user.display_name,
      role: payload.user.role,
      status: payload.user.status,
      lastLoginAt: payload.user.last_login_at,
    },
    session: {
      sessionId: payload.session.session_id,
      expiresAt: payload.session.expires_at,
    },
  };
}

export async function fetchCurrentSession(): Promise<AuthSession> {
  const payload = await apiGet<AuthSessionDto>("/auth/session");
  return toAuthSession(payload);
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const response = await apiPost<AuthSessionDto>("/auth/login", payload);
  return toAuthSession(response);
}

export async function logout(): Promise<void> {
  await apiPost<LogoutResponse>("/auth/logout", {});
}
