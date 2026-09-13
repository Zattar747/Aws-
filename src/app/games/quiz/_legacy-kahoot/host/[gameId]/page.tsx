"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ShapeIcon from "@/components/ShapeIcon";
import { TILE_STYLES } from "@/lib/quiz-tiles";

interface StateResponse {
  status: "lobby" | "question" | "reveal" | "ended";
  currentQuestion: number;
  totalQuestions: number;
  pin?: string;
  players?: string[];
  question?: string;
  options?: string[];
  remainingMs?: number;
  durationMs?: number;
  answeredCount?: number;
  totalPlayers?: number;
  correctIndex?: number;
  counts?: number[];
  leaderboard?: { displayName: string; score: number }[];
}

export default function QuizHostPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const [data, setData] = useState<StateResponse | null>(null);
  const [liveRemainingMs, setLiveRemainingMs] = useState(0);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const [busy, setBusy] = useState(false);
  const lastPollRef = useRef<{ remainingMs: number; at: number } | null>(null);
  const autoRevealedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/quiz/state?gameId=${gameId}`);
      if (!res.ok || cancelled) return;
      const json: StateResponse = await res.json();
      if (cancelled) return;
      setData(json);
      if (json.status === "question" && typeof json.remainingMs === "number") {
        lastPollRef.current = { remainingMs: json.remainingMs, at: Date.now() };
        setLiveRemainingMs(json.remainingMs);
      } else {
        lastPollRef.current = null;
        autoRevealedRef.current = false;
      }
    }
    poll();
    const id = window.setInterval(poll, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [gameId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (lastPollRef.current) {
        const { remainingMs, at } = lastPollRef.current;
        setLiveRemainingMs(Math.max(0, remainingMs - (Date.now() - at)));
      }
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (data?.status === "question" && liveRemainingMs <= 0 && !autoRevealedRef.current) {
      autoRevealedRef.current = true;
      fetch("/api/quiz/host/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRemainingMs, data?.status]);

  async function startGame() {
    setBusy(true);
    try {
      await fetch("/api/quiz/host/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function revealNow() {
    setBusy(true);
    try {
      await fetch("/api/quiz/host/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function nextQuestion() {
    setBusy(true);
    try {
      await fetch("/api/quiz/host/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <div className="flex flex-1 items-center justify-center text-text-muted">Loading...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      {data.status === "lobby" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="font-mono text-sm uppercase tracking-widest text-text-muted">Game PIN</p>
          <p className="font-mono text-6xl font-bold tracking-[0.2em] text-purple-light">{gameId}</p>
          <p className="text-sm text-text-muted">
            Go to <span className="text-text">{origin}/games/quiz</span> and join with this PIN
          </p>
          <div className="flex w-full flex-wrap justify-center gap-2">
            {(data.players ?? []).map((name) => (
              <span
                key={name}
                className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-sm"
              >
                {name}
              </span>
            ))}
            {(data.players ?? []).length === 0 && (
              <p className="text-sm text-text-muted">Waiting for players to join...</p>
            )}
          </div>
          <button
            onClick={startGame}
            disabled={busy || (data.players ?? []).length === 0}
            className="rounded-md bg-purple px-8 py-3 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
          >
            Start Game
          </button>
        </div>
      )}

      {data.status === "question" && (
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex items-center justify-between font-mono text-xs text-text-muted">
            <span>
              Question {data.currentQuestion + 1} / {data.totalQuestions}
            </span>
            <span>
              {data.answeredCount ?? 0} / {data.totalPlayers ?? 0} answered
            </span>
          </div>
          <p className="text-center text-2xl font-bold">{data.question}</p>
          <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-orange transition-all"
              style={{
                width: `${(liveRemainingMs / (data.durationMs ?? 1)) * 100}%`,
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(data.options ?? []).map((option, i) => {
              const tile = TILE_STYLES[i];
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-4 py-5 font-semibold text-white"
                  style={{ backgroundColor: tile.color }}
                >
                  <ShapeIcon shape={tile.shape} />
                  <span>{option}</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={revealNow}
            disabled={busy}
            className="mx-auto rounded-md border-2 border-border px-6 py-2 font-mono text-sm transition hover:border-purple disabled:opacity-50"
          >
            Reveal Now
          </button>
        </div>
      )}

      {data.status === "reveal" && (
        <div className="flex flex-1 flex-col gap-6">
          <p className="text-center text-2xl font-bold">{data.question}</p>
          <div className="grid grid-cols-2 gap-3">
            {(data.options ?? []).map((option, i) => {
              const tile = TILE_STYLES[i];
              const isCorrect = i === data.correctIndex;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg px-4 py-5 font-semibold text-white"
                  style={{ backgroundColor: tile.color, opacity: isCorrect ? 1 : 0.35 }}
                >
                  <div className="flex items-center gap-3">
                    <ShapeIcon shape={tile.shape} />
                    <span>{option}</span>
                  </div>
                  <span className="font-mono text-sm">{data.counts?.[i] ?? 0}</span>
                  {isCorrect && <span className="font-mono text-xs">CORRECT</span>}
                </div>
              );
            })}
          </div>
          <div className="mx-auto w-full max-w-sm rounded-xl border border-border bg-surface p-4">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-muted">
              Leaderboard
            </p>
            {(data.leaderboard ?? []).map((p, i) => (
              <div key={p.displayName} className="flex justify-between py-1 font-mono text-sm">
                <span>
                  {i + 1}. {p.displayName}
                </span>
                <span className="text-purple-light">{p.score}</span>
              </div>
            ))}
          </div>
          <button
            onClick={nextQuestion}
            disabled={busy}
            className="mx-auto rounded-md bg-purple px-8 py-3 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
          >
            {data.currentQuestion + 1 >= data.totalQuestions ? "Show Final Results" : "Next Question"}
          </button>
        </div>
      )}

      {data.status === "ended" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="font-mono text-2xl font-bold">Final Results 🎉</p>
          <div className="flex w-full max-w-md flex-col gap-2">
            {(data.leaderboard ?? []).map((p, i) => (
              <div
                key={p.displayName}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 font-mono ${
                  i === 0
                    ? "border-purple bg-purple/10 text-lg font-bold"
                    : "border-border bg-surface text-sm"
                }`}
              >
                <span>
                  {i + 1}. {p.displayName}
                </span>
                <span className="text-purple-light">{p.score}</span>
              </div>
            ))}
          </div>
          <Link
            href="/games/quiz"
            className="rounded-md border border-border px-6 py-2 font-mono text-sm transition hover:border-purple hover:text-purple"
          >
            Back to Trivia
          </Link>
        </div>
      )}
    </div>
  );
}
