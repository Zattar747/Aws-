"use client";

import { useState } from "react";
import Link from "next/link";
import { getLastPlayerName, setLastPlayerName } from "@/lib/client-name";

type Phase = "mode" | "name" | "playing" | "ended";
type Mode = "single" | "2p";
type CardStatus = "hidden" | "revealed" | "matched";

interface CardState {
  status: CardStatus;
  label?: string;
}

interface PlayerInfo {
  nameKey: string;
  displayName: string;
  totalPoints: number;
}

export default function MemoryPage() {
  const [phase, setPhase] = useState<Phase>("mode");
  const [mode, setMode] = useState<Mode>("single");
  const [player1Input, setPlayer1Input] = useState(() =>
    typeof window !== "undefined" ? getLastPlayerName() : ""
  );
  const [player2Input, setPlayer2Input] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [gameId, setGameId] = useState<string | null>(null);
  const [player1, setPlayer1] = useState<PlayerInfo | null>(null);
  const [player2, setPlayer2] = useState<PlayerInfo | null>(null);
  const [cards, setCards] = useState<CardState[]>([]);
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState({ "1": 0, "2": 0 });
  const [movesUsed, setMovesUsed] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | "tie" | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState<Record<string, number> | null>(null);

  function chooseMode(m: Mode) {
    setMode(m);
    setError(null);
    setPhase("name");
  }

  async function startGame() {
    const p1 = player1Input.trim();
    const p2 = player2Input.trim();
    if (!p1) {
      setError("Enter a name for player 1.");
      return;
    }
    if (mode === "2p" && !p2) {
      setError("Enter a name for player 2.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/memory/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, player1Name: p1, player2Name: mode === "2p" ? p2 : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start game.");
        return;
      }
      setGameId(data.gameId);
      setPlayer1(data.player1);
      setPlayer2(data.player2);
      setCards(Array.from({ length: data.cardCount }, () => ({ status: "hidden" as CardStatus })));
      setScores({ "1": 0, "2": 0 });
      setMovesUsed(0);
      setCurrentPlayer(1);
      setWinner(null);
      setPointsAwarded(null);
      setLastPlayerName(p1);
      setPhase("playing");
    } finally {
      setLoading(false);
    }
  }

  async function onCardClick(index: number) {
    if (busy || !gameId || cards[index]?.status !== "hidden") return;
    setBusy(true);
    try {
      const res = await fetch("/api/memory/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, index }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not flip card.");
        setBusy(false);
        return;
      }

      if (data.phase === "first") {
        setCards((prev) =>
          prev.map((c, i) => (i === index ? { status: "revealed", label: data.label } : c))
        );
        setBusy(false);
        return;
      }

      const [i1, i2] = data.indices as [number, number];
      const [l1, l2] = data.labels as [string, string];
      const finalStatus: CardStatus = data.matched ? "matched" : "revealed";
      setCards((prev) =>
        prev.map((c, i) => {
          if (i === i1) return { status: finalStatus, label: l1 };
          if (i === i2) return { status: finalStatus, label: l2 };
          return c;
        })
      );
      setScores(data.scores);
      setMovesUsed(data.movesUsed);
      setCurrentPlayer(data.currentPlayer);

      if (data.status === "done") {
        setWinner(data.winner ?? null);
        setPointsAwarded(data.pointsAwarded);
        setPhase("ended");
        setBusy(false);
        return;
      }

      if (data.matched) {
        setBusy(false);
      } else {
        window.setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === i1 || i === i2 ? { status: "hidden" } : c))
          );
          setBusy(false);
        }, 800);
      }
    } catch {
      setBusy(false);
    }
  }

  function playAgain() {
    setPhase("name");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-8">
      <div className="mb-6 flex w-full items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">MEMORY MATCH</h1>
          <p className="text-xs text-text-muted">Flip two cards, find every pair.</p>
        </div>
        <Link
          href="/games/memory/leaderboard"
          className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-text-muted transition hover:border-purple hover:text-purple"
        >
          Game Leaderboard
        </Link>
      </div>

      {phase === "mode" && (
        <div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface p-6">
          <p className="text-center text-sm text-text-muted">Choose how you want to play.</p>
          <button
            onClick={() => chooseMode("single")}
            className="rounded-md border-2 border-border px-4 py-3 text-center font-mono font-semibold transition hover:border-purple"
          >
            Single Player
          </button>
          <button
            onClick={() => chooseMode("2p")}
            className="rounded-md border-2 border-border px-4 py-3 text-center font-mono font-semibold transition hover:border-purple"
          >
            2 Player (same device)
          </button>
        </div>
      )}

      {phase === "name" && (
        <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6">
          <p className="text-center text-sm text-text-muted">
            {mode === "single" ? "Enter your name to start." : "Enter both players' names."}
          </p>
          <input
            autoFocus
            value={player1Input}
            onChange={(e) => setPlayer1Input(e.target.value)}
            maxLength={30}
            placeholder={mode === "2p" ? "Player 1 name" : "Your name"}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-center font-mono text-text outline-none focus:border-purple"
          />
          {mode === "2p" && (
            <input
              value={player2Input}
              onChange={(e) => setPlayer2Input(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startGame()}
              maxLength={30}
              placeholder="Player 2 name"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-center font-mono text-text outline-none focus:border-purple"
            />
          )}
          {error && <p className="text-sm text-orange">{error}</p>}
          <div className="flex w-full gap-2">
            <button
              onClick={() => setPhase("mode")}
              className="rounded-md border border-border px-4 py-2 font-mono text-text-muted transition hover:border-purple hover:text-purple"
            >
              Back
            </button>
            <button
              onClick={startGame}
              disabled={loading}
              className="flex-1 rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
            >
              {loading ? "Starting..." : "Start Game"}
            </button>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div className="mb-4 flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs">
            {mode === "single" ? (
              <>
                <span className="text-text-muted">
                  Playing as <span className="text-text">{player1?.displayName}</span>
                </span>
                <span className="text-purple-light">{movesUsed} moves</span>
              </>
            ) : (
              <>
                <span className={currentPlayer === 1 ? "text-purple-light" : "text-text-muted"}>
                  {player1?.displayName}: {scores["1"]}
                </span>
                <span className="text-text-muted">Turn: P{currentPlayer}</span>
                <span className={currentPlayer === 2 ? "text-purple-light" : "text-text-muted"}>
                  {player2?.displayName}: {scores["2"]}
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {cards.map((card, i) => (
              <button
                key={i}
                onClick={() => onCardClick(i)}
                disabled={busy || card.status !== "hidden"}
                className={`flex h-16 items-center justify-center rounded-md border-2 font-mono text-[11px] font-bold uppercase transition-colors ${
                  card.status === "matched"
                    ? "border-purple bg-purple text-white"
                    : card.status === "revealed"
                      ? "border-orange bg-orange text-[#1a1200]"
                      : "border-border bg-surface-2 text-text-muted hover:border-purple"
                }`}
              >
                {card.status === "hidden" ? "?" : card.label}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === "ended" && (
        <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          {mode === "single" ? (
            <>
              <p className="font-mono text-lg font-bold">All pairs matched!</p>
              <p className="text-sm text-text-muted">{movesUsed} moves</p>
              <p className="font-mono text-sm text-orange">
                +{pointsAwarded?.player1 ?? 0} points
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-lg font-bold">
                {winner === "tie"
                  ? "It's a tie!"
                  : `${winner === 1 ? player1?.displayName : player2?.displayName} wins!`}
              </p>
              <p className="text-sm text-text-muted">
                {player1?.displayName}: {scores["1"]} pairs &middot; {player2?.displayName}:{" "}
                {scores["2"]} pairs
              </p>
              <p className="font-mono text-sm text-orange">
                {player1?.displayName} +{pointsAwarded?.player1 ?? 0} &middot; {player2?.displayName} +
                {pointsAwarded?.player2 ?? 0}
              </p>
            </>
          )}
          <div className="mt-2 flex w-full gap-2">
            <button
              onClick={playAgain}
              className="flex-1 rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark"
            >
              Play Again
            </button>
            <Link
              href="/games/memory/leaderboard"
              className="flex-1 rounded-md border border-border px-4 py-2 text-center font-mono font-semibold text-text transition hover:border-purple hover:text-purple"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
