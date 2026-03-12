export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
}

export interface AuthSessionMeta {
  sessionId: string;
  expiresAt: string;
}

export interface AuthSession {
  user: AuthUser;
  session: AuthSessionMeta;
}
