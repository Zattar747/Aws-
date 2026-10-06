"use client";

import { useEffect, useState } from "react";

interface Entry {
  displayName: string;
  totalPoints: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries))
      .catch(() => setEntries([]));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold tracking-tight">LEADERBOARD</h1>
        <p className="text-xs text-text-muted">
          Ties go to whoever reached that score first, not alphabetical order.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[3rem_1fr_6rem] gap-2 border-b border-border bg-surface-2 px-4 py-2 font-mono text-xs uppercase text-text-muted">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Points</span>
        </div>

        {entries === null && <p className="p-6 text-center text-sm text-text-muted">Loading...</p>}
        {entries?.length === 0 && (
          <p className="p-6 text-center text-sm text-text-muted">No players yet. Be the first!</p>
        )}
        {entries?.map((entry, i) => (
          <div
            key={`${entry.displayName}-${i}`}
            className="grid grid-cols-[3rem_1fr_6rem] gap-2 border-b border-border px-4 py-2.5 font-mono text-sm last:border-0"
          >
            <span className={i < 3 ? "font-bold text-purple-light" : "text-text-muted"}>{i + 1}</span>
            <span className="truncate">{entry.displayName}</span>
            <span className="text-right text-orange">{entry.totalPoints}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
