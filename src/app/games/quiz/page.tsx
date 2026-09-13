"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ShapeIcon from "@/components/ShapeIcon";
import PlayerBadge from "@/components/PlayerBadge";
import { TILE_STYLES } from "@/lib/quiz-tiles";
import { getLastPlayerName, setLastPlayerName } from "@/lib/client-name";

type Phase = "name" | "playing" | "reveal" | "ended";

interface QuestionData {
  index: number;
  text: string;
  options: string[];
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  pointsEarned: number;
  totalScore: number;
  done: boolean;
  nextQuestion?: QuestionData;
  finalPointsAwarded?: number;
}

const TILE_TEXT_COLOR = ["white", "white", "#1a1200", "white"];
const REVEAL_PAUSE_MS = 2200;

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>("name");
  const [nameInput, setNameInput] = useState(() =>
    typeof window !== "undefined" ? getLastPlayerName() : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [durationMs, setDurationMs] = useState(15000);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [liveRemainingMs, setLiveRemainingMs] = useState(0);

  const questionStartRef = useRef(0);
  const submittedRef = useRef(false);
  const advanceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, durationMs - (Date.now() - questionStartRef.current));
      setLiveRemainingMs(remaining);
      if (remaining <= 0 && !submittedRef.current) {
        submitAnswer(null);
      }
    }, 150);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question?.index]);

  async function startQuiz() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError("Enter a name first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start quiz.");
        return;
      }
      setSessionId(data.sessionId);
      setDisplayName(data.player.displayName);
      setTotalPoints(data.player.totalPoints);
      setTotalQuestions(data.totalQuestions);
      setDurationMs(data.durationMs);
      setQuestion(data.question);
      setSelectedChoice(null);
      setResult(null);
      setLastPlayerName(trimmed);
      submittedRef.current = false;
      questionStartRef.current = Date.now();
      setLiveRemainingMs(data.durationMs);
      setPhase("playing");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(choiceIndex: number | null) {
    if (!sessionId || !question || submittedRef.current) return;
    submittedRef.current = true;
    setSelectedChoice(choiceIndex);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionIndex: question.index,
          choiceIndex: choiceIndex ?? undefined,
          timedOut: choiceIndex === null,
        }),
      });
      const data: AnswerResult & { error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit answer.");
        submittedRef.current = false;
        setSelectedChoice(null);
        return;
      }
      setResult(data);
      setPhase("reveal");
      advanceTimerRef.current = window.setTimeout(() => advance(data), REVEAL_PAUSE_MS);
    } catch {
      submittedRef.current = false;
      setSelectedChoice(null);
      setError("Could not submit answer. Check your connection and try again.");
    }
  }

  function advance(data: AnswerResult) {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (data.done || !data.nextQuestion) {
      setTotalPoints((prev) => prev + (data.finalPointsAwarded ?? 0));
      setPhase("ended");
      return;
    }
    setQuestion(data.nextQuestion);
    setSelectedChoice(null);
    setResult(null);
    submittedRef.current = false;
    questionStartRef.current = Date.now();
    setLiveRemainingMs(durationMs);
    setPhase("playing");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-8">
      <div className="mb-6 flex w-full items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">AWS TRIVIA</h1>
          <p className="text-xs text-text-muted">Answer fast for more points.</p>
        </div>
        <Link
          href="/games/quiz/leaderboard"
          className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-text-muted transition hover:border-purple hover:text-purple"
        >
          Leaderboard
        </Link>
      </div>

      {phase === "name" && (
        <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6">
          <p className="text-center text-sm text-text-muted">
            {totalQuestions || 10} quick questions about AWS. No prior knowledge needed.
          </p>
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startQuiz()}
            maxLength={30}
            placeholder="Your name"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-center font-mono text-text outline-none focus:border-purple"
          />
          {error && <p className="text-sm text-orange">{error}</p>}
          <button
            onClick={startQuiz}
            disabled={loading}
            className="w-full rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start Quiz"}
          </button>
        </div>
      )}

      {(phase === "playing" || phase === "reveal") && question && (
        <>
          <PlayerBadge displayName={displayName} totalPoints={totalPoints} />

          <div className="mb-2 flex w-full items-center justify-between font-mono text-xs text-text-muted">
            <span>
              Question {question.index + 1} / {totalQuestions}
            </span>
            {phase === "playing" && <span>{Math.ceil(liveRemainingMs / 1000)}s</span>}
          </div>

          {phase === "playing" && (
            <div className="mb-4 h-2 w-full overflow-hidden rounded bg-surface-2">
              <div
                className="h-full bg-orange transition-all"
                style={{ width: `${(liveRemainingMs / durationMs) * 100}%` }}
              />
            </div>
          )}

          <p className="mb-5 text-center text-xl font-bold">{question.text}</p>

          <div className="grid w-full grid-cols-2 gap-3">
            {question.options.map((option, i) => {
              const tile = TILE_STYLES[i];
              let opacity = 1;
              if (phase === "reveal") {
                opacity = i === result?.correctIndex || i === selectedChoice ? 1 : 0.35;
              }
              return (
                <button
                  key={i}
                  onClick={() => phase === "playing" && submitAnswer(i)}
                  disabled={phase !== "playing"}
                  className="flex items-center gap-3 rounded-lg px-4 py-5 text-left font-semibold transition"
                  style={{ backgroundColor: tile.color, color: TILE_TEXT_COLOR[i], opacity }}
                >
                  <ShapeIcon shape={tile.shape} />
                  <span>{option}</span>
                  {phase === "reveal" && i === result?.correctIndex && (
                    <span className="ml-auto font-mono text-xs">CORRECT</span>
                  )}
                </button>
              );
            })}
          </div>

          {phase === "reveal" && result && (
            <div className="mt-5 flex w-full flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center">
              <p className="font-mono text-lg font-bold">
                {result.correct ? "Correct!" : selectedChoice === null ? "Time's up." : "Not quite."}
              </p>
              <p className="font-mono text-sm text-orange">+{result.pointsEarned} points</p>
              <button
                onClick={() => advance(result)}
                className="mt-2 w-full rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark"
              >
                {result.done ? "See Results" : "Next Question"}
              </button>
            </div>
          )}
        </>
      )}

      {phase === "ended" && (
        <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-mono text-lg font-bold">Quiz complete</p>
          <p className="text-sm text-text-muted">
            {result?.totalScore ?? 0} points this round
          </p>
          <div className="mt-2 flex w-full gap-2">
            <button
              onClick={startQuiz}
              disabled={loading}
              className="flex-1 rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark disabled:opacity-50"
            >
              Play Again
            </button>
            <Link
              href="/games/quiz/leaderboard"
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
