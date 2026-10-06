"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "awsArcade:session";

export interface Player {
  nameKey: string;
  displayName: string;
  totalPoints: number;
}

interface StoredSession {
  token: string;
  player: Player;
}

interface AuthContextValue {
  player: Player | null;
  token: string | null;
  ready: boolean; // false until we've checked localStorage on mount
  error: string | null;
  register: (name: string, password: string) => Promise<boolean>;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshPlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveStored(session: StoredSession | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore (private browsing etc.)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // localStorage is synchronous, so the initial session can be read directly
  // via a lazy initializer rather than an effect (window is undefined during
  // SSR, where this just yields null and hydrates from the real value).
  const [player, setPlayer] = useState<Player | null>(() =>
    typeof window !== "undefined" ? (loadStored()?.player ?? null) : null
  );
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? (loadStored()?.token ?? null) : null
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Deferred to a microtask so this doesn't set state synchronously
    // within the effect's own execution.
    queueMicrotask(() => setReady(true));
  }, []);

  const submit = useCallback(async (endpoint: string, name: string, password: string) => {
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return false;
      }
      setToken(data.token);
      setPlayer(data.player);
      saveStored({ token: data.token, player: data.player });
      return true;
    } catch {
      setError("Network error. Check your connection and try again.");
      return false;
    }
  }, []);

  const register = useCallback(
    (name: string, password: string) => submit("/api/auth/register", name, password),
    [submit]
  );
  const login = useCallback(
    (name: string, password: string) => submit("/api/auth/login", name, password),
    [submit]
  );

  const logout = useCallback(() => {
    setToken(null);
    setPlayer(null);
    saveStored(null);
  }, []);

  const refreshPlayer = useCallback(async () => {
    const stored = loadStored();
    const t = stored?.token ?? token;
    if (!t) return;
    try {
      const res = await fetch("/api/players/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPlayer(data.player);
      saveStored({ token: t, player: data.player });
    } catch {
      // ignore — stale cached player is better than crashing
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ player, token, ready, error, register, login, logout, refreshPlayer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
