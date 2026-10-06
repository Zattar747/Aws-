"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginGate({ title }: { title?: string }) {
  const { register, login, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim() || !password) return;
    setLoading(true);
    try {
      if (mode === "register") await register(name, password);
      else await login(name, password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-12">
      <h1 className="mb-1 font-mono text-xl font-bold">{title ?? "Sign in to play"}</h1>
      <p className="mb-6 text-center text-sm text-text-muted">
        One account tracks your points across every game. Each game can only be played once, so
        make it count.
      </p>

      <div className="mb-4 flex w-full rounded-md border border-border bg-surface p-1 font-mono text-xs">
        <button
          onClick={() => setMode("register")}
          className={`flex-1 rounded px-3 py-1.5 transition ${mode === "register" ? "bg-purple text-white" : "text-text-muted"}`}
        >
          New player
        </button>
        <button
          onClick={() => setMode("login")}
          className={`flex-1 rounded px-3 py-1.5 transition ${mode === "login" ? "bg-purple text-white" : "text-text-muted"}`}
        >
          I have an account
        </button>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface p-6">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Your name"
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-center font-mono text-text outline-none focus:border-purple"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={100}
          placeholder={mode === "register" ? "Choose a password" : "Password"}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-center font-mono text-text outline-none focus:border-purple"
        />
        {error && <p className="text-center text-sm text-orange">{error}</p>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
        >
          {loading ? "..." : mode === "register" ? "Create account" : "Log in"}
        </button>
      </div>
    </div>
  );
}
