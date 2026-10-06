"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchJsonWithRetry } from "@/lib/fetch-retry";
import { areAdjacent, GRID_COLS, TOTAL_CATEGORIES } from "@/lib/connections-logic";
import LoginGate from "@/components/LoginGate";

type Phase = "loading" | "blocked" | "playing" | "done";

interface GridCell {
  word: string;
  category: string;
}

interface NewResponse {
  error?: string;
  sessionId: string;
  words: string[];
  solvedCategories: string[];
  solvedPositions: number[];
  score: number;
  totalCategories: number;
  startedAt: number;
  durationMs: number;
}

interface ConnectResponse {
  error?: string;
  correct: boolean;
  expired?: boolean;
  alreadySolved?: boolean;
  category?: string;
  positions?: number[];
  pointsEarned?: number;
  totalScore: number;
  solvedCount: number;
  totalCategories: number;
  allSolved?: boolean;
  totalPoints?: number;
  grid?: GridCell[];
}

interface FinishResponse {
  totalScore: number;
  totalCategories: number;
  totalPoints?: number;
  grid: GridCell[];
}

export default function ConnectionsPage() {
  const { player, token, ready, refreshPlayer } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [solvedPositions, setSolvedPositions] = useState<Set<number>>(new Set());
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [wrongFlashPair, setWrongFlashPair] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [liveRemainingMs, setLiveRemainingMs] = useState(0);
  const [durationMs, setDurationMs] = useState(90000);
  const [finalGrid, setFinalGrid] = useState<GridCell[] | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  const startedAtRef = useRef(0);
  const finishingRef = useRef(false);
  const connectingRef = useRef(false);

  const finishGame = useCallback(
    async (preloadedGrid?: GridCell[], preloadedTotalPoints?: number, preloadedScore?: number) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      if (preloadedGrid) {
        setFinalGrid(preloadedGrid);
        setFinalScore(preloadedScore ?? score);
        setPhase("done");
        refreshPlayer();
        return;
      }
      if (!sessionId || !token) return;
      try {
        const { data } = await fetchJsonWithRetry<FinishResponse>("/api/connections/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId }),
        });
        setFinalGrid(data.grid);
        setFinalScore(data.totalScore);
        setPhase("done");
        refreshPlayer();
      } catch {
        // If this fails, the timer effect will simply not have moved us to
        // "done" — the player can reload and /new will pick up the expired
        // session and finalize it there instead.
        finishingRef.current = false;
      }
    },
    [sessionId, token, score, refreshPlayer]
  );

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { ok, data } = await fetchJsonWithRetry<NewResponse>("/api/connections/new", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!ok) {
          setBlockedMessage(data.error ?? "Could not start game.");
          setPhase("blocked");
          return;
        }
        setSessionId(data.sessionId);
        setWords(data.words);
        setSolvedPositions(new Set(data.solvedPositions));
        setScore(data.score);
        setSolvedCount(data.solvedCategories.length);
        setDurationMs(data.durationMs);
        startedAtRef.current = data.startedAt;
        setLiveRemainingMs(Math.max(0, data.durationMs - (Date.now() - data.startedAt)));
        setPhase("playing");
      } catch {
        setBlockedMessage("Network error. Please try again.");
        setPhase("blocked");
      }
    })();
  }, [token]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, durationMs - (Date.now() - startedAtRef.current));
      setLiveRemainingMs(remaining);
      if (remaining <= 0) {
        finishGame();
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [phase, durationMs, finishGame]);

  async function handleCellClick(pos: number) {
    if (phase !== "playing" || solvedPositions.has(pos) || connectingRef.current) return;

    if (selectedPos === null) {
      setSelectedPos(pos);
      return;
    }
    if (selectedPos === pos) {
      setSelectedPos(null);
      return;
    }
    if (!areAdjacent(selectedPos, pos)) {
      setSelectedPos(pos);
      return;
    }

    const a = selectedPos;
    const b = pos;
    setSelectedPos(null);
    connectingRef.current = true;
    try {
      const res = await fetch("/api/connections/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, posA: a, posB: b }),
      });
      const data: ConnectResponse = await res.json();
      if (!res.ok) return;

      if (data.expired) {
        finishGame();
        return;
      }
      if (data.correct && data.positions) {
        setSolvedPositions((prev) => new Set([...prev, ...data.positions!]));
        setScore(data.totalScore);
        setSolvedCount(data.solvedCount);
        if (data.allSolved) {
          finishGame(data.grid, data.totalPoints, data.totalScore);
        }
      } else {
        setWrongFlashPair([a, b]);
        window.setTimeout(() => setWrongFlashPair(null), 450);
      }
    } catch {
      // transient failure on a single click — just let the player try again
    } finally {
      connectingRef.current = false;
    }
  }

  if (!ready) return null;
  if (!player) return <LoginGate />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 py-8">
      <div className="mb-6 w-full">
        <h1 className="font-mono text-2xl font-bold tracking-tight">CONNECTIONS</h1>
        <p className="text-xs text-text-muted">
          Link related words that sit next to each other &mdash; across, up-down, or diagonal.
        </p>
      </div>

      {phase === "loading" && <p className="text-sm text-text-muted">Loading...</p>}

      {phase === "blocked" && (
        <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">{blockedMessage}</p>
          <Link
            href="/"
            className="mt-2 w-full rounded-md bg-purple px-4 py-2 text-center font-mono font-semibold text-white transition hover:bg-purple-dark"
          >
            Back to games
          </Link>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div className="mb-3 flex w-full items-center justify-between font-mono text-xs text-text-muted">
            <span>
              {solvedCount} / {TOTAL_CATEGORIES} groups &middot; {score} pts
            </span>
            <span>{Math.ceil(liveRemainingMs / 1000)}s</span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded bg-surface-2">
            <div
              className="h-full bg-orange transition-all"
              style={{ width: `${(liveRemainingMs / durationMs) * 100}%` }}
            />
          </div>

          <div
            className="grid w-full gap-1.5"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
          >
            {words.map((word, pos) => {
              const isSolved = solvedPositions.has(pos);
              const isSelected = selectedPos === pos;
              const isWrong = wrongFlashPair?.includes(pos) ?? false;
              let variant = "border-border bg-surface hover:border-purple";
              if (isSolved) variant = "border-purple bg-purple/10 text-purple-light";
              else if (isWrong) variant = "border-orange bg-orange/10";
              else if (isSelected) variant = "border-purple-light bg-purple/20";
              return (
                <button
                  key={pos}
                  onClick={() => handleCellClick(pos)}
                  disabled={isSolved}
                  className={`flex min-h-14 items-center justify-center rounded-md border-2 px-1 py-2 text-center text-[10px] leading-tight transition-colors sm:text-xs ${variant}`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase === "done" && (
        <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-mono text-lg font-bold">Time&apos;s up!</p>
          <p className="font-mono text-sm text-orange">{finalScore} points earned</p>
          {finalGrid && (
            <div className="w-full text-left">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-muted">The groups</p>
              <div className="flex flex-col gap-2">
                {Array.from(new Set(finalGrid.map((c) => c.category))).map((category) => (
                  <div key={category} className="rounded-lg border border-border bg-surface-2 p-3">
                    <p className="font-mono text-xs font-semibold text-purple-light">{category}</p>
                    <p className="text-sm text-text-muted">
                      {finalGrid.filter((c) => c.category === category).map((c) => c.word).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Link
            href="/"
            className="mt-2 w-full rounded-md bg-purple px-4 py-2 text-center font-mono font-semibold text-white transition hover:bg-purple-dark"
          >
            Back to games
          </Link>
        </div>
      )}
    </div>
  );
}
