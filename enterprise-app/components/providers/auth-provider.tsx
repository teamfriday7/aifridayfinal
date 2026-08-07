"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { UserSummary } from "@/lib/types";

interface AuthContextValue {
  user: UserSummary | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existingToken = window.localStorage.getItem("enterprise-access-token");
    if (!existingToken) {
      setLoading(false);
      return;
    }

    apiClient.setToken(existingToken);
    setToken(existingToken);
    apiClient
      .getMe()
      .then((profile) => setUser(profile))
      .catch(() => {
        setUser(null);
        apiClient.setToken(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiClient.login(username.trim(), password);
      apiClient.setToken(response.access_token);
      setToken(response.access_token);
      setUser(response.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiClient.setToken(null);
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, token }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
