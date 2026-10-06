"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import LoginGate from "@/components/LoginGate";

interface GameStatus {
  status: "not_started" | "in_progress" | "completed" | string;
  pointsEarned: number;
  locked: boolean;
}

const GAMES: { key: string; slug: string; name: string; description: string }[] = [
  { key: "wordle", slug: "wordle", name: "AWS Wordle", description: "Guess the 5-letter tech word in 6 tries." },
  { key: "trivia", slug: "trivia", name: "AWS Trivia", description: "A one-shot quiz on AWS fundamentals." },
  { key: "connections", slug: "connections", name: "Connections", description: "Group the related words." },
  { key: "pictionary", slug: "pictionary", name: "Pictionary", description: "The final group game — draw and guess." },
];

export default function Home() {
  const { player, token, ready } = useAuth();
  const [games, setGames] = useState<Record<string, GameStatus> | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/players/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setGames(d.games))
      .catch(() => {});
  }, [token]);

  if (!ready) return null;

  if (!player) {
    return <LoginGate />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-border px-5 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-border">
            <Image src="/brand/chip-logo.jpg" alt="AWS Student Builder Club logo" fill className="object-cover" priority />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome, <span className="text-purple-light">{player.displayName}</span>
          </h1>
          <p className="font-mono text-sm text-text-muted">
            {player.totalPoints} points so far &middot;{" "}
            <Link href="/leaderboard" className="text-purple-light hover:underline">
              view leaderboard
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-10">
        <h2 className="mb-6 font-mono text-sm uppercase tracking-widest text-text-muted">
          Games &mdash; each one plays once
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {GAMES.map((game) => {
            const state = games?.[game.key];
            const completed = state?.status === "completed";
            const locked = state?.locked;
            const disabled = completed || locked;
            const card = (
              <div
                className={`flex h-full flex-col justify-between rounded-xl border border-border bg-surface p-5 transition ${
                  disabled ? "opacity-60" : "hover:border-purple"
                }`}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-mono text-lg font-bold">{game.name}</h3>
                    {locked && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-text-muted">
                        Locked
                      </span>
                    )}
                    {completed && (
                      <span className="rounded-full border border-purple px-2 py-0.5 text-[10px] uppercase text-purple-light">
                        Played
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted">{game.description}</p>
                </div>
                {completed && (
                  <p className="mt-4 font-mono text-xs text-orange">+{state.pointsEarned} points earned</p>
                )}
              </div>
            );
            return disabled ? (
              <div key={game.key}>{card}</div>
            ) : (
              <Link key={game.key} href={`/games/${game.slug}`}>
                {card}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
