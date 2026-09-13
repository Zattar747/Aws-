"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Entry {
  playerName: string;
  bestScore: number;
}

export default function QuizLeaderboardPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    fetch("/api/quiz/leaderboard")
      .then((res) => res.json())
      .then((data) => setEntries(data.entries))
      .catch(() => setEntries([]));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">LEADERBOARD</h1>
          <p className="text-xs text-text-muted">Best single-session trivia score.</p>
        </div>
        <Link
          href="/games/quiz"
          className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-text-muted transition hover:border-purple hover:text-purple"
        >
          Play
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[3rem_1fr_6rem] gap-2 border-b border-border bg-surface-2 px-4 py-2 font-mono text-xs uppercase text-text-muted">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Score</span>
        </div>

        {entries === null && (
          <p className="p-6 text-center text-sm text-text-muted">Loading...</p>
        )}
        {entries?.length === 0 && (
          <p className="p-6 text-center text-sm text-text-muted">
            No finished games yet. Be the first to play!
          </p>
        )}
        {entries?.map((entry, i) => (
          <div
            key={`${entry.playerName}-${i}`}
            className="grid grid-cols-[3rem_1fr_6rem] gap-2 border-b border-border px-4 py-2.5 font-mono text-sm last:border-0"
          >
            <span className={i < 3 ? "font-bold text-purple-light" : "text-text-muted"}>
              {i + 1}
            </span>
            <span className="truncate">{entry.playerName}</span>
            <span className="text-right text-orange">{entry.bestScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
