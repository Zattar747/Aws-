"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "awsArcade:adminToken";

interface PlayerRow {
  displayName: string;
  totalPoints: number;
  createdAt: number;
  games: Record<string, { status: string; pointsEarned: number }>;
}

const GAMES = ["wordle", "trivia", "connections", "pictionary"] as const;

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function AdminPage() {
  // localStorage is synchronous, so this reads directly via a lazy
  // initializer rather than an effect (SSR yields null; the client's first
  // render already has the real value, same as AuthProvider's session read).
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? readStoredToken() : null
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [pictionaryMsg, setPictionaryMsg] = useState<string | null>(null);
  // Starts false on both server and client so the first render matches
  // (avoiding a hydration mismatch against the lazily-read token above),
  // then flips true right after mount.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setReady(true));
  }, []);

  const authedFetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } }),
    [token]
  );

  const loadData = useCallback(async () => {
    if (!token) return;
    const [playersRes, locksRes] = await Promise.all([
      authedFetch("/api/admin/players"),
      authedFetch("/api/admin/games/lock"),
    ]);
    if (playersRes.ok) setPlayers((await playersRes.json()).players);
    if (locksRes.ok) setLocks((await locksRes.json()).locks);
  }, [token, authedFetch]);

  useEffect(() => {
    if (token) queueMicrotask(() => void loadData());
  }, [token, loadData]);

  async function login() {
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoginError(data.error ?? "Login failed.");
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, data.token);
    } catch {
      // ignore
    }
    setToken(data.token);
  }

  async function toggleLock(game: string, locked: boolean) {
    setBusy(true);
    try {
      await authedFetch("/api/admin/games/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, locked }),
      });
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  async function startRound() {
    setBusy(true);
    setPictionaryMsg(null);
    try {
      const res = await authedFetch("/api/admin/pictionary/start-round", { method: "POST" });
      const data = await res.json();
      setPictionaryMsg(res.ok ? "Round started." : (data.error ?? "Could not start round."));
    } finally {
      setBusy(false);
    }
  }

  async function endRound() {
    setBusy(true);
    setPictionaryMsg(null);
    try {
      const res = await authedFetch("/api/admin/pictionary/end-round", { method: "POST" });
      const data = await res.json();
      setPictionaryMsg(res.ok ? "Round ended and scored." : (data.error ?? "Could not end round."));
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  async function finalizePictionary() {
    setBusy(true);
    setPictionaryMsg(null);
    try {
      const res = await authedFetch("/api/admin/pictionary/finalize", { method: "POST" });
      const data = await res.json();
      setPictionaryMsg(
        res.ok ? `Finalized for ${data.finalizedCount} players.` : (data.error ?? "Could not finalize.")
      );
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!token) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-12">
        <h1 className="mb-6 font-mono text-xl font-bold">Admin Login</h1>
        <div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface p-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Admin password"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-center font-mono text-text outline-none focus:border-purple"
          />
          {loginError && <p className="text-center text-sm text-orange">{loginError}</p>}
          <button
            onClick={login}
            className="w-full rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="mb-6 font-mono text-2xl font-bold tracking-tight">ADMIN</h1>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-text-muted">Game Locks</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GAMES.map((g) => (
            <button
              key={g}
              disabled={busy}
              onClick={() => toggleLock(g, !locks[g])}
              className={`rounded-lg border-2 px-3 py-3 text-center font-mono text-sm transition disabled:opacity-50 ${
                locks[g] ? "border-orange bg-orange/10 text-orange" : "border-purple bg-purple/10 text-purple-light"
              }`}
            >
              <div className="font-bold capitalize">{g}</div>
              <div className="text-xs">{locks[g] ? "Locked" : "Open"}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-text-muted">
          Pictionary Controls
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            onClick={startRound}
            className="rounded-md bg-purple px-4 py-2 font-mono text-sm font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
          >
            Start Round
          </button>
          <button
            disabled={busy}
            onClick={endRound}
            className="rounded-md border border-border px-4 py-2 font-mono text-sm transition hover:border-purple disabled:opacity-50"
          >
            End Round Now
          </button>
          <button
            disabled={busy}
            onClick={finalizePictionary}
            className="rounded-md border border-orange px-4 py-2 font-mono text-sm text-orange transition hover:bg-orange/10 disabled:opacity-50"
          >
            Finalize &amp; Lock Session
          </button>
        </div>
        {pictionaryMsg && <p className="mt-2 text-sm text-text-muted">{pictionaryMsg}</p>}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-text-muted">
          Players ({players?.length ?? 0})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[640px] font-mono text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-xs uppercase text-text-muted">
                <th className="px-3 py-2 text-left">Player</th>
                <th className="px-3 py-2 text-right">Total</th>
                {GAMES.map((g) => (
                  <th key={g} className="px-3 py-2 text-right capitalize">
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players?.map((p) => (
                <tr key={p.displayName} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{p.displayName}</td>
                  <td className="px-3 py-2 text-right text-purple-light">{p.totalPoints}</td>
                  {GAMES.map((g) => {
                    const g2 = p.games[g];
                    return (
                      <td key={g} className="px-3 py-2 text-right text-text-muted">
                        {g2 ? `${g2.pointsEarned} (${g2.status})` : "n/a"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {players?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-text-muted">
                    No players registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
