"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import LoginGate from "@/components/LoginGate";
import { renderStrokes, type Stroke, type Point } from "@/lib/pictionary-canvas";

const POLL_MS = 400;
const SYNC_MS = 250;
const CANVAS_W = 500;
const CANVAS_H = 360;

type StateResponse =
  | { status: "waiting" }
  | { status: "locked" }
  | {
      status: "active";
      roundId: string;
      isDrawer: boolean;
      word?: string;
      wordLength?: number;
      strokes: Stroke[];
      remainingMs: number;
      durationMs: number;
      totalGuessers?: number;
      correctGuessersCount?: number;
      hasGuessedCorrectly?: boolean;
      lastGuess?: string;
    }
  | {
      status: "round_ended";
      roundId: string;
      isDrawer: boolean;
      word: string;
      strokes: Stroke[];
      correctGuessersCount: number;
      pointsEarned?: number;
      correct?: boolean;
    };

export default function PictionaryPage() {
  const { player, token, ready, refreshPlayer } = useAuth();
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [state, setState] = useState<StateResponse | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const committedStrokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Point[] | null>(null);
  const dirtyRef = useRef(false);
  const roundIdRef = useRef<string | null>(null);
  const hasSeededOwnStrokesRef = useRef(false);

  const redrawLocal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const strokes = currentStrokeRef.current
      ? [...committedStrokesRef.current, { points: currentStrokeRef.current }]
      : committedStrokesRef.current;
    renderStrokes(ctx, strokes, CANVAS_W, CANVAS_H);
  }, []);

  // Poll shared state
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/pictionary/state", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setBlockedMessage(data.error ?? "Could not load Pictionary.");
          return;
        }
        setState(data);
        if (data.status === "active" || data.status === "round_ended") {
          roundIdRef.current = data.roundId;
        }
        // guesser (and anyone before a round starts) renders from polled strokes
        if (data.status === "active" && !data.isDrawer) {
          committedStrokesRef.current = data.strokes;
          currentStrokeRef.current = null;
          redrawLocal();
        } else if (data.status === "active" && data.isDrawer && !hasSeededOwnStrokesRef.current) {
          // Resuming after a refresh mid-drawing: recover whatever was last
          // synced instead of starting from a blank canvas.
          hasSeededOwnStrokesRef.current = true;
          committedStrokesRef.current = data.strokes;
          redrawLocal();
        } else if (data.status === "round_ended") {
          committedStrokesRef.current = data.strokes;
          currentStrokeRef.current = null;
          redrawLocal();
        }
        if (data.status === "round_ended" && !data.isDrawer) refreshPlayer();
      } catch {
        // transient network blip — next poll will retry
      }
    }
    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Drawer: periodically push local strokes to the server
  useEffect(() => {
    if (!token || !state || state.status !== "active" || !state.isDrawer) return;
    const id = window.setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      fetch("/api/pictionary/stroke", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roundId: roundIdRef.current, strokes: committedStrokesRef.current }),
      }).catch(() => {});
    }, SYNC_MS);
    return () => window.clearInterval(id);
  }, [token, state]);

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!state || state.status !== "active" || !state.isDrawer) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    currentStrokeRef.current = [{ x, y }];
    redrawLocal();
  }

  function moveStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!currentStrokeRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    currentStrokeRef.current.push({ x, y });
    redrawLocal();
  }

  function endStroke() {
    if (!currentStrokeRef.current) return;
    committedStrokesRef.current = [...committedStrokesRef.current, { points: currentStrokeRef.current }];
    currentStrokeRef.current = null;
    dirtyRef.current = true;
    redrawLocal();
  }

  async function submitGuess() {
    if (!guessInput.trim() || !token) return;
    setGuessFeedback(null);
    const res = await fetch("/api/pictionary/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roundId: roundIdRef.current, guess: guessInput }),
    });
    const data = await res.json();
    if (res.ok) {
      setGuessFeedback(data.correct ? "Correct!" : "Not quite, keep trying.");
      setGuessInput("");
    }
  }

  if (!ready) return null;
  if (!player) return <LoginGate />;

  if (blockedMessage) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
        <p className="text-sm text-text-muted">{blockedMessage}</p>
        <Link
          href="/"
          className="w-full rounded-md bg-purple px-4 py-2 text-center font-mono font-semibold text-white transition hover:bg-purple-dark"
        >
          Back to games
        </Link>
      </div>
    );
  }

  if (!state || state.status === "waiting" || state.status === "locked") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <h1 className="font-mono text-2xl font-bold tracking-tight">PICTIONARY</h1>
        <p className="text-sm text-text-muted">
          {state?.status === "locked"
            ? "This game isn't open yet. Wait for the host to unlock it."
            : "Waiting for the host to start a round..."}
        </p>
      </div>
    );
  }

  const secondsLeft = state.status === "active" ? Math.ceil(state.remainingMs / 1000) : 0;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-8">
      <div className="mb-4 w-full">
        <h1 className="font-mono text-2xl font-bold tracking-tight">PICTIONARY</h1>
        {state.status === "active" && (
          <p className="text-xs text-text-muted">
            {state.isDrawer ? "Draw this!" : "Guess what's being drawn"} &middot; {secondsLeft}s left
          </p>
        )}
      </div>

      {state.status === "active" && state.isDrawer && (
        <p className="mb-3 font-mono text-xl font-bold text-purple-light">{state.word}</p>
      )}
      {state.status === "active" && !state.isDrawer && (
        <p className="mb-3 font-mono text-sm text-text-muted">{state.wordLength} letters</p>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="mb-4 w-full touch-none rounded-lg border-2 border-border bg-surface-2"
        onPointerDown={startStroke}
        onPointerMove={moveStroke}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
      />

      {state.status === "active" && !state.isDrawer && (
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full gap-2">
            <input
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitGuess()}
              disabled={state.hasGuessedCorrectly}
              placeholder={state.hasGuessedCorrectly ? "You got it!" : "Your guess"}
              className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-text outline-none focus:border-purple disabled:opacity-50"
            />
            <button
              onClick={submitGuess}
              disabled={state.hasGuessedCorrectly}
              className="rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
            >
              Guess
            </button>
          </div>
          {guessFeedback && <p className="text-center text-sm text-orange">{guessFeedback}</p>}
        </div>
      )}

      {state.status === "active" && state.isDrawer && (
        <p className="text-center text-sm text-text-muted">
          {state.correctGuessersCount ?? 0} / {state.totalGuessers ?? 0} guessed it so far
        </p>
      )}

      {state.status === "round_ended" && (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center">
          <p className="font-mono text-lg font-bold">Round over!</p>
          <p className="text-sm text-text-muted">
            The word was <span className="font-mono font-bold text-purple-light">{state.word}</span>
          </p>
          {!state.isDrawer && (
            <p className="font-mono text-sm text-orange">
              {state.correct ? "You got it! " : "Didn't quite get it. "}+{state.pointsEarned ?? 0} points
            </p>
          )}
          <p className="text-xs text-text-muted">Waiting for the host to start the next round...</p>
        </div>
      )}
    </div>
  );
}
