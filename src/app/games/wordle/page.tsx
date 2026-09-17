"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LetterState } from "@/lib/wordle-logic";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "back"],
];

type Phase = "loading" | "playing" | "ended";

interface EndInfo {
  status: "won" | "lost";
  answer: string;
  guessesUsed: number;
}

const tileClasses: Record<LetterState | "empty" | "typing", string> = {
  empty: "border-border bg-surface text-text",
  typing: "border-text-muted bg-surface text-text",
  correct: "border-purple bg-purple text-white",
  present: "border-orange bg-orange text-[#1a1200]",
  absent: "border-border bg-surface-2 text-text-muted",
};

const keyClasses: Record<LetterState | "unknown", string> = {
  unknown: "bg-surface-2 text-text hover:bg-surface",
  correct: "bg-purple text-white",
  present: "bg-orange text-[#1a1200]",
  absent: "bg-[#232333] text-text-muted",
};

export default function WordlePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [gameId, setGameId] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<LetterState[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [shakeRow, setShakeRow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [endInfo, setEndInfo] = useState<EndInfo | null>(null);

  const keyStates = useMemo(() => {
    const states: Record<string, LetterState> = {};
    guesses.forEach((guess, gi) => {
      guess.split("").forEach((letter, li) => {
        const state = feedback[gi]?.[li];
        if (!state) return;
        const rank = { absent: 0, present: 1, correct: 2 };
        if (!states[letter] || rank[state] > rank[states[letter]]) {
          states[letter] = state;
        }
      });
    });
    return states;
  }, [guesses, feedback]);

  const flashMessage = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((m) => (m === text ? null : m)), 2000);
  }, []);

  const startGame = useCallback(async () => {
    setLoading(true);
    setPhase("loading");
    try {
      const res = await fetch("/api/wordle/new", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        flashMessage(data.error ?? "Could not start game.");
        return;
      }
      setGameId(data.gameId);
      setGuesses([]);
      setFeedback([]);
      setCurrentGuess("");
      setEndInfo(null);
      setPhase("playing");
    } finally {
      setLoading(false);
    }
  }, [flashMessage]);

  useEffect(() => {
    // Deferred to a microtask: startGame() sets state synchronously as its
    // first statement (before any await), which would otherwise run inside
    // this effect's own synchronous execution.
    queueMicrotask(() => void startGame());
  }, [startGame]);

  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== WORD_LENGTH || !gameId || loading) {
      if (currentGuess.length !== WORD_LENGTH) {
        setShakeRow(true);
        window.setTimeout(() => setShakeRow(false), 400);
        flashMessage("Not enough letters.");
      }
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wordle/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, guess: currentGuess }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShakeRow(true);
        window.setTimeout(() => setShakeRow(false), 400);
        flashMessage(data.error ?? "Invalid guess.");
        return;
      }
      setGuesses((g) => [...g, currentGuess]);
      setFeedback((f) => [...f, data.result]);
      setCurrentGuess("");
      if (data.status !== "in_progress") {
        setEndInfo({
          status: data.status,
          answer: data.answer,
          guessesUsed: data.guessesUsed,
        });
        setPhase("ended");
      }
    } finally {
      setLoading(false);
    }
  }, [currentGuess, gameId, loading, flashMessage]);

  useEffect(() => {
    if (phase !== "playing") return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        submitGuess();
      } else if (e.key === "Backspace") {
        setCurrentGuess((g) => g.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setCurrentGuess((g) => (g.length < WORD_LENGTH ? g + e.key.toLowerCase() : g));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, submitGuess]);

  function onVirtualKey(key: string) {
    if (key === "enter") {
      submitGuess();
    } else if (key === "back") {
      setCurrentGuess((g) => g.slice(0, -1));
    } else {
      setCurrentGuess((g) => (g.length < WORD_LENGTH ? g + key : g));
    }
  }

  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => {
    if (i < guesses.length) return { letters: guesses[i].split(""), states: feedback[i] };
    if (i === guesses.length) return { letters: currentGuess.split(""), states: null };
    return { letters: [], states: null };
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-8">
      <div className="mb-6 w-full">
        <h1 className="font-mono text-2xl font-bold tracking-tight">AWS WORDLE</h1>
        <p className="text-xs text-text-muted">Guess the 5-letter word in 6 tries.</p>
      </div>

      {phase === "loading" && !endInfo && (
        <p className="text-sm text-text-muted">Loading...</p>
      )}

      {phase !== "loading" && (
        <>
          <div className="mb-6 flex flex-col gap-1.5">
            {rows.map((row, ri) => (
              <div
                key={ri}
                className={`flex gap-1.5 ${shakeRow && ri === guesses.length ? "animate-[shake_0.4s]" : ""}`}
              >
                {Array.from({ length: WORD_LENGTH }, (_, ci) => {
                  const letter = row.letters[ci];
                  const state = row.states?.[ci];
                  const variant = state ?? (letter ? "typing" : "empty");
                  return (
                    <div
                      key={ci}
                      className={`flex h-12 w-12 items-center justify-center rounded-md border-2 font-mono text-xl font-bold uppercase transition-colors ${tileClasses[variant]}`}
                    >
                      {letter ?? ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mb-4 h-6 text-sm font-medium text-orange">{message ?? " "}</div>

          {phase === "playing" && (
            <div className="flex w-full flex-col gap-1.5">
              {KEY_ROWS.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-1.5">
                  {row.map((key) => {
                    const isWide = key === "enter" || key === "back";
                    const label = key === "enter" ? "Enter" : key === "back" ? "⌫" : key;
                    const variant = keyStates[key] ?? "unknown";
                    return (
                      <button
                        key={key}
                        onClick={() => onVirtualKey(key)}
                        className={`flex h-11 items-center justify-center rounded-md font-mono text-xs font-semibold uppercase transition-colors ${isWide ? "px-3" : "w-8"} ${keyClasses[variant]}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {phase === "ended" && endInfo && (
            <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
              <p className="font-mono text-lg font-bold">
                {endInfo.status === "won" ? "You got it!" : "Out of guesses"}
              </p>
              <p className="text-sm text-text-muted">
                The word was{" "}
                <span className="font-mono font-bold uppercase text-purple-light">
                  {endInfo.answer}
                </span>
              </p>
              {endInfo.status === "won" && (
                <p className="text-sm text-text-muted">
                  Solved in {endInfo.guessesUsed} guess{endInfo.guessesUsed === 1 ? "" : "es"}
                </p>
              )}
              <button
                onClick={startGame}
                disabled={loading}
                className="mt-2 w-full rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
              >
                Play Again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
