import { NextRequest, NextResponse } from "next/server";
import { TRIVIA_QUESTIONS } from "@/lib/trivia-questions";
import { getQuestionForDisplay, isTriviaLevel, isValidOptionOrder } from "@/lib/trivia-session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const level = body?.level;
  const questionIndex = body?.questionIndex;
  const optionOrder = body?.optionOrder;
  const chosenIndex = body?.chosenIndex; // number 0-3, or null/undefined if time ran out

  if (!isTriviaLevel(level)) {
    return NextResponse.json({ error: "Invalid level." }, { status: 400 });
  }
  const questions = TRIVIA_QUESTIONS[level];
  if (
    !Number.isInteger(questionIndex) ||
    questionIndex < 0 ||
    questionIndex >= questions.length
  ) {
    return NextResponse.json({ error: "Invalid question." }, { status: 400 });
  }
  if (!isValidOptionOrder(optionOrder)) {
    return NextResponse.json({ error: "Invalid option order." }, { status: 400 });
  }

  const display = getQuestionForDisplay(level, questionIndex, optionOrder);
  const correct =
    typeof chosenIndex === "number" && chosenIndex === display.correctDisplayIndex;

  return NextResponse.json({
    correct,
    correctIndex: display.correctDisplayIndex,
    explanation: display.explanation,
  });
}
