"use client";

import { useEffect, useRef, useState } from "react";
import AwsServiceIcon from "@/components/AwsServiceIcon";
import type { TriviaIcon } from "@/lib/trivia-questions";

type Phase = "levels" | "loading" | "question" | "reveal";
type Level = "easy" | "medium" | "hard";

interface QuestionData {
  level: Level;
  questionIndex: number;
  optionOrder: number[];
  question: string;
  options: string[];
  icon: TriviaIcon | null;
  durationMs: number;
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
}

const LEVEL_LABELS: Record<Level, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function TriviaPage() {
  const [phase, setPhase] = useState<Phase>("levels");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuestionData | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [liveRemainingMs, setLiveRemainingMs] = useState(0);

  const questionStartRef = useRef(0);
  const submittedRef = useRef(false);

  async function pickLevel(level: Level) {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/trivia/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not load a question.");
        setPhase("levels");
        return;
      }
      setData(json);
      setSelectedChoice(null);
      setResult(null);
      submittedRef.current = false;
      questionStartRef.current = Date.now();
      setLiveRemainingMs(json.durationMs);
      setPhase("question");
    } catch {
      setError("Could not load a question. Check your connection.");
      setPhase("levels");
    }
  }

  useEffect(() => {
    if (phase !== "question" || !data) return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, data.durationMs - (Date.now() - questionStartRef.current));
      setLiveRemainingMs(remaining);
      if (remaining <= 0 && !submittedRef.current) {
        submitAnswer(null);
      }
    }, 150);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, data?.questionIndex]);

  async function submitAnswer(choiceIndex: number | null) {
    if (!data || submittedRef.current) return;
    submittedRef.current = true;
    setSelectedChoice(choiceIndex);
    try {
      const res = await fetch("/api/trivia/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: data.level,
          questionIndex: data.questionIndex,
          optionOrder: data.optionOrder,
          chosenIndex: choiceIndex,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not submit answer.");
        submittedRef.current = false;
        setSelectedChoice(null);
        return;
      }
      setResult(json);
      setPhase("reveal");
    } catch {
      submittedRef.current = false;
      setSelectedChoice(null);
      setError("Could not submit answer. Check your connection.");
    }
  }

  function backToLevels() {
    setData(null);
    setResult(null);
    setSelectedChoice(null);
    setPhase("levels");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-8">
      <div className="mb-6 w-full">
        <h1 className="font-mono text-2xl font-bold tracking-tight">AWS TRIVIA</h1>
        <p className="text-xs text-text-muted">Pick a level, answer fast, learn as you go.</p>
      </div>

      {phase === "levels" && (
        <div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface p-6">
          <p className="text-center text-sm text-text-muted">Choose a difficulty.</p>
          {(["easy", "medium", "hard"] as Level[]).map((level) => (
            <button
              key={level}
              onClick={() => pickLevel(level)}
              className="rounded-md border-2 border-border px-4 py-3 text-center font-mono font-semibold transition hover:border-purple"
            >
              {LEVEL_LABELS[level]}
            </button>
          ))}
          {error && <p className="text-center text-sm text-orange">{error}</p>}
        </div>
      )}

      {phase === "loading" && <p className="text-sm text-text-muted">Loading...</p>}

      {(phase === "question" || phase === "reveal") && data && (
        <>
          <div className="mb-3 flex w-full items-center justify-between font-mono text-xs text-text-muted">
            <span>{LEVEL_LABELS[data.level]}</span>
            {phase === "question" && <span>{Math.ceil(liveRemainingMs / 1000)}s</span>}
          </div>

          {phase === "question" && (
            <div className="mb-4 h-2 w-full overflow-hidden rounded bg-surface-2">
              <div
                className="h-full bg-orange transition-all"
                style={{ width: `${(liveRemainingMs / data.durationMs) * 100}%` }}
              />
            </div>
          )}

          {data.icon && (
            <div className="mb-4">
              <AwsServiceIcon icon={data.icon} />
            </div>
          )}

          <p className="mb-5 text-center text-xl font-bold">{data.question}</p>

          <div className="flex w-full flex-col gap-3">
            {data.options.map((option, i) => {
              let variant = "border-border bg-surface hover:border-purple";
              if (phase === "reveal" && result) {
                if (i === result.correctIndex) {
                  variant = "border-purple bg-purple/10";
                } else if (i === selectedChoice) {
                  variant = "border-orange bg-orange/10";
                } else {
                  variant = "border-border bg-surface opacity-60";
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => phase === "question" && submitAnswer(i)}
                  disabled={phase !== "question"}
                  className={`rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors ${variant}`}
                >
                  {option}
                  {phase === "reveal" && i === result?.correctIndex && (
                    <span className="ml-2 font-mono text-xs text-purple-light">CORRECT</span>
                  )}
                </button>
              );
            })}
          </div>

          {phase === "reveal" && result && (
            <div className="mt-5 flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-surface p-4 text-center">
              <p className="font-mono text-lg font-bold">
                {result.correct ? "Correct!" : selectedChoice === null ? "Time's up." : "Not quite."}
              </p>
              <p className="text-sm text-text-muted">{result.explanation}</p>
              <button
                onClick={backToLevels}
                className="mt-2 w-full rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark"
              >
                Back to Levels
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
