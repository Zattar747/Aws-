"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchJsonWithRetry } from "@/lib/fetch-retry";
import { GROUP_SIZE, GRID_COLS, MAX_MISTAKES, TOTAL_CATEGORIES } from "@/lib/connections-logic";
import { shuffle } from "@/lib/shuffle";
import LoginGate from "@/components/LoginGate";
import GiveUpControl from "@/components/GiveUpControl";

type Phase = "loading" | "blocked" | "playing" | "done";
type EndReason = "solved" | "gaveUp" | "mistakes";

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
  mistakesRemaining: number;
}

interface ConnectResponse {
  error?: string;
  correct: boolean;
  awayCount?: number;
  positions?: number[];
  pointsEarned?: number;
  totalScore: number;
  solvedCount: number;
  totalCategories: number;
  allSolved?: boolean;
  totalPoints?: number;
  mistakesRemaining: number;
  gameOver?: boolean;
  grid?: GridCell[];
}

interface GiveUpResponse {
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
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);
  const [solvedPositions, setSolvedPositions] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number[]>([]);
  const [wrongFlash, setWrongFlash] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [mistakesRemaining, setMistakesRemaining] = useState(MAX_MISTAKES);
  const [finalGrid, setFinalGrid] = useState<GridCell[] | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [endReason, setEndReason] = useState<EndReason>("solved");
  const [submitting, setSubmitting] = useState(false);

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
        setDisplayOrder(shuffle(data.words.map((_, i) => i)));
        setSolvedPositions(new Set(data.solvedPositions));
        setScore(data.score);
        setSolvedCount(data.solvedCategories.length);
        setMistakesRemaining(data.mistakesRemaining);
        setPhase("playing");
      } catch {
        setBlockedMessage("Network error. Please try again.");
        setPhase("blocked");
      }
    })();
  }, [token]);

  function toggleCell(pos: number) {
    if (phase !== "playing" || solvedPositions.has(pos) || submitting) return;
    setSelected((prev) => {
      if (prev.includes(pos)) return prev.filter((p) => p !== pos);
      if (prev.length >= GROUP_SIZE) return prev;
      return [...prev, pos];
    });
  }

  async function submitGroup() {
    if (selected.length !== GROUP_SIZE || submitting || !sessionId || !token) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/connections/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, positions: selected }),
      });
      const data: ConnectResponse = await res.json();
      if (!res.ok) {
        setSubmitting(false);
        return;
      }

      if (data.correct && data.positions) {
        setSolvedPositions((prev) => new Set([...prev, ...data.positions!]));
        setScore(data.totalScore);
        setSolvedCount(data.solvedCount);
        setMistakesRemaining(data.mistakesRemaining);
        setSelected([]);
        setFeedback(null);
        setSubmitting(false);
        if (data.allSolved && data.grid) {
          setFinalGrid(data.grid);
          setFinalScore(data.totalScore);
          setEndReason("solved");
          setPhase("done");
          refreshPlayer();
        }
      } else {
        setWrongFlash(selected);
        setMistakesRemaining(data.mistakesRemaining);
        setFeedback(data.awayCount ? `${data.awayCount} away from a group!` : "Not a match.");
        window.setTimeout(() => {
          setWrongFlash([]);
          setSelected([]);
          setFeedback(null);
          setSubmitting(false);
          if (data.gameOver && data.grid) {
            setFinalGrid(data.grid);
            setFinalScore(data.totalScore);
            setEndReason("mistakes");
            setPhase("done");
            refreshPlayer();
          }
        }, 1100);
      }
    } catch {
      setSubmitting(false);
    }
  }

  async function giveUp() {
    if (!sessionId || !token) return;
    try {
      const res = await fetch("/api/connections/give-up", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      const data: GiveUpResponse = await res.json();
      if (!res.ok) return;
      setFinalGrid(data.grid);
      setFinalScore(0);
      setEndReason("gaveUp");
      setPhase("done");
      refreshPlayer();
    } catch {
      // leave them on the board — they can try the button again
    }
  }

  if (!ready) return null;
  if (!player) return <LoginGate />;

  const endMessage =
    endReason === "gaveUp" ? "Gave up" : endReason === "mistakes" ? "Out of guesses" : "All groups found!";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 py-8">
      <div className="mb-6 w-full">
        <h1 className="font-mono text-2xl font-bold tracking-tight">CONNECTIONS</h1>
        <p className="text-xs text-text-muted">
          Pick 4 words that belong to the same group, then submit.
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
          <div className="mb-4 flex w-full items-center justify-between font-mono text-xs text-text-muted">
            <span>
              {solvedCount} / {TOTAL_CATEGORIES} groups &middot; {score} pts
            </span>
            <span className="flex items-center gap-2">
              Mistakes remaining:
              <span className="flex gap-1">
                {Array.from({ length: MAX_MISTAKES }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full ${
                      i < mistakesRemaining ? "bg-text-muted" : "bg-surface-2"
                    }`}
                  />
                ))}
              </span>
            </span>
          </div>

          <div
            className="mb-4 grid w-full gap-1.5"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
          >
            {displayOrder.map((pos) => {
              const word = words[pos];
              const isSolved = solvedPositions.has(pos);
              const isSelected = selected.includes(pos);
              const isWrong = wrongFlash.includes(pos);
              let variant = "border-border bg-surface hover:border-purple";
              if (isSolved) variant = "border-purple bg-purple/10 text-purple-light";
              else if (isWrong) variant = "border-orange bg-orange/10";
              else if (isSelected) variant = "border-purple-light bg-purple/20";
              return (
                <button
                  key={pos}
                  onClick={() => toggleCell(pos)}
                  disabled={isSolved || submitting}
                  className={`flex min-h-14 items-center justify-center rounded-md border-2 px-1 py-2 text-center text-[10px] leading-tight transition-colors sm:text-xs ${variant}`}
                >
                  {word}
                </button>
              );
            })}
          </div>

          <p className="mb-3 font-mono text-xs text-text-muted">
            {feedback ?? `${selected.length} / ${GROUP_SIZE} selected`}
          </p>

          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setDisplayOrder((prev) => shuffle(prev))}
              disabled={submitting}
              className="rounded-md border border-border px-4 py-2 font-mono text-xs text-text-muted transition hover:border-purple disabled:opacity-50"
            >
              Shuffle
            </button>
            <button
              onClick={() => setSelected([])}
              disabled={selected.length === 0 || submitting}
              className="rounded-md border border-border px-4 py-2 font-mono text-xs text-text-muted transition hover:border-purple disabled:cursor-not-allowed disabled:opacity-40"
            >
              Deselect All
            </button>
            <button
              onClick={submitGroup}
              disabled={selected.length !== GROUP_SIZE || submitting}
              className="rounded-md bg-purple px-4 py-2 font-mono text-xs font-semibold text-white transition hover:bg-purple-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit
            </button>
          </div>

          <div className="mt-4 w-full">
            <GiveUpControl onConfirm={giveUp} disabled={submitting} />
          </div>
        </>
      )}

      {phase === "done" && (
        <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-mono text-lg font-bold">{endMessage}</p>
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
