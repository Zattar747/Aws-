import { NextRequest, NextResponse } from "next/server";
import { TRIVIA_QUESTIONS, QUESTION_DURATION_MS } from "@/lib/trivia-questions";
import { buildOptionOrder, getQuestionForDisplay, isTriviaLevel } from "@/lib/trivia-session";
import { getNextIndex } from "@/lib/rotation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const level = body?.level;

  if (!isTriviaLevel(level)) {
    return NextResponse.json({ error: "Invalid level." }, { status: 400 });
  }

  const questions = TRIVIA_QUESTIONS[level];
  const questionIndex = await getNextIndex(`trivia-${level}`, questions.length);
  const optionOrder = buildOptionOrder();
  const display = getQuestionForDisplay(level, questionIndex, optionOrder);

  return NextResponse.json({
    level,
    questionIndex,
    optionOrder,
    question: display.question,
    options: display.options,
    icon: display.icon ?? null,
    durationMs: QUESTION_DURATION_MS,
  });
}
