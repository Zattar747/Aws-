"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ShapeIcon from "@/components/ShapeIcon";
import { TILE_STYLES } from "@/lib/quiz-tiles";

interface StateResponse {
  status: "lobby" | "question" | "reveal" | "ended";
  currentQuestion: number;
  totalQuestions: number;
  hasAnswered?: boolean;
  correctIndex?: number;
  myResult?: { choiceIndex: number; correct: number; pointsEarned: number } | null;
  leaderboard?: { displayName: string; score: number }[];
}

export default function QuizPlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const searchParams = useSearchParams();
  const playerKey = searchParams.get("playerKey") ?? "";
  const displayName = searchParams.get("name") ?? "";

  const [data, setData] = useState<StateResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{ correct: boolean; pointsEarned: number } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(
        `/api/quiz/state?gameId=${gameId}&playerKey=${encodeURIComponent(playerKey)}`
      );
      if (!res.ok || cancelled) return;
      const json: StateResponse = await res.json();
      if (cancelled) return;
      setData(json);
      if (json.status === "question") {
        // a page refresh after already answering shouldn't re-show buttons
        setPendingChoice((prev) => (json.hasAnswered ? prev ?? -1 : prev));
      } else {
        setPendingChoice(null);
      }
    }
    poll();
    const id = window.setInterval(poll, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [gameId, playerKey]);

  async function submitAnswer(choiceIndex: number) {
    if (!data || submitting || pendingChoice !== null) return;
    setPendingChoice(choiceIndex);
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz/player/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          playerKey,
          questionIndex: data.currentQuestion,
          choiceIndex,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setLastResult({ correct: json.correct, pointsEarned: json.pointsEarned });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) {
    return <div className="flex flex-1 items-center justify-center text-text-muted">Loading...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-8">
      <p className="mb-4 font-mono text-xs text-text-muted">
        Playing as <span className="text-text">{displayName}</span>
      </p>

      {data.status === "lobby" && (
        <p className="text-center text-lg text-text-muted">
          You&apos;re in! Waiting for the host to start...
        </p>
      )}

      {data.status === "question" && (
        <>
          {pendingChoice === null ? (
            <>
              <p className="mb-6 text-center text-sm text-text-muted">Look at the shared screen, then tap your answer</p>
              <div className="grid w-full grid-cols-2 gap-3">
                {TILE_STYLES.map((tile, i) => (
                  <button
                    key={i}
                    onClick={() => submitAnswer(i)}
                    className="flex h-28 items-center justify-center rounded-lg transition active:scale-95"
                    style={{ backgroundColor: tile.color }}
                  >
                    <ShapeIcon shape={tile.shape} size={40} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-lg text-text-muted">Answer submitted! Waiting for other players...</p>
          )}
        </>
      )}

      {data.status === "reveal" && (
        <div className="flex flex-col items-center gap-3 text-center">
          {lastResult ? (
            <>
              <p className="font-mono text-2xl font-bold">
                {lastResult.correct ? "Correct! 🎉" : "Not quite"}
              </p>
              <p className="font-mono text-sm text-orange">+{lastResult.pointsEarned} points</p>
            </>
          ) : (
            <p className="text-lg text-text-muted">Time&apos;s up!</p>
          )}
        </div>
      )}

      {data.status === "ended" && (
        <div className="flex w-full flex-col items-center gap-4 text-center">
          <p className="font-mono text-2xl font-bold">Game Over!</p>
          <div className="flex w-full flex-col gap-2">
            {(data.leaderboard ?? []).map((p, i) => (
              <div
                key={p.displayName}
                className={`flex items-center justify-between rounded-lg border px-4 py-2 font-mono text-sm ${
                  p.displayName === displayName
                    ? "border-purple bg-purple/10"
                    : "border-border bg-surface"
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
