"use client";

import { useState } from "react";
import Link from "next/link";
import { getLastPlayerName, setLastPlayerName } from "@/lib/client-name";
import PlayerBadge from "@/components/PlayerBadge";

type Phase = "name" | "playing" | "answered";

interface Result {
  correct: boolean;
  lieIndex: number;
  pointsAwarded: number;
}

export default function TwoTruthsPage() {
  const [phase, setPhase] = useState<Phase>("name");
  const [nameInput, setNameInput] = useState(() =>
    typeof window !== "undefined" ? getLastPlayerName() : ""
  );
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [totalPoints, setTotalPoints] = useState(0);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [statements, setStatements] = useState<string[]>([]);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startRound() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError("Enter a name first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/twotruths/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start round.");
        return;
      }
      setRoundId(data.roundId);
      setStatements(data.statements);
      setDisplayName(data.player.displayName);
      setTotalPoints(data.player.totalPoints);
      setChosenIndex(null);
      setResult(null);
      setLastPlayerName(trimmed);
      setPhase("playing");
    } finally {
      setLoading(false);
    }
  }

  async function pickStatement(index: number) {
    if (!roundId || loading) return;
    setLoading(true);
    setChosenIndex(index);
    try {
      const res = await fetch("/api/twotruths/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, chosenIndex: index }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit answer.");
        setChosenIndex(null);
        return;
      }
      setResult(data);
      setTotalPoints(data.totalPoints);
      setPhase("answered");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-8">
      <div className="mb-6 flex w-full items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">TWO TRUTHS &amp; A LIE</h1>
          <p className="text-xs text-text-muted">Spot the false statement.</p>
        </div>
        <Link
          href="/games/two-truths/leaderboard"
          className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-text-muted transition hover:border-purple hover:text-purple"
        >
          Leaderboard
        </Link>
      </div>

      {phase === "name" && (
        <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6">
          <p className="text-center text-sm text-text-muted">
            Enter your name, then pick the statement you think is false.
          </p>
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startRound()}
            maxLength={30}
            placeholder="Your name"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-center font-mono text-text outline-none focus:border-purple"
          />
          {error && <p className="text-sm text-orange">{error}</p>}
          <button
            onClick={startRound}
            disabled={loading}
            className="w-full rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
          >
            {loading ? "Loading..." : "Start"}
          </button>
        </div>
      )}

      {phase !== "name" && (
        <>
          <PlayerBadge displayName={displayName} totalPoints={totalPoints} />

          <div className="flex w-full flex-col gap-3">
            {statements.map((statement, i) => {
              let variant = "border-border bg-surface hover:border-purple";
              if (phase === "answered" && result) {
                if (i === result.lieIndex) {
                  variant = "border-orange bg-orange/10";
                } else if (i === chosenIndex) {
                  variant = "border-purple bg-purple/10";
                } else {
                  variant = "border-border bg-surface opacity-60";
                }
              } else if (i === chosenIndex) {
                variant = "border-purple bg-surface";
              }
              return (
                <button
                  key={i}
                  onClick={() => phase === "playing" && pickStatement(i)}
                  disabled={phase !== "playing" || loading}
                  className={`rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors ${variant}`}
                >
                  <span className="mr-2 font-mono text-text-muted">{i + 1}.</span>
                  {statement}
                  {phase === "answered" && i === result?.lieIndex && (
                    <span className="ml-2 font-mono text-xs text-orange">LIE</span>
                  )}
                </button>
              );
            })}
          </div>

          {phase === "answered" && result && (
            <div className="mt-5 flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
              <p className="font-mono text-lg font-bold">
                {result.correct ? "Correct!" : "Not quite."}
              </p>
              <p className="font-mono text-sm text-orange">+{result.pointsAwarded} points</p>
              <div className="mt-2 flex w-full gap-2">
                <button
                  onClick={startRound}
                  disabled={loading}
                  className="flex-1 rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
                >
                  Play Again
                </button>
                <Link
                  href="/games/two-truths/leaderboard"
                  className="flex-1 rounded-md border border-border px-4 py-2 text-center font-mono font-semibold text-text transition hover:border-purple hover:text-purple"
                >
                  Leaderboard
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
