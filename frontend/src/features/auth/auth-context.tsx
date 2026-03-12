import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "../../shared/api/client";
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
      startTransition(() => {
        setSession(null);
        setStatus("anonymous");
      });
    }
  };

  useEffect(() => {
    void refreshSession().catch(() => {
      startTransition(() => {
        setSession(null);
        setStatus("anonymous");
      });
    });
  }, []);

  const value: AuthContextValue = {
    status,
    user: session?.user ?? null,
    session,
    isAuthenticated: status === "authenticated",
    async login(values) {
      const nextSession = await loginRequest(values);
      startTransition(() => {
        setSession(nextSession);
        setStatus("authenticated");
      });
    },
    async logout() {
      try {
        await logoutRequest();
      } finally {
        startTransition(() => {
          setSession(null);
          setStatus("anonymous");
        });
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
