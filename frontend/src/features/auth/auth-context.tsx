import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ApiError, setApiForbiddenHandler, setApiUnauthorizedHandler } from "../../shared/api/client";
import { fetchCurrentSession, login as loginRequest, logout as logoutRequest } from "./api";
import type { AuthSession, AuthUser } from "./types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface LoginFormValues {
  email: string;
  password: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  permissionMessage: string | null;
  clearPermissionMessage: () => void;
  login: (values: LoginFormValues) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  const clearSession = () => {
    startTransition(() => {
      setSession(null);
      setStatus("anonymous");
      setPermissionMessage(null);
    });
  };

  const clearPermissionMessage = () => {
    setPermissionMessage(null);
  };

  const buildPermissionMessage = (error: ApiError, user: AuthUser | null) => {
    const role = user?.role ?? "viewer";
    const path = window.location.pathname;

    if (path.startsWith("/access") && role !== "admin") {
      return "当前账号只能维护个人资料和会话。用户管理与认证审计需要 admin 权限。";
    }

    if (role === "viewer") {
      return "当前账号是 viewer，仅支持查看内容。导入、对象编辑和分析执行需要 editor 或 admin 权限。";
    }

    return error.message || "当前账号缺少执行此操作的权限。";
  };

  const refreshSession = async () => {
    setStatus((current) => (current === "authenticated" ? current : "loading"));
    try {
      const nextSession = await fetchCurrentSession();
      startTransition(() => {
        setSession(nextSession);
        setStatus("authenticated");
      });
    } catch (error) {
      if (!isUnauthorized(error)) {
        throw error;
      }
      clearSession();
    }
  };

  useEffect(() => {
    void refreshSession().catch(() => {
      clearSession();
    });
  }, []);

  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      clearSession();
      if (window.location.pathname !== "/login") {
        const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const params = new URLSearchParams();
        if (nextPath !== "/") {
          params.set("redirect", nextPath);
        }
        window.location.assign(`/login${params.size > 0 ? `?${params.toString()}` : ""}`);
      }
    });
    setApiForbiddenHandler((error) => {
      setPermissionMessage(buildPermissionMessage(error, session?.user ?? null));
    });
    return () => {
      setApiUnauthorizedHandler(null);
      setApiForbiddenHandler(null);
    };
  }, [session]);

  const value: AuthContextValue = {
    status,
    user: session?.user ?? null,
    session,
    isAuthenticated: status === "authenticated",
    permissionMessage,
    clearPermissionMessage,
    async login(values) {
      const nextSession = await loginRequest(values);
      startTransition(() => {
        setSession(nextSession);
        setStatus("authenticated");
        setPermissionMessage(null);
      });
    },
    async logout() {
      try {
        await logoutRequest();
      } finally {
        clearSession();
      }
    },
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
