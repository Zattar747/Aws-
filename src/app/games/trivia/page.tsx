"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import LoginGate from "@/components/LoginGate";

type Phase = "loading" | "blocked" | "question" | "reveal" | "done";

interface QuestionData {
  index: number;
  text: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  pointsEarned: number;
  totalScore: number;
  done: boolean;
  nextQuestion?: QuestionData;
  totalPoints?: number;
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function TriviaPage() {
  const { player, token, ready, refreshPlayer } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [liveRemainingMs, setLiveRemainingMs] = useState(0);
  const [durationMs, setDurationMs] = useState(10000);
  const [finalScore, setFinalScore] = useState(0);

  const questionStartRef = useRef(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await fetch("/api/trivia/new", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setBlockedMessage(data.error ?? "Could not start quiz.");
        setPhase("blocked");
        return;
      }
      setSessionId(data.sessionId);
      setTotalQuestions(data.totalQuestions);
      setDurationMs(data.durationMs);
      setQuestion(data.question);
      submittedRef.current = false;
      questionStartRef.current = Date.now();
      setLiveRemainingMs(data.durationMs);
      setPhase("question");
    })();
  }, [token]);

  useEffect(() => {
    if (phase !== "question" || !question) return;
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

  async function submitAnswer(choiceIndex: number | null) {
    if (!question || !sessionId || !token || submittedRef.current) return;
    submittedRef.current = true;
    setSelectedChoice(choiceIndex);
    try {
      const res = await fetch("/api/trivia/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, questionIndex: question.index, chosenIndex: choiceIndex }),
      });
      const data: AnswerResult & { error?: string } = await res.json();
      if (!res.ok) {
        submittedRef.current = false;
        setSelectedChoice(null);
        return;
      }
      setResult(data);
      setFinalScore(data.totalScore);
      setPhase("reveal");
      if (data.done) refreshPlayer();
    } catch {
      submittedRef.current = false;
      setSelectedChoice(null);
    }
  }

  function nextOrFinish() {
    if (!result) return;
    if (result.done || !result.nextQuestion) {
      setPhase("done");
      return;
    }
    setQuestion(result.nextQuestion);
    setSelectedChoice(null);
    setResult(null);
    submittedRef.current = false;
    questionStartRef.current = Date.now();
    setLiveRemainingMs(durationMs);
    setPhase("question");
  }

  if (!ready) return null;
  if (!player) return <LoginGate />;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-8">
      <div className="mb-6 w-full">
        <h1 className="font-mono text-2xl font-bold tracking-tight">AWS TRIVIA</h1>
        <p className="text-xs text-text-muted">
          {totalQuestions || "A handful of"} questions, one shot. Answer fast.
        </p>
      </div>

      {phase === "loading" && <p className="text-sm text-text-muted">Loading...</p>}

      {phase === "blocked" && (
        <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">{blockedMessage}</p>
          <Link
            href="/"
            className="mt-2 w-full rounded-md bg-purple px-4 py-2 text-center font-mono font-semibold text-white transition hover:bg-purple-dark"
          >
            Back to games
          </Link>
        </div>
      )}

      {(phase === "question" || phase === "reveal") && question && (
        <>
          <div className="mb-3 flex w-full items-center justify-between font-mono text-xs text-text-muted">
            <span>
              Q{question.index + 1} / {totalQuestions} &middot; {DIFFICULTY_LABEL[question.difficulty]}
            </span>
            {phase === "question" && <span>{Math.ceil(liveRemainingMs / 1000)}s</span>}
          </div>

          {phase === "question" && (
            <div className="mb-4 h-2 w-full overflow-hidden rounded bg-surface-2">
              <div
                className="h-full bg-orange transition-all"
                style={{ width: `${(liveRemainingMs / durationMs) * 100}%` }}
              />
            </div>
          )}

          <p className="mb-5 text-center text-xl font-bold">{question.text}</p>

          <div className="flex w-full flex-col gap-3">
            {question.options.map((option, i) => {
              let variant = "border-border bg-surface hover:border-purple";
              if (phase === "reveal" && result) {
                if (i === result.correctIndex) variant = "border-purple bg-purple/10";
                else if (i === selectedChoice) variant = "border-orange bg-orange/10";
                else variant = "border-border bg-surface opacity-60";
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
              <p className="font-mono text-sm text-orange">+{result.pointsEarned} points</p>
              <button
                onClick={nextOrFinish}
                className="mt-2 w-full rounded-md bg-purple px-4 py-2 font-mono font-semibold text-white transition hover:bg-purple-dark"
              >
                {result.done ? "See Results" : "Next Question"}
              </button>
            </div>
          )}
        </>
      )}

      {phase === "done" && (
        <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-mono text-lg font-bold">Quiz complete!</p>
          <p className="font-mono text-sm text-orange">{finalScore} points earned</p>
          <Link
            href="/"
            className="mt-2 w-full rounded-md bg-purple px-4 py-2 text-center font-mono font-semibold text-white transition hover:bg-purple-dark"
          >
            Back to games
          </Link>
        </div>
      )}
    </div>
  );
}
